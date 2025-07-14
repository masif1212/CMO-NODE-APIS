import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { scrapeWebsiteCompetitors ,fetchBrands} from './scraper';
import { fetchCompetitorsFromLLM, extractCompetitorDataFromLLM, createComparisonPrompt } from './llm';
import { parseCompetitorData } from './parser';
import { getPageSpeedData } from './pagespeed';
import OpenAI from 'openai';
import 'dotenv/config';
import * as cheerio from "cheerio";
import { performance } from 'perf_hooks';
import pLimit from 'p-limit';
import puppeteer from 'puppeteer';
const dnsCache = new Map<string, string[]>();


import {SchemaMarkupStatus,SeoAudit,SeoAuditResponse,BrandProfile_logo,CTRLossPercent} from './seo_audit_interface'
import {isValidCompetitorUrl,processSeoAudits,validateCompetitorUrlsInParallel} from './competitors_validation'
import { UserRequirement,  ProcessedResult,LlmCompetitor } from './brandprofile_interface';
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
const model = process.env.OPENAI_MODEL || 'gpt-4.1';

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

async function getWebsiteUrlById(user_id: string, website_id: string): Promise<string> {
  const website = await prisma.user_websites.findUnique({

    where: {
      user_id_website_id: {
        user_id,
        website_id,
      },
    },
    select: {
      website_url: true,
    },
  });

  if (!website?.website_url) {
    throw new Error(`No URL found for user_id: ${user_id} and website_id: ${website_id}`);
  }

  return website.website_url;
}

async function extractH1(rawHtml: string | null): Promise<string> {
    if (!rawHtml) return 'Not Found';
    const $ = cheerio.load(rawHtml);
    return $('h1').first().text().trim() || 'Not Found';
  }


export class CompetitorService {

static async brandprofile(user_id: string, website_id: string): Promise<Record<string, any>> {
  const t0 = performance.now();
  if (!user_id || !website_id) throw new Error('user_id and website_id are required');

  const website_url = await getWebsiteUrlById(user_id, website_id);
  if (!website_url) throw new Error(`No website URL found for website_id=${website_id}`);

  const [scrapedMain, userRequirementRaw] = await Promise.all([
    prisma.website_scraped_data.findUnique({ where: { website_id } }),
    prisma.user_requirements.findFirst({ where: { website_id } }),
  ]);
  if (!scrapedMain) throw new Error(`No scraped data for website_id=${website_id}`);

  const userRequirement: UserRequirement = {
    industry: userRequirementRaw?.industry ?? 'Unknown',
    primary_offering: userRequirementRaw?.primary_offering ?? 'Unknown',
    USP: userRequirementRaw?.USP ?? 'Unknown',
    competitor_urls: Array.isArray(userRequirementRaw?.competitor_urls)
      ? userRequirementRaw.competitor_urls.filter((url): url is string => typeof url === 'string')
      : [],
  };

  const MIN_COMPETITORS = 6;
  const competitorResults: ProcessedResult[] = [];
  const processedUrls = new Set<string>([website_url]);
  const processedNames = new Set<string>();
  const limit = pLimit(4);
  let orderIndex = 0;

  const browser = await puppeteer.launch({ headless: true });

  const competitorValidationResults = await Promise.all(
    userRequirement.competitor_urls.map(url =>
      limit(async () => {
        const result = await isValidCompetitorUrl(url, undefined, browser);
        return { ...result, originalUrl: url };
      })
    )
  );

  const processingPromises = competitorValidationResults.map(({ isValid, preferredUrl, originalUrl }) =>
    limit(async () => {
      if (!preferredUrl || processedUrls.has(preferredUrl)) {
        const competitor_id = uuidv4();
        await prisma.competitor_details.create({
          data: {
            competitor_id,
            website_id,
            name: originalUrl,
            competitor_website_url: originalUrl,
            industry: null,
            primary_offering: null,
            usp: null,
            order_index: orderIndex++,
          },
        });

        competitorResults.push({
          competitor_id,
          brand_profile: {
            title: originalUrl,
            industry: 'Unknown',
            unique_selling_point: 'Unknown',
            primary_offering: 'Unknown',
            logo_url: 'Unknown',
            website_url: originalUrl,
          },
        });

        return;
      }

      try {
        const scraped = await scrapeWebsiteCompetitors(preferredUrl);
        const competitorData = await extractCompetitorDataFromLLM(scraped);
        if (!competitorData) throw new Error('No competitor data extracted');

        const competitorName = competitorData.name || (typeof scraped === 'object' && scraped !== null ? scraped.page_title : null) || preferredUrl;
        if (processedNames.has(competitorName)) return;

        const competitor_id = uuidv4();
        await prisma.competitor_details.create({
          data: {
            competitor_id,
            website_id,
            name: competitorName,
            competitor_website_url: preferredUrl,
            industry: competitorData.industry || userRequirement.industry,
            primary_offering: competitorData.primary_offering || userRequirement.primary_offering,
            usp: competitorData.usp || 'No clear USP identified',
            order_index: orderIndex++,
          },
        });

        competitorResults.push({
          competitor_id,
          brand_profile: {
            title: competitorName,
            industry: competitorData.industry || userRequirement.industry,
            unique_selling_point: competitorData.usp || 'No clear USP identified',
            primary_offering: competitorData.primary_offering || userRequirement.primary_offering,
            logo_url: competitorData.logo_url || (typeof scraped === 'object' && scraped !== null ? scraped.logo_url : null) || null,
            website_url: preferredUrl,
          },
        });

        processedUrls.add(preferredUrl);
        processedNames.add(competitorName);
      } catch (err) {
        const competitor_id = uuidv4();
        await prisma.competitor_details.create({
          data: {
            competitor_id,
            website_id,
            name: originalUrl,
            competitor_website_url: preferredUrl || originalUrl,
            industry: null,
            primary_offering: null,
            usp: null,
            order_index: orderIndex++,
          },
        });

        competitorResults.push({
          competitor_id,
          brand_profile: {
            title: originalUrl,
            industry: 'Unknown',
            unique_selling_point: 'Unknown',
            primary_offering: 'Unknown',
            logo_url: 'Unknown',
            website_url: preferredUrl || originalUrl,
          },
        });
      }
    })
  );

  await Promise.all(processingPromises);

  if (competitorResults.length < MIN_COMPETITORS) {
    const aiResponse = await fetchCompetitorsFromLLM(
      user_id,
      website_id,
      scrapedMain,
      userRequirement,
      Array.from(processedUrls),
      Array.from(processedNames)
    );

    const parsed = parseCompetitorData(aiResponse);

    for (const comp of parsed) {
      if (competitorResults.length >= MIN_COMPETITORS) break;

      const name = comp.name || `Competitor ${competitorResults.length + 1}`;
      const url = comp.website_url;
      if (!url || processedUrls.has(url) || processedNames.has(name)) continue;

      const { isValid, preferredUrl } = await isValidCompetitorUrl(url, undefined, browser);
      if (!isValid || !preferredUrl) continue;

      const competitor_id = uuidv4();
      await prisma.competitor_details.create({
        data: {
          competitor_id,
          website_id,
          name,
          competitor_website_url: preferredUrl,
          industry: comp.industry || userRequirement.industry,
          primary_offering: comp.primary_offering || userRequirement.primary_offering,
          usp: comp.usp || 'No clear USP identified',
          order_index: orderIndex++,
        },
      });

      competitorResults.push({
        competitor_id,
        brand_profile: {
          title: name,
          industry: comp.industry || userRequirement.industry,
          unique_selling_point: comp.usp || 'No clear USP identified',
          primary_offering: comp.primary_offering || userRequirement.primary_offering,
          website_url: preferredUrl,
          logo_url: null,
        },
      });

      processedUrls.add(preferredUrl);
      processedNames.add(name);
    }
  }

  await browser.close();

  const labeledResults: Record<string, any> = {
    mainWebsite: {
      brand_profile: {
        title: scrapedMain.page_title ?? 'Unknown',
        industry: userRequirement.industry,
        unique_selling_point: userRequirement.USP,
        primary_offering: userRequirement.primary_offering,
        logo_url: scrapedMain.logo_url || null,
        website_url,
        is_valid: true,
      },
    },
  };

  // competitorResults.forEach((r, i) => {
  //   labeledResults[`competitor${i + 1}`] = r;
  // });

  return {
  mainWebsite: {
    brand_profile: {
      title: scrapedMain.page_title ?? 'Unknown',
      industry: userRequirement.industry,
      unique_selling_point: userRequirement.USP,
      primary_offering: userRequirement.primary_offering,
      logo_url: scrapedMain.logo_url || null,
      website_url,
      is_valid: true,
    },
  },
  competitors: competitorResults, // already includes { competitor_id, brand_profile }
};
}





static async seo_audit(user_id: string, website_id: string): Promise<SeoAuditResponse> {
  const response: SeoAuditResponse = {
  mainWebsite: {
    brand_profile: {
      website_url: null,
      logo_url: null,
      ctr_loss_percent: null
    },
    seo_audit: {} as SeoAudit,
    
  },
  competitors: []
};
    if (!website_id || !user_id) {
      throw new Error('website_id and user_id are required');
    }

    console.log(`Fetching SEO audit data for user_id ${user_id}, website_id: ${website_id}`);
    const main_website_url = await getWebsiteUrlById(user_id, website_id);
    if (!main_website_url) {
      throw new Error(`No website URL found for user_id: ${user_id} and website_id: ${website_id}`);
    }

    const [main_website_scrapeddata, geollm] = await Promise.all([
      prisma.website_scraped_data.findUnique({
        where: { website_id },
        select: {
          meta_description: true,
          page_title: true,
          homepage_alt_text_coverage: true,
          schema_analysis: true,
          raw_html: true,
          isCrawlable: true,
          headingAnalysis: true,
          logo_url: true,
          ctr_loss_percent: true,
        },
      }),
      prisma.llm_responses.findUnique({
        where: { website_id },
        select: { geo_llm: true },
      }),
    ]);
    
    let AI_Discoverability: any;
    if (!geollm || geollm.geo_llm === null) {
      console.log('No geo_llm response found');
      AI_Discoverability = await fetchBrands(user_id, website_id);
      await prisma.analysis_status.upsert({
        where: { user_id_website_id: { user_id, website_id } },
        update: { geo_llm: AI_Discoverability },
        create: { user_id, website_id, geo_llm: AI_Discoverability },
      });
    } else {
      AI_Discoverability = geollm.geo_llm;
      console.log('geo_llm found');
    }

   

    if (main_website_scrapeddata) {
      const main_h1_heading = main_website_scrapeddata.raw_html
        ? await extractH1(main_website_scrapeddata.raw_html) || null
        : null;

      const main_schema_markup_status: SchemaMarkupStatus = {
        url: main_website_url,
        message: main_website_scrapeddata.schema_analysis ? 'Structured data detected' : 'No structured data detected',
        schemas: {
          summary: main_website_scrapeddata.schema_analysis
            ? [{ type: 'Organization', format: 'JSON-LD', isValid: true }]
            : [],
          details: main_website_scrapeddata.schema_analysis
            ? { Organization: [{ type: 'Organization', format: 'JSON-LD', isValid: true }] }
            : {},
        },
      };

      response.mainWebsite = {
         brand_profile: {
          website_url: main_website_url,

          logo_url: main_website_scrapeddata.logo_url || null,
          ctr_loss_percent: typeof main_website_scrapeddata.ctr_loss_percent === 'string'
            ? JSON.parse(main_website_scrapeddata.ctr_loss_percent)
            : main_website_scrapeddata.ctr_loss_percent || null,
        },
        seo_audit: {
          h1_heading: main_h1_heading,
          meta_title: main_website_scrapeddata.page_title || null,
          meta_description: main_website_scrapeddata.meta_description || null,
          alt_text_coverage: main_website_scrapeddata.homepage_alt_text_coverage,
          isCrawlable: main_website_scrapeddata.isCrawlable || false,
          headingAnalysis: main_website_scrapeddata.headingAnalysis as SeoAudit['headingAnalysis'],
          schema_markup_status: main_schema_markup_status,
          AI_Discoverability,
        }
       
      };
    } else {
      console.warn(`No scraped data found for main website_id: ${website_id}`);
      response.mainWebsite = {
        brand_profile: { website_url:null,logo_url: null, ctr_loss_percent: null },

        seo_audit: {
          h1_heading: null,
          meta_title: null,
          meta_description: null,
          alt_text_coverage: null,
          isCrawlable: false,
          headingAnalysis: null,
          schema_markup_status: null,
          AI_Discoverability: 'false',
        },
      };
    }

    // Fetch competitors sorted by order_index
    const competitors = await prisma.competitor_details.findMany({
      where: { website_id },
      select: { competitor_id: true, name: true, competitor_website_url: true },
      orderBy: { order_index: 'asc' },
      take: 6,
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
        if (typeof scraped === 'string') {
          throw new Error(`Scrape failed for ${competitor_website_url}: ${scraped}`);
        }

        const h1_heading = scraped.raw_html ? await extractH1(scraped.raw_html) || null : null;
        const schema_markup_status: SchemaMarkupStatus = {
          url: competitor_website_url,
          message: scraped.schema_analysis ? 'Structured data detected' : 'No structured data detected',
          schemas: {
            summary: scraped.schema_analysis
              ? [{ type: 'Organization', format: 'JSON-LD', isValid: true }]
              : [],
            details: scraped.schema_analysis
              ? { Organization: [{ type: 'Organization', format: 'JSON-LD', isValid: true }] }
              : {},
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
          AI_Discoverability: 'true',
        };

        const brand_profile: BrandProfile_logo = {
          website_url: scraped.website_url || competitor_website_url,
          logo_url: scraped.logo_url || null,
          ctr_loss_percent: scraped.ctr_loss_percent || null,
        };

        await prisma.competitor_data.upsert({
          where: { competitor_id },
          update: {
            ...scraped,
            schema_analysis: scraped.schema_analysis && typeof scraped.schema_analysis === 'object'
              ? JSON.stringify(scraped.schema_analysis)
              : scraped.schema_analysis,
            updated_at: new Date(),
            website_url: scraped.website_url || competitor_website_url,
          },
          create: {
            competitor_id,
            website_id,
            ...scraped,
            schema_analysis: scraped.schema_analysis && typeof scraped.schema_analysis === 'object'
              ? JSON.stringify(scraped.schema_analysis)
              : scraped.schema_analysis,
            website_url: scraped.website_url || competitor_website_url,
          },
        });

        // response.competitors[`competitor${competitorIndex}`] = { seo_audit, brand_profile };
        response.competitors.push({
        competitor_id,
         brand_profile,
        seo_audit
       
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

static async website_audit(user_id: string, website_id: string) {
  if (!website_id || !user_id) {
    throw new Error('website_id and user_id are required');
  }

  console.log(`competitors website_audit-Fetching website URL for user_id ${user_id}, website_id: ${website_id}`);
  const website_url = await getWebsiteUrlById(user_id, website_id);
  if (!website_url) {
    throw new Error(`No website URL found for user_id: ${user_id} and website_id: ${website_id}`);
  }

  const [userRequirements, websiteScraped, mainPageSpeedData] = await Promise.all([
    prisma.user_requirements.findFirst({ where: { website_id } }),
    prisma.website_scraped_data.findFirst({ where: { website_id } }),
    getPageSpeedData(website_url),
  ]);

  let mainWebsitePageSpeed: any = null;
  if (mainPageSpeedData && isValidPageSpeedData(mainPageSpeedData)) {
    const audits = mainPageSpeedData.audits || {};
    const getAuditValue = (id: string): string | null => {
      const audit = (audits as Record<string, { display_value?: string }>)[id];
      return audit?.display_value ?? null;
    };

    mainWebsitePageSpeed = await prisma.brand_website_analysis.create({
      data: {
        website_id,
        performance_score: mainPageSpeedData.categories?.performance ?? null,
        seo_score: mainPageSpeedData.categories?.seo ?? null,
        accessibility_score: mainPageSpeedData.categories?.accessibility ?? null,
        best_practices_score: mainPageSpeedData.categories?.best_practices ?? null,
        first_contentful_paint: getAuditValue('first-contentful-paint'),
        largest_contentful_paint: getAuditValue('largest-contentful-paint'),
        total_blocking_time: getAuditValue('total-blocking-time'),
        speed_index: getAuditValue('speed-index'),
        cumulative_layout_shift: getAuditValue('cumulative-layout-shift'),
        time_to_interactive: getAuditValue('interactive'),
        audit_details: mainPageSpeedData.audit_details,
        revenue_loss_percent: mainPageSpeedData.revenueLossPercent ?? null,
      },
    });
  }

  const competitors = await prisma.competitor_details.findMany({
    where: { website_id },
    select: {
      competitor_id: true,
      name: true,
      competitor_website_url: true,
      usp: true,
      primary_offering: true,
    },
    orderBy: { order_index: 'asc' },
    take: 6,
  });

  console.log(`competitors website_audit - Fetched ${competitors.length} competitors for website_id: ${website_id}, URLs: ${competitors.map((c) => c.competitor_website_url).filter(Boolean).join(', ')}`);

  const competitors_data = await prisma.competitor_data.findMany({
    where: { website_id },
    take: 6,
  });

  const competitorDataMap = new Map(competitors_data.map((item) => [item.competitor_id, item]));
  interface CompetitorResult {
      brand_profile: {
        title: string;
        website_url: string;
        revenueLossPercent?: number | null;
        logo_url?: string | null;
        primary_offering?: string | null;
        unique_selling_point?: string | null;
        ctr_loss_percent?: number | string | boolean | object|null; // ✅ Add this line
        
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
        schema_analysis: any;
        isCrawlable: boolean | null;
        headingAnalysis: any;
        homepage_alt_text_coverage: any;
        h1_heading: string | null;
      };
    }
  const competitorResults: CompetitorResult[] = [];
  const processedUrls = new Set<string>([website_url]);

  const limit = pLimit(7); // Adjust concurrency here

  const competitorTasks = competitors.map((competitor) =>
    limit(async () => {
      const { competitor_id, name, competitor_website_url, usp, primary_offering } = competitor;
      if (!competitor_website_url || processedUrls.has(competitor_website_url)) {
        console.log(`Skipping competitor ${competitor_id} due to missing or duplicate URL: ${competitor_website_url}`);
        return;
      }
      processedUrls.add(competitor_website_url);

      try {
        console.log(`Fetching PageSpeed data for ${competitor_website_url}`);
        const pageSpeedData = await getPageSpeedData(competitor_website_url);

        if (!pageSpeedData || !isValidPageSpeedData(pageSpeedData)) {
          throw new Error('Site is taking too long to respond');
        }

        await prisma.competitor_data.update({
          where: { competitor_id },
          data: {
            page_speed: JSON.parse(JSON.stringify(pageSpeedData)),
            revenue_loss_percent: pageSpeedData.revenueLossPercent,
          },
        });

        const { categories, audits, audit_details, revenueLossPercent } = pageSpeedData;
        const rawHtml = competitorDataMap.get(competitor_id)?.raw_html ?? null;
        const h1_heading = await extractH1(rawHtml);

        competitorResults.push({
          brand_profile: {
            title: name ?? '',
            website_url: competitor_website_url,
            revenueLossPercent: revenueLossPercent || null,
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
                display_value: audits?.speed_index?.display_value || 'N/A',
                score: audits?.speed_index?.score || null,
              },
              total_blocking_time: {
                display_value: audits?.total_blocking_time?.display_value || 'N/A',
                score: audits?.total_blocking_time?.score || null,
              },
              first_contentful_paint: {
                display_value: audits?.first_contentful_paint?.display_value || 'N/A',
                score: audits?.first_contentful_paint?.score || null,
              },
              largest_contentful_paint: {
                display_value: audits?.largest_contentful_paint?.display_value || 'N/A',
                score: audits?.largest_contentful_paint?.score || null,
              },
              cumulative_layout_shift: {
                display_value: audits?.cumulative_layout_shift?.display_value || 'N/A',
                score: audits?.cumulative_layout_shift?.score || null,
              },
            },
          },
          seo_audit: {
            brandAuditseo: Array.isArray(audit_details?.seoAudits)
              ? processSeoAudits(audit_details.seoAudits)
              : null,
            meta_description: competitorDataMap.get(competitor_id)?.meta_description ?? null,
            page_title: competitorDataMap.get(competitor_id)?.page_title ?? null,
            schema_analysis: competitorDataMap.get(competitor_id)?.schema_analysis ?? null,
            isCrawlable: competitorDataMap.get(competitor_id)?.isCrawlable ?? null,
            headingAnalysis: competitorDataMap.get(competitor_id)?.headingAnalysis ?? null,
            homepage_alt_text_coverage: competitorDataMap.get(competitor_id)?.homepage_alt_text_coverage ?? null,
            h1_heading: h1_heading || null,
          },
        });
      } catch (err) {
        const rawHtml = competitorDataMap.get(competitor_id)?.raw_html ?? null;
        const h1_heading = await extractH1(rawHtml);
        const errorMsg = err instanceof Error ? err.message : String(err);

        competitorResults.push({
          brand_profile: {
            title: name ?? '',
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
              speed_index: { display_value: 'n/a', score: null },
              total_blocking_time: { display_value: 'n/a', score: null },
              first_contentful_paint: { display_value: 'n/a', score: null },
              largest_contentful_paint: { display_value: 'n/a', score: null },
              cumulative_layout_shift: { display_value: 'n/a', score: null },
            },
          },
          seo_audit: {
            brandAuditseo: null,
            meta_description: competitorDataMap.get(competitor_id)?.meta_description ?? null,
            page_title: competitorDataMap.get(competitor_id)?.page_title ?? null,
            schema_analysis: competitorDataMap.get(competitor_id)?.schema_analysis ?? null,
            isCrawlable: competitorDataMap.get(competitor_id)?.isCrawlable ?? null,
            headingAnalysis: competitorDataMap.get(competitor_id)?.headingAnalysis ?? null,
            homepage_alt_text_coverage: competitorDataMap.get(competitor_id)?.homepage_alt_text_coverage ?? null,
            h1_heading,
          },
        });

        console.warn(`⚠️ Fallback for ${competitor_website_url}: ${errorMsg}`);
      }
    })
  );

  await Promise.all(competitorTasks);

  const mainH1Heading = await extractH1(websiteScraped?.raw_html ?? null);
  const labeledResults: Record<string, any> = {
    mainWebsite: mainPageSpeedData && isValidPageSpeedData(mainPageSpeedData) ? {
      brand_profile: {
        title: websiteScraped?.page_title || 'Unknown',
        website_url: website_url,
        revenueLossPercent: mainPageSpeedData.revenueLossPercent || null,
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
            display_value: mainPageSpeedData.audits?.speed_index?.display_value || 'N/A',
            score: mainPageSpeedData.audits?.speed_index?.score || null,
          },
          total_blocking_time: {
            display_value: mainPageSpeedData.audits?.total_blocking_time?.display_value || 'N/A',
            score: mainPageSpeedData.audits?.total_blocking_time?.score || null,
          },
          first_contentful_paint: {
            display_value: mainPageSpeedData.audits?.first_contentful_paint?.display_value || 'N/A',
            score: mainPageSpeedData.audits?.first_contentful_paint?.score || null,
          },
          largest_contentful_paint: {
            display_value: mainPageSpeedData.audits?.largest_contentful_paint?.display_value || 'N/A',
            score: mainPageSpeedData.audits?.largest_contentful_paint?.score || null,
          },
          cumulative_layout_shift: {
            display_value: mainPageSpeedData.audits?.cumulative_layout_shift?.display_value || 'N/A',
            score: mainPageSpeedData.audits?.cumulative_layout_shift?.score || null,
          },
        },
      },
      seo_audit: {
        brandAuditseo: Array.isArray(mainPageSpeedData.audit_details?.seoAudits)
          ? processSeoAudits(mainPageSpeedData.audit_details.seoAudits)
          : null,
        meta_description: websiteScraped?.meta_description || null,
        page_title: websiteScraped?.page_title || null,
        schema_analysis: websiteScraped?.schema_analysis || null,
        isCrawlable: websiteScraped?.isCrawlable || null,
        headingAnalysis: websiteScraped?.headingAnalysis || null,
        homepage_alt_text_coverage: websiteScraped?.homepage_alt_text_coverage || null,
        h1_heading: mainH1Heading || null,
      },
    } : null,
    competitors: [], 
  };

  // competitorResults.forEach((result, idx) => {
  //   labeledResults[`competitor${idx + 1}`] = result;
    labeledResults.competitors = competitorResults
    // console.log(`Added competitor${idx + 1} with title: ${result.brand_profile.title}, revenueLossPercent: ${result.brand_profile.revenueLossPercent}`);
  // });

  await prisma.analysis_status.upsert({
    where: {
      user_id_website_id: {
        user_id,
        website_id,
      },
    },
    update: {
      competitor_details: JSON.stringify(labeledResults),
    },
    create: {
      user_id,
      website_id,
      competitor_details: JSON.stringify(labeledResults),
    },
  });

  return labeledResults;
}

  static async getComparisonRecommendations(website_id: string) {
    if (!website_id) {
      throw new Error('website_id is required');
    }

    console.log(`Fetching comparison recommendations for website_id: ${website_id}`);
    const mainWebsite = await prisma.user_websites.findUnique({
      where: { website_id },
      include: {
        website_scraped_data: true,
        brand_website_analysis: { orderBy: { created_at: 'desc' }, take: 1 },
      },
    });

    if (!mainWebsite) {
      throw new Error('Website not found');
    }

    const userRequirementRaw = await prisma.user_requirements.findFirst({
      where: { website_id },
    });

   

    const prompt = await createComparisonPrompt(website_id);
    if (!prompt) {
      throw new Error('Failed to generate prompt for LLM');
    }

    const response = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: model,
      temperature: 0.7,
      max_tokens: 3000,
    });

    const raw = response.choices?.[0]?.message?.content || '{}';
    let parsed;
    try {
      parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      await prisma.llm_responses.upsert({
        where: { website_id },
        update: { recommendation_by_mo_dashboard3: JSON.stringify(response) },
        create: { website_id, recommendation_by_mo_dashboard3: JSON.stringify(response) },
      });
      await prisma.analysis_status.upsert({
        where: { user_id_website_id: { user_id: userRequirementRaw?.user_id ?? '', website_id } },
        update: { recommendation_by_mo3: JSON.stringify(parsed) },
        create: { website_id, user_id: userRequirementRaw?.user_id ?? '', recommendation_by_mo3: JSON.stringify(parsed) },
      });
      console.log('LLM response saved successfully for website_id:', website_id);
    } catch (err) {
      console.error('Error parsing JSON response:', err);
      parsed = { recommendations: [] };
    }

    return parsed;
  }
}

function isValidPageSpeedData(data: any): data is PageSpeedData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'categories' in data &&
    typeof data.categories === 'object' &&
    'audits' in data &&
    typeof data.audits === 'object' &&
    'audit_details' in data &&
    typeof data.audit_details === 'object'
  );
}



