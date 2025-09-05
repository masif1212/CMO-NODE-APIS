import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { scrapeWebsiteCompetitors, fetchBrands } from "./scraper";
import { fetchCompetitorsFromLLM, extractCompetitorDataFromLLM, createComparisonPrompt } from "./llm";
import { parseCompetitorData } from "./parser";
import { getPageSpeedData, getWebsiteUrlById } from "../dashboard1/website_audit/service";
import OpenAI from "openai";
import "dotenv/config";
import { performance } from "perf_hooks";
import puppeteer from "puppeteer";
import { fetchSocialMediaData } from "./social_media_anaylsis";
import { SchemaMarkupStatus, SeoAudit, SeoAuditResponse, BrandProfile_logo } from "./seo_audit_interface";
import { isValidCompetitorUrl, processSeoAudits } from "./competitors_validation";
import { UserRequirement, ProcessedResult } from "./brandprofile_interface";
import { safeParse } from "../../utils/safeParse";
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const model = process.env.OPENAI_MODEL || "gpt-4.1";

const prisma = new PrismaClient();

interface PageSpeedData {
  categories: {
    performance: number | null;
    seo: number | null;
    accessibility: number | null;
    best_practices: number | null;
    pwa: number | null;
  };
  audits: {
    speed_index?: { display_value: string; score: number | null };
    first_contentful_paint?: { display_value: string; score: number | null };
    total_blocking_time?: { display_value: string; score: number | null };
    interactive?: { display_value: string; score: number | null };
    largest_contentful_paint?: { display_value: string; score: number | null };
    cumulative_layout_shift?: { display_value: string; score: number | null };
  };
  audit_details: {
    allAudits?: any;
    optimization_opportunities?: any;
    user_access_readiness?: any;
    seoAudits?: any[];
  };
  revenueLossPercent?: number | null;
}


interface CompetitorResult {
  competitor_id: string;
  brand_profile: BrandProfile_logo;
  website_audit: {
    performance_insights: {
      performance: number | null;
      seo: number | null;
      accessibility: number | null;
      best_practices: number | null;
    };
    website_health_matrix: {
      speed_index: { display_value: string; score: number | null };
      total_blocking_time: { display_value: string; score: number | null };
      first_contentful_paint: { display_value: string; score: number | null };
      largest_contentful_paint: { display_value: string; score: number | null };
      cumulative_layout_shift: { display_value: string; score: number | null };
    };
  };
  seo_audit: SeoAudit;
}
// Helper function to replace the p-limit package
function createLimiter(concurrency: number) {
  const queue: (() => void)[] = [];
  let activeCount = 0;

  function next() {
    if (activeCount < concurrency && queue.length > 0) {
      activeCount++;
      const task = queue.shift()!;
      task();
    }
  }

  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const task = async () => {
        try {
          const res = await fn();
          resolve(res);
        } catch (err) {
          reject(err);
        } finally {
          activeCount--;
          next();
        }
      };

      queue.push(task);
      if (activeCount < concurrency) {
        next();
      }
    });
  };
}
function normalizeSchemaStatus(url: string, schemaAnalysis: any): SchemaMarkupStatus {
  console.log("schemaAnalysis for", url, schemaAnalysis);

  const summary = schemaAnalysis?.schemas?.summary;

  if (!summary || (Array.isArray(summary) && summary.length === 0)) {
    return {
      url,
      message: "No structured data detected",
      schemas: { summary: [] },
    };
  }

  return {
    url,
    message: "Structured data detected",
    schemas: {
      summary: Array.isArray(summary)
        ? summary
        : [{ type: "Organization", format: "JSON-LD", isValid: true }],
    },
  };
}


export class CompetitorService {
  static async brandprofile(user_id: string, website_id: string, report_id: string): Promise<Record<string, any>> {
    const t0 = performance.now();
    console.log(`[brandprofile] Starting brand profile generation for report id=${report_id}`);

    if (!user_id || !website_id || !report_id) {
      throw new Error("user_id, report_id and website_id are required");
    }

    // --- Load website URL ---
    const website_url = await getWebsiteUrlById(user_id, website_id);
    if (!website_url) {
      throw new Error(`[brandprofile] No website URL found for website_id=${website_id}`);
    }
    console.log(`[brandprofile] Found main website URL: ${website_url}`);

    // --- Load report + scraped data ---
    const report = await prisma.report.findUnique({
      where: { report_id },
      select: { scraped_data_id: true },
    });
    console.log(`[brandprofile] Report scraped_data_id: ${report?.scraped_data_id}`);

    const [user, scrapedMain, userRequirementRaw] = await Promise.all([
      prisma.user_websites.findUnique({
        where: { website_id },
      }),
      prisma.website_scraped_data.findUnique({
        where: { scraped_data_id: report?.scraped_data_id ?? undefined },
      }),
      prisma.user_requirements.findFirst({ where: { website_id } }),
    ]);

    if (!scrapedMain) {
      throw new Error(`[brandprofile] No scraped data found for report_id=${report_id}`);
    }

    console.log(`[brandprofile] Loaded scraped main website data (id=${scrapedMain.scraped_data_id})`);

    const userRequirement: UserRequirement = {
      industry: userRequirementRaw?.industry ?? "Unknown",
      target_location: userRequirementRaw?.target_location ?? "unknown",
      primary_offering: userRequirementRaw?.primary_offering ?? "Unknown",
      brand_offering: userRequirementRaw?.primary_offering ?? "unknown",
      USP: userRequirementRaw?.USP ?? "Unknown",
      competitor_urls: Array.isArray(userRequirementRaw?.competitor_urls) ? userRequirementRaw.competitor_urls.filter((url): url is string => typeof url === "string") : [],
    };

    console.log(`[brandprofile] Parsed user requirements: ${JSON.stringify(userRequirement)}`);

    const MAX_COMPETITORS = 3;
    const competitorResults: ProcessedResult[] = [];
    const processedUrls = new Set<string>([website_url]);
    const processedNames = new Set<string>();
    let orderIndex = 0;

    let browser;
    const mode = process.env.MODE;
    try {
      // --- Puppeteer Launch ---
      const startLaunch = Date.now();
      console.log(`[brandprofile]  Puppeteer launch MODE: ${mode}`);

      if (mode === "production") {
        browser = await puppeteer.launch({
          executablePath: "/usr/bin/google-chrome-stable",
          headless: "new" as any,
          args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
        });
        console.log("[brandprofile] Launching Puppeteer in production (Cloud Run)...");
      } else if (mode === "development") {
        browser = await puppeteer.launch({
          headless: "new" as any,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
        console.log("[brandprofile]  Launching Puppeteer in development (local headless)...");
      } else {
        throw new Error(`Invalid MODE: ${mode}. Expected 'production' or 'development'.`);
      }

      const endLaunch = Date.now();
      console.log(`[brandprofile] Puppeteer browser launched in ${(endLaunch - startLaunch) / 1000}s`);

      // --- Process user-provided competitors ---
      for (const originalUrl of userRequirement.competitor_urls) {
        if (competitorResults.length >= MAX_COMPETITORS) break;

        let preferredUrl = originalUrl;
        let competitorData: any = null;
        let scraped: any = null;
        let name = originalUrl;

        try {
          let start = Date.now();

          const result = await isValidCompetitorUrl(originalUrl, undefined, browser);
          let end = Date.now();

          console.log(`[brandprofile]  Validation result for ${originalUrl}: ${JSON.stringify(result)} (took ${(end - start) / 1000}s)`);

          if (result.isValid && result.preferredUrl && !processedUrls.has(result.preferredUrl)) {
            preferredUrl = result.preferredUrl;
            start = Date.now();
            scraped = await scrapeWebsiteCompetitors(preferredUrl);
            end = Date.now();
            console.log(`[brandprofile] Scraped data for ${preferredUrl} (took ${(end - start) / 1000}s)`);
            start = Date.now();

            competitorData = await extractCompetitorDataFromLLM(scraped);
            end = Date.now();
            console.log(`[brandprofile] Extracted competitor data for ${preferredUrl} (took ${(end - start) / 1000}s)`);
          } else {
            start = Date.now();
            competitorData = await extractCompetitorDataFromLLM(scraped);
            end = Date.now();
            console.log(`[brandprofile] Fallback to competitor data extraction for ${originalUrl} (took ${(end - start) / 1000}s)`);
          }
          start = Date.now();
          name = competitorData?.name || scraped?.website_name || originalUrl;

          end = Date.now();
          console.log(`[brandprofile] Competitor name: ${name} (extracted in ${(end - start) / 1000}s)`);

          if (processedNames.has(name)) {
            console.log(`[brandprofile] Duplicate competitor skipped: ${name}`);
            continue;
          }

          start = Date.now();
          const competitor_id = uuidv4();
          competitorResults.push({
            competitor_id,
            brand_profile: {
              title: name,
              industry: competitorData?.industry || userRequirement.industry,
              unique_selling_point: competitorData?.usp || "No clear USP identified",
              primary_offering: competitorData?.primary_offering || userRequirement.primary_offering,
              logo_url: competitorData?.logo_url || scraped?.logo_url || null,
              website_url: preferredUrl,
            },
          });
          end = Date.now();
          console.log(`[brandprofile] Added competitor result for ${name} (${preferredUrl}) (took ${(end - start) / 1000}s)`);
          processedUrls.add(preferredUrl);
          processedNames.add(name);

          console.log(`[brandprofile] Processed competitor: ${name} (${preferredUrl})`);
        } catch (err) {
          console.error(`[brandprofile] Error processing competitor ${originalUrl}:`, err);
        }
      }

      // --- Fetch additional competitors from LLM if fewer than MAX_COMPETITORS ---
      while (competitorResults.length < MAX_COMPETITORS) {
        console.log(`[brandprofile] Fetching remaining competitors from LLM...`);

        let parsed: any[] = [];
        let attempts = 0;
        const maxRetries = 4;

        while (attempts < maxRetries && parsed.length === 0) {
          console.log(`[brandprofile] Attempt ${attempts + 1}/${maxRetries} to parse LLM competitors`);
          attempts++;
          try {
            let startn = Date.now();
            const aiResponse = await fetchCompetitorsFromLLM(scrapedMain, userRequirement, Array.from(processedUrls), Array.from(processedNames));
            let endn = Date.now();
            console.log(`[brandprofile] LLM competitors fetched in ${(endn - startn) / 1000}s`);
            startn = Date.now();
            parsed = parseCompetitorData(aiResponse) || [];
            endn = Date.now();
            console.log(`[brandprofile] LLM competitors parsed in ${(endn - startn) / 1000}s`);
            if (parsed.length === 0) {
              console.warn(`[brandprofile] LLM returned no competitors (attempt ${attempts})`);
            }
          } catch (err) {
            console.error(`[brandprofile] Error fetching competitors from LLM (attempt ${attempts}):`, err);
          }
        }

        if (parsed.length === 0) {
          console.warn(`[brandprofile] No valid competitors fetched after ${maxRetries} attempts`);
          break;
        }

        let start = Date.now();
        for (const comp of parsed) {
          if (competitorResults.length >= MAX_COMPETITORS) break;

          const name = comp.name || `Competitor ${competitorResults.length + 1}`;
          const url = comp.website_url;
          if (!url || processedUrls.has(url) || processedNames.has(name)) continue;
          let end = Date.now();
          console.log(`[brandprofile] Processing LLM competitor: ${name} (${url}) (took ${(end - start) / 1000}s)`);
          try {
            start = Date.now();
            const { isValid, preferredUrl } = await isValidCompetitorUrl(url, undefined, browser);
            end = Date.now();
            console.log(`[brandprofile] Validation result for: ${name} (${url}) (took ${(end - start) / 1000}s)`);
            if (!isValid || !preferredUrl) continue;

            competitorResults.push({
              competitor_id: uuidv4(),
              brand_profile: {
                title: name,
                industry: comp.industry || userRequirement.industry,
                unique_selling_point: comp.usp || "No clear USP identified",
                primary_offering: comp.primary_offering || userRequirement.primary_offering,
                logo_url: null,
                website_url: preferredUrl,
              },
            });

            processedUrls.add(preferredUrl);
            processedNames.add(name);

            console.log(`[brandprofile] Processed LLM competitor: ${name} (${preferredUrl})`);
          } catch (err) {
            console.error(`[brandprofile] Error processing LLM competitor ${url}:`, err);
          }
        }

        if (competitorResults.length < MAX_COMPETITORS) {
          console.log(`[brandprofile] Still need ${MAX_COMPETITORS - competitorResults.length} competitors, retrying...`);
        }
      }

      // --- Save competitors to database only if we have 3 competitors ---
      if (competitorResults.length === MAX_COMPETITORS) {
        console.log(`[brandprofile] Saving ${competitorResults.length} competitors to database...`);
        for (const result of competitorResults) {
          const start = Date.now();
          await prisma.competitor_details.create({
            data: {
              website_url,
              competitor_id: result.competitor_id,
              website_id,
              report_id,
              name: result.brand_profile.title,
              competitor_website_url: result.brand_profile.website_url,
              industry: result.brand_profile.industry,
              primary_offering: result.brand_profile.primary_offering,
              usp: result.brand_profile.unique_selling_point,
              order_index: orderIndex++,
            },
          });
          const end = Date.now();
          console.log(`[brandprofile] Saved competitor ${result.brand_profile.title} (${result.brand_profile.website_url}) to database (took ${(end - start) / 1000}s)`);
        }
      } else {
        console.warn(`[brandprofile] Not enough competitors (${competitorResults.length}/${MAX_COMPETITORS}), skipping database save`);
      }
    } finally {
      if (browser) {
        await browser.close();
        console.log(`[brandprofile] Browser closed`);
      }
    }

    const t1 = performance.now();
    console.log(`[brandprofile] Finished brandprofile in ${(t1 - t0).toFixed(2)}ms`);

    return {
      mainWebsite: {
        brand_profile: {
          website_name: user?.website_name,
          title: user?.website_name,
          industry: userRequirement.industry,
          unique_selling_point: userRequirement.USP,
          primary_offering: userRequirement.primary_offering,
          logo_url: scrapedMain.logo_url || null,
          website_url,
          is_valid: true,
        },
      },
      competitors: competitorResults.slice(0, MAX_COMPETITORS),
    };
  }

static async seo_audit(user_id: string, website_id: string, report_id: string): Promise<SeoAuditResponse> {
    const response: SeoAuditResponse = {
      mainWebsite: {
        brand_profile: {
          website_url: null,
          logo_url: null,
          ctr_loss_percent: null,
        },
        seo_audit: {} as SeoAudit,
      },
      competitors: [],
    };
    if (!website_id || !user_id) {
      throw new Error("website_id and user_id are required");
    }

    console.log(`Fetching SEO audit data for user_id ${user_id}, website_id: ${website_id}`);
    const main_website_url = await getWebsiteUrlById(user_id, website_id);
    if (!main_website_url) {
      throw new Error(`No website URL found for user_id: ${user_id} and website_id: ${website_id}`);
    }
    const report = await prisma.report.findUnique({
      where: { report_id: report_id }, // You must have 'report_id' from req.body
      select: { scraped_data_id: true, geo_llm: true },
    });
    const [main_website_scrapeddata] = await Promise.all([
      prisma.website_scraped_data.findUnique({
        where: { scraped_data_id: report?.scraped_data_id ?? undefined },
        select: {
          meta_description: true,
          page_title: true,
          website_name: true,
          homepage_alt_text_coverage: true,
          schema_analysis: true,
          isCrawlable: true,
          headingAnalysis: true,
          logo_url: true,
          ctr_loss_percent: true,
          H1_text: true,
        },
      }),
    ]);

    let AI_Discoverability: any;
    if (!report?.geo_llm === null) {
      console.log("No geo_llm response found");
      AI_Discoverability = await fetchBrands(user_id, website_id, report_id);
      console.log("geo_llm response fetched:", AI_Discoverability);
      await prisma.report.upsert({
        where: { report_id: report_id },
        update: { geo_llm: AI_Discoverability },
        create: { report_id, website_id, geo_llm: AI_Discoverability },
      });
    } else {
      AI_Discoverability = report?.geo_llm;
      console.log("geo_llm found");
    }

    if (main_website_scrapeddata) {
      const main_h1_heading = main_website_scrapeddata.H1_text;

      
      const main_schema_markup_status = normalizeSchemaStatus(
  main_website_url,
  safeParse(main_website_scrapeddata.schema_analysis)
);

      response.mainWebsite = {
        brand_profile: {
          website_url: main_website_url,

          logo_url: main_website_scrapeddata.logo_url || null,
          ctr_loss_percent: typeof main_website_scrapeddata.ctr_loss_percent === "string" ? JSON.parse(main_website_scrapeddata.ctr_loss_percent) : main_website_scrapeddata.ctr_loss_percent || null,
        },
        seo_audit: {
          h1_heading: main_h1_heading,
          page_title:main_website_scrapeddata.page_title,
          website_name: main_website_scrapeddata.website_name,
          meta_title: main_website_scrapeddata.page_title || null,
          meta_description: main_website_scrapeddata.meta_description || null,
          alt_text_coverage: main_website_scrapeddata.homepage_alt_text_coverage,
          isCrawlable: main_website_scrapeddata.isCrawlable || false,
          headingAnalysis: main_website_scrapeddata.headingAnalysis as SeoAudit["headingAnalysis"],
          schema_markup_status: main_schema_markup_status,
          AI_Discoverability,
        },
      };
    } else {
      console.warn(`No scraped data found for main website_id: ${website_id}`);
      response.mainWebsite = {
        brand_profile: { website_url: null, logo_url: null, ctr_loss_percent: null },

        seo_audit: {
          h1_heading: null,
          page_title:null,
          meta_title: null,
          website_name: null,
          meta_description: null,
          alt_text_coverage: null,
          isCrawlable: false,
          headingAnalysis: null,
          schema_markup_status: null,
          AI_Discoverability: "false",
        },
      };
    }

    // Fetch competitors sorted by order_index
    const competitors = await prisma.competitor_details.findMany({
      where: { report_id },
      select: { competitor_id: true, name: true, competitor_website_url: true },
      orderBy: { order_index: "asc" },
      take: 7,
    });

    if (!competitors || competitors.length === 0) {
      console.warn(`No competitors found for website_id: ${website_id}`);
      return response;
    }

    const processedNames = new Set<string>();
    let competitorIndex = 1;

    for (const competitor of competitors) {
      const { competitor_id, name, competitor_website_url } = competitor;
      if (!competitor_website_url || !name || processedNames.has(name)) {
        console.log(`Skipping competitor ${competitor_id} due to missing URL or duplicate name: ${name}`);
        continue;
      }

      try {
        console.log(`Scraping competitor URL: ${competitor_website_url}`);
        const scraped = await scrapeWebsiteCompetitors(competitor_website_url);
        if (typeof scraped === "string") {
          throw new Error(`Scrape failed for ${competitor_website_url}: ${scraped}`);
        }

        const h1_heading = scraped.H1_text;
        // const schema_markup_status: SchemaMarkupStatus = {
        //   url: competitor_website_url,
        //   message: scraped.schema_analysis ? "Structured data detected" : "No structured data detected",
        //   schemas: {
        //     summary: scraped.schema_analysis ? [{ type: "Organization", format: "JSON-LD", isValid: true }] : [],
        //     // details: scraped.schema_analysis ? { Organization: [{ type: "Organization", format: "JSON-LD", isValid: true }] } : {},
        //   },

        const schema_markup_status = normalizeSchemaStatus(
          competitor_website_url,
          safeParse(scraped.schema_analysis)
        );
                
        
        const seo_audit: SeoAudit = {
          h1_heading: h1_heading || null,
          page_title:scraped.page_title,

          website_name: scraped.website_name || null,
          meta_title: scraped.page_title || null,
          meta_description: scraped.meta_description || null,
          alt_text_coverage: scraped.homepage_alt_text_coverage,
          isCrawlable: scraped.isCrawlable || false,
          headingAnalysis: scraped.headingAnalysis || null,
          schema_markup_status,
          AI_Discoverability: "true",
        };

        const brand_profile: BrandProfile_logo = {
          website_url: scraped.website_url || competitor_website_url,
          logo_url: scraped.logo_url || null,
          ctr_loss_percent: scraped.ctr_loss_percent || null,
        };

        await prisma.competitor_details.upsert({
          where: { competitor_id },
          update: {
            ...scraped,
            schema_analysis: scraped.schema_analysis && typeof scraped.schema_analysis === "object" ? JSON.stringify(scraped.schema_analysis) : scraped.schema_analysis,
            updated_at: new Date(),
            website_url: scraped.website_url || competitor_website_url,
          },
          create: {
            competitor_id,
            website_id,
            report_id,
            ...scraped,
            schema_analysis: scraped.schema_analysis && typeof scraped.schema_analysis === "object" ? JSON.stringify(scraped.schema_analysis) : scraped.schema_analysis,
            website_url: scraped.website_url || competitor_website_url,
          },
        });

        // response.competitors[`competitor${competitorIndex}`] = { seo_audit, brand_profile };
        response.competitors.push({
          competitor_id,
          brand_profile,
          seo_audit,
        });

        competitorIndex++;
        processedNames.add(name);
        console.log(`Successfully added competitor: ${name} (${competitor_website_url})`);
      } catch (err) {
        console.error(`Failed processing competitor ${competitor_website_url}: ${err instanceof Error ? err.message : err}`);
      }
    }

    console.log(`Successfully processed ${Object.keys(response.competitors).length - 1} competitors`);
    return response;
  }

static async website_audit(user_id: string, website_id: string, report_id: string) {
  if (!website_id || !user_id || !report_id) {
    throw new Error("website_id, report_id, and user_id are required");
  }

  console.log(`competitors website_audit - Fetching website URL for user_id ${user_id}, website_id: ${website_id}`);
  const website_url = await getWebsiteUrlById(user_id, website_id);
  if (!website_url) {
    throw new Error(`No website URL found for user_id: ${user_id} and website_id: ${website_id}`);
  }
  const report = await prisma.report.findUnique({
    where: { report_id: report_id },
    select: { scraped_data_id: true },
  });
  const [user, userRequirements, websiteScraped, mainPageSpeedData, geo_llm] = await Promise.all([
    prisma.user_websites.findUnique({ where: { website_id } }),
    prisma.user_requirements.findFirst({ where: { website_id } }),
    prisma.website_scraped_data.findUnique({ where: { scraped_data_id: report?.scraped_data_id ?? undefined } }),
    getPageSpeedData(website_url),
    prisma.report.findUnique({
      where: { report_id },
      select: {
        geo_llm: true,
      },
    }),
  ]);

  if (mainPageSpeedData && isValidPageSpeedData(mainPageSpeedData)) {
    const audits = mainPageSpeedData.audits || {};
    const getAuditValue = (id: string): string | null => {
      const audit = (audits as Record<string, { display_value?: string }>)[id];
      return audit?.display_value ?? null;
    };
  }

  const competitors = await prisma.competitor_details.findMany({
    where: { report_id },
    orderBy: { order_index: "asc" },
    take: 7,
  });

  console.log(
    `competitors website_audit - Fetched ${competitors.length} competitors for website_id: ${website_id}, URLs: ${competitors
      .map((c) => c.competitor_website_url)
      .filter(Boolean)
      .join(", ")}`
  );

  const competitorDataMap = new Map(competitors.map((item) => [item.competitor_id, item]));
  const competitorResults: CompetitorResult[] = [];
  const processedUrls = new Set<string>([website_url]);

  const limit = createLimiter(7);
  const competitorTasks = competitors.map((competitor) =>
    limit(async () => {
      const { competitor_id, name, competitor_website_url, usp, primary_offering, industry } = competitor;
      if (!competitor_website_url || processedUrls.has(competitor_website_url)) {
        console.log(`Skipping competitor ${competitor_id} due to missing or duplicate URL: ${competitor_website_url}`);
        return;
      }
      processedUrls.add(competitor_website_url);

      try {
        console.log(`Fetching PageSpeed data for ${competitor_website_url}`);
        const pageSpeedData = await getPageSpeedData(competitor_website_url);

        if (!pageSpeedData || !isValidPageSpeedData(pageSpeedData)) {
          throw new Error("Site is taking too long to respond");
        }

        await prisma.competitor_details.update({
          where: { competitor_id },
          data: {
            page_speed: JSON.parse(JSON.stringify(pageSpeedData)),
            revenue_loss_percent: pageSpeedData.revenueLossPercent,
          },
        });

        const { categories, audits, audit_details, revenueLossPercent } = pageSpeedData;
        const h1_heading = competitorDataMap.get(competitor_id)?.H1_text ?? null;

        competitorResults.push({
          competitor_id,
          brand_profile: {
            website_name: competitorDataMap.get(competitor_id)?.website_name ?? "",
            title: name ?? "",
            website_url: competitor_website_url,
            revenueLossPercent: revenueLossPercent || null,
            industry: industry || null,
            logo_url: competitorDataMap.get(competitor_id)?.logo_url ?? null,
            primary_offering: primary_offering || null,
            unique_selling_point: usp || null,
            ctr_loss_percent: competitorDataMap.get(competitor_id)?.ctr_loss_percent ?? null,
          },
          website_audit: {
            performance_insights: {
              performance: categories.performance || null,
              seo: categories.seo || null,
              accessibility: categories.accessibility || null,
              best_practices: categories.best_practices || null,
            },
            website_health_matrix: {
              speed_index: {
                display_value: audits?.speed_index?.display_value || "N/A",
                score: audits?.speed_index?.score || null,
              },
              total_blocking_time: {
                display_value: audits?.total_blocking_time?.display_value || "N/A",
                score: audits?.total_blocking_time?.score || null,
              },
              first_contentful_paint: {
                display_value: audits?.first_contentful_paint?.display_value || "N/A",
                score: audits?.first_contentful_paint?.score || null,
              },
              largest_contentful_paint: {
                display_value: audits?.largest_contentful_paint?.display_value || "N/A",
                score: audits?.largest_contentful_paint?.score || null,
              },
              cumulative_layout_shift: {
                display_value: audits?.cumulative_layout_shift?.display_value || "N/A",
                score: audits?.cumulative_layout_shift?.score || null,
              },
            },
          },
          seo_audit: {
            website_name: competitorDataMap.get(competitor_id)?.website_name ?? "",
            brandAuditseo: Array.isArray(audit_details?.seoAudits) ? processSeoAudits(audit_details.seoAudits) : null,
            meta_title:competitorDataMap.get(competitor_id)?.page_title ?? null,
            // brandAuditseo: Array.isArray(audit_details?.seoAudits) ? processSeoAudits(audit_details.seoAudits) : null,
            meta_description: competitorDataMap.get(competitor_id)?.meta_description ?? null,
            page_title: competitorDataMap.get(competitor_id)?.page_title ?? null,
            meta_keywords: competitorDataMap.get(competitor_id)?.meta_keywords ?? null,
            schema_markup_status: normalizeSchemaStatus(
              competitor_website_url,
              safeParse(competitorDataMap.get(competitor_id)?.schema_analysis)
            ) ?? null,
            isCrawlable: competitorDataMap.get(competitor_id)?.isCrawlable ?? null,
            headingAnalysis: competitorDataMap.get(competitor_id)?.headingAnalysis ?? null,
            alt_text_coverage: competitorDataMap.get(competitor_id)?.homepage_alt_text_coverage ?? null,
            h1_heading: h1_heading || null,
            AI_Discoverability: "True",
          },
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);

        competitorResults.push({
          competitor_id,
          brand_profile: {
            website_name: competitorDataMap.get(competitor_id)?.website_name ?? "",
            title: competitorDataMap.get(competitor_id)?.page_title ?? "",
            website_url: competitor_website_url,
            revenueLossPercent: null,
            logo_url: competitorDataMap.get(competitor_id)?.logo_url ?? null,
            primary_offering: primary_offering || null,
            unique_selling_point: usp || null,
            ctr_loss_percent: competitorDataMap.get(competitor_id)?.ctr_loss_percent ?? null,
          },
          website_audit: {
            performance_insights: {
              performance: null,
              seo: null,
              accessibility: null,
              best_practices: null,
            },
            website_health_matrix: {
              speed_index: { display_value: "n/a", score: null },
              total_blocking_time: { display_value: "n/a", score: null },
              first_contentful_paint: { display_value: "n/a", score: null },
              largest_contentful_paint: { display_value: "n/a", score: null },
              cumulative_layout_shift: { display_value: "n/a", score: null },
            },
          },
          seo_audit: {
            meta_title:competitorDataMap.get(competitor_id)?.page_title ?? "",
            brandAuditseo: null,
            website_name: competitorDataMap.get(competitor_id)?.website_name ?? "",
            meta_description: competitorDataMap.get(competitor_id)?.meta_description ?? null,
            page_title: competitorDataMap.get(competitor_id)?.page_title ?? null,
            meta_keywords: competitorDataMap.get(competitor_id)?.meta_keywords ?? null,
            schema_markup_status: normalizeSchemaStatus(
              competitor_website_url,
              safeParse(competitorDataMap.get(competitor_id)?.schema_analysis)
            ) ?? null,
            isCrawlable: competitorDataMap.get(competitor_id)?.isCrawlable ?? null,
            headingAnalysis: competitorDataMap.get(competitor_id)?.headingAnalysis ?? null,
            alt_text_coverage: competitorDataMap.get(competitor_id)?.homepage_alt_text_coverage ?? null,
            h1_heading: competitorDataMap.get(competitor_id)?.H1_text ?? null,
            AI_Discoverability: "True",
          },
        });

        console.warn(`Fallback for ${competitor_website_url}: ${errorMsg}`);
      }
    })
  );

  await Promise.all(competitorTasks);
  let preferredUrls: string[] = [];

  try {
    const rawUrls = userRequirements?.competitor_urls;
    if (Array.isArray(rawUrls)) {
      preferredUrls = rawUrls.map((url) => String(url).trim().toLowerCase());
    } else if (typeof rawUrls === "string") {
      const parsed = JSON.parse(rawUrls);
      if (Array.isArray(parsed)) {
        preferredUrls = parsed.map((url) => String(url).trim().toLowerCase());
      }
    }
  } catch (e) {
    console.warn("[website_audit] Failed to parse competitor_urls:", e);
  }

  const sortedCompetitorResults = competitorResults.sort((a, b) => {
    const aIndex = preferredUrls.indexOf(a.brand_profile.website_url?.toLowerCase() ?? "");
    const bIndex = preferredUrls.indexOf(b.brand_profile.website_url?.toLowerCase() ?? "");
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  const dashboarddata: Record<string, any> = {
    mainWebsite:
      mainPageSpeedData && isValidPageSpeedData(mainPageSpeedData)
        ? {
            brand_profile: {
              website_name: websiteScraped?.website_name,
              title: user?.website_name,
              website_url: website_url,
              revenueLossPercent: mainPageSpeedData.revenueLossPercent || null,
              industry: userRequirements?.industry || null,
              unique_selling_point: userRequirements?.USP || null,
              primary_offering: userRequirements?.primary_offering || null,
              logo_url: websiteScraped?.logo_url || null,
              ctr_loss_percent: websiteScraped?.ctr_loss_percent || null,
            },
            website_audit: {
              performance_insights: {
                performance: mainPageSpeedData.categories.performance || null,
                seo: mainPageSpeedData.categories.seo || null,
                accessibility: mainPageSpeedData.categories.accessibility || null,
                best_practices: mainPageSpeedData.categories.best_practices || null,
              },
              website_health_matrix: {
                speed_index: {
                  display_value: mainPageSpeedData.audits?.speed_index?.display_value || "N/A",
                  score: mainPageSpeedData.audits?.speed_index?.score || null,
                },
                total_blocking_time: {
                  display_value: mainPageSpeedData.audits?.total_blocking_time?.display_value || "N/A",
                  score: mainPageSpeedData.audits?.total_blocking_time?.score || null,
                },
                first_contentful_paint: {
                  display_value: mainPageSpeedData.audits?.first_contentful_paint?.display_value || "N/A",
                  score: mainPageSpeedData.audits?.first_contentful_paint?.score || null,
                },
                largest_contentful_paint: {
                  display_value: mainPageSpeedData.audits?.largest_contentful_paint?.display_value || "N/A",
                  score: mainPageSpeedData.audits?.largest_contentful_paint?.score || null,
                },
                cumulative_layout_shift: {
                  display_value: mainPageSpeedData.audits?.cumulative_layout_shift?.display_value || "N/A",
                  score: mainPageSpeedData.audits?.cumulative_layout_shift?.score || null,
                },
              },
            },
            seo_audit: {
              brandAuditseo: Array.isArray(mainPageSpeedData.audit_details?.seoAudits) ? processSeoAudits(mainPageSpeedData.audit_details.seoAudits) : null,
              meta_description: websiteScraped?.meta_description || null,
              website_name: websiteScraped?.website_name || null,
              page_title: websiteScraped?.page_title || null,
              schema_markup_status: normalizeSchemaStatus(
                website_url,
                safeParse(websiteScraped?.schema_analysis)
              ) || null,
              isCrawlable: websiteScraped?.isCrawlable || null,
              headingAnalysis: websiteScraped?.headingAnalysis || null,
              alt_text_coverage: websiteScraped?.homepage_alt_text_coverage || null,
              h1_heading: websiteScraped?.H1_text || null,
              AI_Discoverability: geo_llm?.geo_llm || "False",
            },
          }
        : null,
    competitors: sortedCompetitorResults,
  };

  const dataForLLM = {
    mainWebsite: dashboarddata.mainWebsite
      ? {
          ...dashboarddata.mainWebsite,
          seo_audit: {
            website_name: dashboarddata.mainWebsite.seo_audit.website_name,
            meta_description: dashboarddata.mainWebsite.seo_audit.meta_description,
            page_title: dashboarddata.mainWebsite.seo_audit.page_title,
            schema_markup_status: dashboarddata.mainWebsite.seo_audit.schema_markup_status,
            isCrawlable: dashboarddata.mainWebsite.seo_audit.isCrawlable,
            headingAnalysis: dashboarddata.mainWebsite.seo_audit.headingAnalysis,
            alt_text_coverage: dashboarddata.mainWebsite.seo_audit.alt_text_coverage,
            h1_heading: dashboarddata.mainWebsite.seo_audit.h1_heading,
            AI_Discoverability: dashboarddata.mainWebsite.seo_audit.AI_Discoverability,
          },
        }
      : null,
    competitors: Array.isArray(dashboarddata.competitors)
      ? dashboarddata.competitors.map((competitor: any) => ({
          ...competitor,
          seo_audit: competitor.seo_audit
            ? {
                website_name: competitor.seo_audit.website_name,
                meta_description: competitor.seo_audit.meta_description,
                page_title: competitor.seo_audit.page_title,
                schema_markup_status: competitor.seo_audit.schema_markup_status,
                isCrawlable: competitor.seo_audit.isCrawlable,
                headingAnalysis: competitor.seo_audit.headingAnalysis,
                alt_text_coverage: competitor.seo_audit.alt_text_coverage,
                h1_heading: competitor.seo_audit.h1_heading,
                AI_Discoverability: competitor.seo_audit.AI_Discoverability,
              }
            : null,
        }))
      : [],
  };

  const combinedResults = {
    dashboardData: dashboarddata,
    llmData: dataForLLM,
  };

  await prisma.report.upsert({
    where: {
      report_id,
    },
    update: {
      dashboard3_data: JSON.stringify(combinedResults),
    },
    create: {
      report_id,
      website_id,
      dashboard3_data: JSON.stringify(combinedResults),
    },
  });

  return dashboarddata;
}

  static async social_media(user_id: string, website_id: string, report_id: string) {
    if (!website_id || !user_id || !report_id) {
      throw new Error("website_id, report_id, and user_id are required");
    }

    console.log(`Fetching website URL for user_id ${user_id}, website_id: ${website_id}`);
    const website_url = await getWebsiteUrlById(user_id, website_id);
    if (!website_url) {
      throw new Error(`No website URL found for user_id: ${user_id} and website_id: ${website_id}`);
    }

    const report = await prisma.report.findUnique({
      where: { report_id },
      select: { scraped_data_id: true },
    });

    const websiteScraped = await prisma.website_scraped_data.findUnique({
      where: { scraped_data_id: report?.scraped_data_id ?? undefined },
      select: {
        facebook_handle: true,
        instagram_handle: true,
        youtube_handle: true,
        linkedin_handle: true,
      },
    });
    console.log("main_website handles", websiteScraped);
    const main_website = await fetchSocialMediaData(websiteScraped?.facebook_handle, websiteScraped?.instagram_handle, websiteScraped?.youtube_handle, websiteScraped?.linkedin_handle, website_url);

    const competitors = await prisma.competitor_details.findMany({
      where: { report_id },
      orderBy: { order_index: "asc" },
      take: 7,
    });

    console.log(`Fetched ${competitors.length} competitors.`);

    const processedUrls = new Set<string>([website_url]);
    const limit = createLimiter(7);

    const competitorResults = await Promise.all(
      competitors.map((competitor) =>
        limit(async () => {
          const { competitor_id, facebook_handle, instagram_handle, youtube_handle, linkedin_handle, competitor_website_url } = competitor;

          if (!competitor_website_url || processedUrls.has(competitor_website_url)) {
            console.log(`Skipping competitor ${competitor_id} due to duplicate URL.`);
            return { competitor_id, social_media: null };
          }

          processedUrls.add(competitor_website_url);

          try {
            const social_media = await fetchSocialMediaData(facebook_handle, instagram_handle, youtube_handle, linkedin_handle, competitor_website_url);

            await prisma.competitor_details.update({
              where: { competitor_id },
              data: {
                social_media_data: social_media,
              },
            });

            return { competitor_id, social_media };
          } catch (error) {
            console.error(`Error fetching social data for ${competitor_id}`, error);
            return { competitor_id, social_media: null };
          }
        })
      )
    );

    // Convert array to ID-based object
    const competitorsData: Record<string, any> = {};
    for (const item of competitorResults) {
      if (item?.competitor_id) {
        competitorsData[item.competitor_id] = item.social_media;
      }
    }

    const competitor_social_media_data = {
      main_website,
      competitors: competitorsData,
    };

    await prisma.report.upsert({
      where: { report_id },
      update: { dashboard3_socialmedia: competitor_social_media_data },
      create: { website_id, report_id, dashboard3_socialmedia: competitor_social_media_data },
    });

    return { competitor_social_media_data };
  }

  static async getComparisonRecommendations(website_id: string, report_id: string) {
    if (!report_id) {
      throw new Error("website_id is required");
    }

    console.log(`Fetching comparison recommendations for website_id: ${report_id}`);

    const prompt = await createComparisonPrompt(report_id);
    if (!prompt) {
      throw new Error("Failed to generate prompt for LLM");
    }

    const response = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: model,
      temperature: 0.7,
      max_tokens: 3000,
    });

    const responseraw = response.choices?.[0]?.message?.content || "{}";
    const raw = responseraw.trim().replace(/^```json\s*|```$/g, "");

    let parsed;
    try {
      parsed = typeof raw === "string" ? JSON.parse(raw) : raw;

      await prisma.report.upsert({
        where: { report_id },
        update: { recommendationbymo3: JSON.stringify(parsed) },
        create: { website_id, report_id, recommendationbymo3: JSON.stringify(parsed) },
      });
      console.log("LLM response saved successfully for report_id:", report_id);
    } catch (err) {
      console.error("Error parsing JSON response:", err);
      parsed = { recommendations: [] };
    }

    return parsed;
  }
}

function isValidPageSpeedData(data: any): data is PageSpeedData {
  return typeof data === "object" && data !== null && "categories" in data && typeof data.categories === "object" && "audits" in data && typeof data.audits === "object" && "audit_details" in data && typeof data.audit_details === "object";
}
