import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { scrapeWebsiteCompetitors, fetchBrands } from "./scraper";
import { fetchCompetitorsFromLLM, extractCompetitorDataFromLLM, createComparisonPrompt } from "./llm";
import { parseCompetitorData } from "./parser";
import { getPageSpeedData ,getWebsiteUrlById} from "../dashboard1/website_audit/service";
import OpenAI from "openai";
import "dotenv/config";
import * as cheerio from "cheerio";
import { performance } from "perf_hooks";
import puppeteer from "puppeteer";
import {fetchSocialMediaData} from "./social_media_anaylsis"
import { SchemaMarkupStatus, SeoAudit, SeoAuditResponse, BrandProfile_logo } from "./seo_audit_interface";
import { isValidCompetitorUrl, processSeoAudits } from "./competitors_validation";
import { UserRequirement, ProcessedResult} from "./brandprofile_interface";
import { unknown } from "zod";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const model = process.env.OPENAI_MODEL || "gpt-4.1";
    const mode = process.env.MODE;

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

function safeParse(jsonStr: any) {
  try {
    return typeof jsonStr === "string" ? JSON.parse(jsonStr) : jsonStr;
  } catch (e) {
    console.error("JSON parse failed:", e);
    return jsonStr;
  }
}



export class CompetitorService {
  static async brandprofile(
  user_id: string,
  website_id: string,
  report_id: string
): Promise<Record<string, any>> {
  const t0 = performance.now();
  console.log(`[brandprofile] 🚀 Starting brand profile generation for report id=${report_id}`);

  if (!user_id || !website_id || !report_id) {
    throw new Error("user_id, report_id and website_id are required");
  }

  // --- Load website URL ---
  const website_url = await getWebsiteUrlById(user_id, website_id);
  if (!website_url) {
    throw new Error(`[brandprofile] No website URL found for website_id=${website_id}`);
  }
  console.log(`[brandprofile]  Found main website URL: ${website_url}`);

  // --- Load report + scraped data ---
  const report = await prisma.report.findUnique({
    where: { report_id },
    select: { scraped_data_id: true },
  });
  console.log(`[brandprofile]  Report scraped_data_id: ${report?.scraped_data_id}`);

  const [scrapedMain, userRequirementRaw] = await Promise.all([
    prisma.website_scraped_data.findUnique({
      where: { scraped_data_id: report?.scraped_data_id ?? undefined },
    }),
    prisma.user_requirements.findFirst({ where: { website_id } }),
  ]);

  if (!scrapedMain) {
    throw new Error(`[brandprofile] No scraped data found for report_id=${report_id}`);
  }

  console.log(
    `[brandprofile]  Loaded scraped main website data (id=${scrapedMain.scraped_data_id})`
  );

  const userRequirement: UserRequirement = {
    industry: userRequirementRaw?.industry ?? "Unknown",
    target_location:userRequirementRaw?.target_location?? "unknown",
    primary_offering: userRequirementRaw?.primary_offering ?? "Unknown",
    brand_offering:userRequirementRaw?.primary_offering ?? "unknown",
    USP: userRequirementRaw?.USP ?? "Unknown",
    competitor_urls: Array.isArray(userRequirementRaw?.competitor_urls)
      ? userRequirementRaw.competitor_urls.filter(
          (url): url is string => typeof url === "string"
        )
      : [],
  };

  console.log(`[brandprofile]  Parsed user requirements: ${JSON.stringify(userRequirement)}`);

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
    console.log(`[brandprofile] ⚙️ Puppeteer launch MODE: ${mode}`);

    if (mode === "production") {
      browser = await puppeteer.launch({
        executablePath: "/usr/bin/google-chrome-stable",
        headless: "new" as any,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
      });
      console.log("[brandprofile]  Launching Puppeteer in production (Cloud Run)...");
    } else if (mode === "development") {
      browser = await puppeteer.launch({
        headless: "new" as any,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      console.log("[brandprofile] 💻 Launching Puppeteer in development (local headless)...");
    } else {
      throw new Error(`Invalid MODE: ${mode}. Expected 'production' or 'development'.`);
    }

    const endLaunch = Date.now();
    console.log(
      `[brandprofile]  Puppeteer browser launched in ${(endLaunch - startLaunch) / 1000}s`
    );

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

        console.log(
          `[brandprofile] 🔍 Validation result for ${originalUrl}: ${JSON.stringify(
            result
          )} (took ${(end - start) / 1000}s)`
        );

        if (result.isValid && result.preferredUrl && !processedUrls.has(result.preferredUrl)) {
          preferredUrl = result.preferredUrl;
          start = Date.now();
          scraped = await scrapeWebsiteCompetitors(preferredUrl);
          end = Date.now();
          console.log(
            `[brandprofile]  Scraped data for ${preferredUrl} (took ${(end - start) / 1000}s)`
          );
          start = Date.now();

          competitorData = await extractCompetitorDataFromLLM(scraped);
          end = Date.now();
          console.log(
            `[brandprofile]  Extracted competitor data for ${preferredUrl} (took ${(end - start) / 1000}s)`
          );
        } else {
          start = Date.now();
          competitorData = await extractCompetitorDataFromLLM(scraped);
          end = Date.now();
          console.log(
            `[brandprofile]  Fallback to competitor data extraction for ${originalUrl} (took ${(end - start) / 1000}s)`
          );
        }
        start = Date.now();
        name = competitorData?.name || scraped?.page_title || originalUrl;
        end = Date.now();
        console.log(`[brandprofile]  Competitor name: ${name} (extracted in ${(end - start) / 1000}s)`);

        if (processedNames.has(name)) {

          console.log(`[brandprofile]  Duplicate competitor skipped: ${name}`);
          continue;
        }
        start = Date.now();
        const competitor_id = uuidv4();
        await prisma.competitor_details.create({
          data: {
            website_url,
            competitor_id,
            website_id,
            report_id,
            name,
            competitor_website_url: preferredUrl,
            industry: competitorData?.industry || userRequirement.industry,
            primary_offering: competitorData?.primary_offering || userRequirement.primary_offering,
            usp: competitorData?.usp || "No clear USP identified",
            order_index: orderIndex++,
          },
        });
        end = Date.now();
        console.log(`[brandprofile]  Saved competitor ${name} (${preferredUrl}) to database (took ${(end - start) / 1000}s)`);
        start = Date.now();
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
        console.log(`[brandprofile]  Added competitor result for ${name} (${preferredUrl}) (took ${(end - start) / 1000}s)`);
        processedUrls.add(preferredUrl);
        processedNames.add(name);

        console.log(`[brandprofile]  Saved competitor: ${name} (${preferredUrl})`);
      } catch (err) {
        console.error(`[brandprofile] Error processing competitor ${originalUrl}:`, err);
      }
    }

    // --- If fewer than MAX_COMPETITORS, fetch from LLM ---
    if (competitorResults.length < MAX_COMPETITORS) {
      console.log(`[brandprofile]  Fetching remaining competitors from LLM...`);

      let parsed: any[] = [];
      let attempts = 0;
      const maxRetries = 4;

      while (attempts < maxRetries && parsed.length === 0) {
        console.log(`[brandprofile] Attempt ${attempts + 1}/${maxRetries} to parse LLM competitors`);
        attempts++;
        try {
        let startn = Date.now();
          const aiResponse = await fetchCompetitorsFromLLM(
            scrapedMain,
            userRequirement,
            Array.from(processedUrls),
            Array.from(processedNames)
          );
          let endn = Date.now();
          console.log(`[brandprofile] LLM competitors fetched in ${(endn - startn) / 1000}s`);
          startn = Date.now();
          parsed = parseCompetitorData(aiResponse) || [];
          endn = Date.now();
          console.log(`[brandprofile] LLM competitors parsed in ${(endn - startn) / 1000}s`);
          if (parsed.length === 0) {
            console.warn(`[brandprofile]  LLM returned no competitors (attempt ${attempts})`);
          }
        } catch (err) {
          console.error(`[brandprofile] Error fetching competitors from LLM (attempt ${attempts}):`, err);
        }
      }
      let start = Date.now();
      for (const comp of parsed) {
        if (competitorResults.length >= MAX_COMPETITORS) break;

        const name = comp.name || `Competitor ${competitorResults.length + 1}`;
        const url = comp.website_url;
        if (!url || processedUrls.has(url) || processedNames.has(name)) continue;
        let end = Date.now();
        console.log(`[brandprofile]  Processing LLM competitor: ${name} (${url}) (took ${(end - start) / 1000}s)`);
        try {
          start = Date.now();
          const { isValid, preferredUrl } = await isValidCompetitorUrl(url, undefined, browser);
          end = Date.now();
        console.log(`[brandprofile]  validation result for : ${name} (${url}) (took ${(end - start) / 1000}s)`);
          if (!isValid || !preferredUrl) continue;

          const competitor_id = uuidv4();
          await prisma.competitor_details.create({
            data: {
              website_url,
              competitor_id,
              website_id,
              report_id,
              name,
              competitor_website_url: preferredUrl,
              industry: comp.industry || userRequirement.industry,
              primary_offering: comp.primary_offering || userRequirement.primary_offering,
              usp: comp.usp || "No clear USP identified",
              order_index: orderIndex++,
            },
          });

          competitorResults.push({
            competitor_id,
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

          console.log(`[brandprofile]  Saved LLM competitor: ${name} (${preferredUrl})`);
        } catch (err) {
          console.error(`[brandprofile] Error saving LLM competitor ${url}:`, err);
        }
      }
    }
  } finally {
    if (browser) {
      await browser.close();
      console.log(`[brandprofile]  Browser closed`);
    }
  }

  const t1 = performance.now();
  console.log(`[brandprofile]  Finished brandprofile in ${(t1 - t0).toFixed(2)}ms`);

  return {
    mainWebsite: {
      brand_profile: {
        title: scrapedMain.page_title ?? "Unknown",
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



  static async seo_audit(user_id: string, website_id: string,report_id:string): Promise<SeoAuditResponse> {
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
      select: { scraped_data_id: true ,
                geo_llm:true,
      }
    });
    const [main_website_scrapeddata] = await Promise.all([
      prisma.website_scraped_data.findUnique({
        where: { scraped_data_id:report?.scraped_data_id??undefined },
        select: {
          meta_description: true,
          page_title: true,
          homepage_alt_text_coverage: true,
          schema_analysis: true,
          // raw_html: true,
          isCrawlable: true,
          headingAnalysis: true,
          logo_url: true,
          ctr_loss_percent: true,
          H1_text:true,
        },
      }),
    
    ]);

    let AI_Discoverability: any;
    if (!report?.geo_llm  === null) {
      console.log("No geo_llm response found");
      AI_Discoverability = await fetchBrands(user_id, website_id,report_id);
      console.log("geo_llm response fetched:", AI_Discoverability);
      await prisma.report.upsert({
        where: { report_id:  report_id  },
        update: { geo_llm: AI_Discoverability },
        create: { report_id, website_id, geo_llm: AI_Discoverability },
      });
    } else {
      AI_Discoverability = report?.geo_llm;
      console.log("geo_llm found");
    }

    if (main_website_scrapeddata) {
      const main_h1_heading = main_website_scrapeddata.H1_text

      const main_schema_markup_status: SchemaMarkupStatus = {
        url: main_website_url,
        message: main_website_scrapeddata.schema_analysis ? "Structured data detected" : "No structured data detected",
        schemas: {
          summary: main_website_scrapeddata.schema_analysis ? [{ type: "Organization", format: "JSON-LD", isValid: true }] : [],
          details: main_website_scrapeddata.schema_analysis ? { Organization: [{ type: "Organization", format: "JSON-LD", isValid: true }] } : {},
        },
      };

      response.mainWebsite = {
        brand_profile: {
          website_url: main_website_url,

          logo_url: main_website_scrapeddata.logo_url || null,
          ctr_loss_percent: typeof main_website_scrapeddata.ctr_loss_percent === "string" ? JSON.parse(main_website_scrapeddata.ctr_loss_percent) : main_website_scrapeddata.ctr_loss_percent || null,
        },
        seo_audit: {
          h1_heading: main_h1_heading,
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
          meta_title: null,
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

        const h1_heading = scraped.H1_text
        const schema_markup_status: SchemaMarkupStatus = {
          url: competitor_website_url,
          message: scraped.schema_analysis ? "Structured data detected" : "No structured data detected",
          schemas: {
            summary: scraped.schema_analysis ? [{ type: "Organization", format: "JSON-LD", isValid: true }] : [],
            details: scraped.schema_analysis ? { Organization: [{ type: "Organization", format: "JSON-LD", isValid: true }] } : {},
          },
        };

        const seo_audit: SeoAudit = {
          h1_heading: h1_heading || null,
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

  static async website_audit(user_id: string, website_id: string,report_id:string) {
    if (!website_id || !user_id || !report_id) {
      throw new Error("website_id report_id,and user_id are required");
    }

    console.log(`competitors website_audit-Fetching website URL for user_id ${user_id}, website_id: ${website_id}`);
    const website_url = await getWebsiteUrlById(user_id, website_id);
    if (!website_url) {
      throw new Error(`No website URL found for user_id: ${user_id} and website_id: ${website_id}`);
    }
const report = await prisma.report.findUnique({
      where: { report_id: report_id }, // You must have 'report_id' from req.body
      select: { scraped_data_id: true }
    });
    const [userRequirements, websiteScraped, mainPageSpeedData, geo_llm] = await Promise.all([
      prisma.user_requirements.findFirst({ where: { website_id } }),
      
      prisma.website_scraped_data.findUnique({ where: {scraped_data_id:report?.scraped_data_id?? undefined }}),
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

      // mainWebsitePageSpeed = await prisma.brand_website_analysis.create({
      //   data: {
      //     performance_score: mainPageSpeedData.categories?.performance ?? null,
      //     seo_score: mainPageSpeedData.categories?.seo ?? null,
      //     accessibility_score: mainPageSpeedData.categories?.accessibility ?? null,
      //     best_practices_score: mainPageSpeedData.categories?.best_practices ?? null,
      //     first_contentful_paint: getAuditValue("first-contentful-paint"),
      //     largest_contentful_paint: getAuditValue("largest-contentful-paint"),
      //     total_blocking_time: getAuditValue("total-blocking-time"),
      //     speed_index: getAuditValue("speed-index"),
      //     cumulative_layout_shift: getAuditValue("cumulative-layout-shift"),
      //     time_to_interactive: getAuditValue("interactive"),
      //     audit_details: mainPageSpeedData.audit_details,
      
    }

    const competitors = await prisma.competitor_details.findMany({
      where: { report_id},
      
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
    interface CompetitorResult {
      competitor_id: any;
      brand_profile: {
        title: string;
        website_url: string;
        revenueLossPercent?: number | null;
        industry?: string | null;
        logo_url?: string | null;
        primary_offering?: string | null;
        unique_selling_point?: string | null;
        ctr_loss_percent?: number | string | boolean | object | null; //  Add this line
      };
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
      seo_audit: {
        brandAuditseo: any;
        meta_description: string | null;
        page_title: string | null;
        meta_keywords?: string | null; //  Add this line
        schema_markup_status: any;
        isCrawlable: boolean | null;
        headingAnalysis: any;
        alt_text_coverage: any;
        h1_heading: string | null;
        AI_Discoverability?: string | null; //  Add this line
      };
    }
    const competitorResults: CompetitorResult[] = [];
    const processedUrls = new Set<string>([website_url]);

    // const pLimit = require("p-limit");
    // const limit = pLimit(7); // Now this works
    const limit = createLimiter(7); // Use our new helper function
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
              brandAuditseo: Array.isArray(audit_details?.seoAudits) ? processSeoAudits(audit_details.seoAudits) : null,
              meta_description: competitorDataMap.get(competitor_id)?.meta_description ?? null,
              page_title: competitorDataMap.get(competitor_id)?.page_title ?? null,
              schema_markup_status: safeParse(competitorDataMap.get(competitor_id)?.schema_analysis) ?? null,
              isCrawlable: competitorDataMap.get(competitor_id)?.isCrawlable ?? null,
              headingAnalysis: competitorDataMap.get(competitor_id)?.headingAnalysis ?? null,
              alt_text_coverage: competitorDataMap.get(competitor_id)?.homepage_alt_text_coverage ?? null,
              h1_heading: h1_heading || null,
              AI_Discoverability: "True", // Assuming AI discoverability is always true for competitors
            },
          });
        } catch (err) {
          const rawHtml = competitorDataMap.get(competitor_id)?.raw_html ?? null;
          const errorMsg = err instanceof Error ? err.message : String(err);

          competitorResults.push({
            competitor_id,
            brand_profile: {
              title: name ?? "",
              website_url: competitor_website_url,
              revenueLossPercent: null,
              logo_url: competitorDataMap.get(competitor_id)?.logo_url ?? null,
              primary_offering: primary_offering || null,
              unique_selling_point: usp || null,
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
              brandAuditseo: null,
              meta_description: competitorDataMap.get(competitor_id)?.meta_description ?? null,
              page_title: competitorDataMap.get(competitor_id)?.page_title ?? null,
              meta_keywords: competitorDataMap.get(competitor_id)?.meta_keywords ?? null,
              schema_markup_status: safeParse(competitorDataMap.get(competitor_id)?.schema_analysis) ?? null,
              isCrawlable: competitorDataMap.get(competitor_id)?.isCrawlable ?? null,
              headingAnalysis: competitorDataMap.get(competitor_id)?.headingAnalysis ?? null,
              alt_text_coverage: competitorDataMap.get(competitor_id)?.homepage_alt_text_coverage ?? null,
              h1_heading: competitorDataMap.get(competitor_id)?.H1_text ?? null,
              AI_Discoverability: "True",
            },
          });

          console.warn(` Fallback for ${competitor_website_url}: ${errorMsg}`);
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
        // If it's stored as a JSON string (unlikely with Prisma, but just in case)
        const parsed = JSON.parse(rawUrls);
        if (Array.isArray(parsed)) {
          preferredUrls = parsed.map((url) => String(url).trim().toLowerCase());
        }
      }
    } catch (e) {
      console.warn("[website_audit] Failed to parse competitor_urls:", e);
    }

    // 2. Sort competitorResults so preferred URLs come first, in their original input order
    const sortedCompetitorResults = competitorResults.sort((a, b) => {
      const aIndex = preferredUrls.indexOf(a.brand_profile.website_url?.toLowerCase() ?? "");
      const bIndex = preferredUrls.indexOf(b.brand_profile.website_url?.toLowerCase() ?? "");

      if (aIndex === -1 && bIndex === -1) return 0; // Neither is preferred
      if (aIndex === -1) return 1; // a is not preferred, b is
      if (bIndex === -1) return -1; // b is not preferred, a is
      return aIndex - bIndex; // Both are preferred, maintain order
    });

    const dashboarddata: Record<string, any> = {
      mainWebsite:
        mainPageSpeedData && isValidPageSpeedData(mainPageSpeedData)
          ? {
              brand_profile: {
                title: websiteScraped?.page_title || "Unknown",
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
                page_title: websiteScraped?.page_title || null,
                schema_markup_status: safeParse(websiteScraped?.schema_analysis) || null,
                isCrawlable: websiteScraped?.isCrawlable || null,
                headingAnalysis: websiteScraped?.headingAnalysis || null,
                alt_text_coverage: websiteScraped?.homepage_alt_text_coverage || null,
                h1_heading: websiteScraped?.H1_text || null,
                AI_Discoverability: geo_llm?.geo_llm || "False",
              },
            }
          : null,
      competitors: [],
    };
     
    dashboarddata.competitors = sortedCompetitorResults;



    const dataForLLM = {
  mainWebsite: dashboarddata.mainWebsite
    ? {
        ...dashboarddata.mainWebsite,
        seo_audit: {
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

// Combine both datasets into a single result object
const combinedResults = {
  dashboardData: dashboarddata,
  llmData: dataForLLM,
};

    await prisma.report.upsert({
      where: {
        report_id
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

 
  
// static async social_media(user_id: string, website_id: string,report_id:string) {
//     if (!website_id || !user_id || !report_id) {
//       throw new Error("website_id report_id,and user_id are required");
//     }

//     console.log(`competitors website_audit-Fetching website URL for user_id ${user_id}, website_id: ${website_id}`);
//     const website_url = await getWebsiteUrlById(user_id, website_id);
//     if (!website_url) {
//       throw new Error(`No website URL found for user_id: ${user_id} and website_id: ${website_id}`);
//     }


// const report = await prisma.report.findUnique({
//       where: { report_id: report_id }, // You must have 'report_id' from req.body
//       select: { scraped_data_id: true }
//     });
//     const [websiteScraped] = await Promise.all([
      
//       prisma.website_scraped_data.findUnique({ where: {scraped_data_id:report?.scraped_data_id?? undefined }}),

     
      
//     ]);
//     const main_website= fetchSocialMediaData(websiteScraped?.facebook_handle,websiteScraped?.instagram_handle,websiteScraped?.youtube_handle),

    

//     const competitors = await prisma.competitor_details.findMany({
//       where: { report_id},
      
//       orderBy: { order_index: "asc" },
//       take: 7,
//     });

//     console.log(
//       `competitors website_audit - Fetched ${competitors.length} competitors for website_id: ${website_id}, URLs: ${competitors
//         .map((c) => c.competitor_website_url)
//         .filter(Boolean)
//         .join(", ")}`
//     );

    

//     const competitorDataMap = new Map(competitors.map((item) => [item.competitor_id, item]));
    
//     // const competitorResults: CompetitorResult[] = [];
//     const processedUrls = new Set<string>([website_url]);

//     // const pLimit = require("p-limit");
//     // const limit = pLimit(7); // Now this works
//     const limit = createLimiter(7); // Use our new helper function
//     const competitorTasks = competitors.map((competitor) =>
//       limit(async () => {
//         const { competitor_id, name, competitor_website_url, usp, primary_offering, industry,facebook_handle,instagram_handle,youtube_handle } = competitor;
//         if (!competitor_website_url || processedUrls.has(competitor_website_url)) {
//           console.log(`Skipping competitor ${competitor_id} due to duplicate URL: ${competitor_website_url}`);
//           return;
//         }
//         processedUrls.add(competitor_website_url);

//         try {
//           console.log(`Fetching PageSpeed data for ${competitor_website_url}`);
//           const social_media = await fetchSocialMediaData(facebook_handle,instagram_handle,youtube_handle);

     
//           await prisma.competitor_details.update({
//             where: { competitor_id },
//             data: {
//               social_media_data: social_media,
//             },
//           });




     
        

//           console.warn(` Fallback for ${competitor_website_url}`);
        
//       )
//     );

//     const socila_media = {
//   main_website: main_website,
//   competitordata: social_media,


   

//     return dashboarddata;


//     } 

//   }




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
    select: { scraped_data_id: true }
  });

  const websiteScraped = await prisma.website_scraped_data.findUnique({
    where: { scraped_data_id: report?.scraped_data_id ?? undefined ,
      
    },
    select: {
      facebook_handle:true,
      instagram_handle:true,
      youtube_handle:true,
      linkedin_handle:true,

    },
  });
  console.log("main_website handles",websiteScraped)
  const main_website = await fetchSocialMediaData(
    websiteScraped?.facebook_handle,
    websiteScraped?.instagram_handle,
    websiteScraped?.youtube_handle,
    websiteScraped?.linkedin_handle,
    website_url
  );
    
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
        const {
          competitor_id,
          facebook_handle,
          instagram_handle,
          youtube_handle,
          linkedin_handle,
          competitor_website_url
        } = competitor;

        if (!competitor_website_url || processedUrls.has(competitor_website_url)) {
          console.log(`Skipping competitor ${competitor_id} due to duplicate URL.`);
          return { competitor_id, social_media: null };
        }

        processedUrls.add(competitor_website_url);

        try {
          const social_media = await fetchSocialMediaData(
            facebook_handle,
            instagram_handle,
            youtube_handle,
            linkedin_handle,
            competitor_website_url
          );

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
    competitors: competitorsData
  };

   await prisma.report.upsert({
        where: { report_id },
        update: { dashboard3_socialmedia: competitor_social_media_data },
        create: { website_id,report_id, dashboard3_socialmedia: competitor_social_media_data },
      });

  return {competitor_social_media_data};
}

  




  static async getComparisonRecommendations(website_id:string,report_id: string) {
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
        create: { website_id,report_id, recommendationbymo3: JSON.stringify(parsed) },
      });
      console.log("LLM response saved successfully for website_id:", website_id);
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