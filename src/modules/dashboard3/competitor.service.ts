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
function safeParse(jsonStr: any) {
      try {
        return typeof jsonStr === "string" ? JSON.parse(jsonStr) : jsonStr;
      } catch (e) {
        console.error("JSON parse failed:", e);
        return jsonStr;
      }
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

// static async brandprofile(user_id: string, website_id: string): Promise<Record<string, any>> {
//   const t0 = performance.now();
//   console.log(`[brandprofile] Starting brand profile generation for website_id=${website_id}`);

//   if (!user_id || !website_id) throw new Error('user_id and website_id are required');

//   const website_url = await getWebsiteUrlById(user_id, website_id);
//   if (!website_url) throw new Error(`[brandprofile] No website URL found for website_id=${website_id}`);
//   console.log(`[brandprofile] Found main website URL: ${website_url}`);

//   const [scrapedMain, userRequirementRaw] = await Promise.all([
//     prisma.website_scraped_data.findUnique({ where: { website_id } }),
//     prisma.user_requirements.findFirst({ where: { website_id } }),
//   ]);

//   if (!scrapedMain) throw new Error(`[brandprofile] No scraped data found for website_id=${website_id}`);
//   console.log(`[brandprofile] Loaded scraped main website data`);

//   const userRequirement: UserRequirement = {
//     industry: userRequirementRaw?.industry ?? 'Unknown',
//     primary_offering: userRequirementRaw?.primary_offering ?? 'Unknown',
//     USP: userRequirementRaw?.USP ?? 'Unknown',
//     competitor_urls: Array.isArray(userRequirementRaw?.competitor_urls)
//       ? userRequirementRaw.competitor_urls.filter((url): url is string => typeof url === 'string')
//       : [],
//   };

//   console.log(`[brandprofile] Parsed user requirements: ${JSON.stringify(userRequirement)}`);

//   const MIN_COMPETITORS = 3;
//   const competitorResults: ProcessedResult[] = [];
//   const processedUrls = new Set<string>([website_url]);
//   const processedNames = new Set<string>();
//   const limit = pLimit(4);
//   let orderIndex = 0;

//   const browser = await puppeteer.launch({ headless: true });
//   console.log(`[brandprofile] Puppeteer browser launched`);

//   // Process user-provided competitors
//   const competitorValidationResults = await Promise.all(
//     userRequirement.competitor_urls.map(url =>
//       limit(async () => {
//         const result = await isValidCompetitorUrl(url, undefined, browser);
//         console.log(`[brandprofile] Validation for ${url}: isValid=${result.isValid}`);
//         return { ...result, originalUrl: url };
//       })
//     )
//   );

//   const processingPromises = competitorValidationResults
//     .filter(({ isValid }) => isValid)
//     .map(({ preferredUrl, originalUrl }) =>
//       limit(async () => {
//         if (!preferredUrl || processedUrls.has(preferredUrl)) {
//           console.log(`[brandprofile] Skipping duplicate or invalid URL: ${preferredUrl || originalUrl}`);
//           return;
//         }

//         try {
//           console.log(`[brandprofile] Scraping and extracting user-provided competitor: ${preferredUrl}`);
//           const scraped = await scrapeWebsiteCompetitors(preferredUrl);
//           const competitorData = await extractCompetitorDataFromLLM(scraped);
//           if (!competitorData) throw new Error('No competitor data extracted');

//           const competitorName = competitorData.name || (typeof scraped === 'object' && scraped !== null ? scraped.page_title : null) || preferredUrl;

//           if (processedNames.has(competitorName)) {
//             console.log(`[brandprofile] Duplicate name detected, skipping: ${competitorName}`);
//             return;
//           }

//           const competitor_id = uuidv4();
//           await prisma.competitor_details.create({
//             data: {
//               competitor_id,
//               website_id,
//               name: competitorName,
//               competitor_website_url: preferredUrl,
//               industry: competitorData.industry || userRequirement.industry,
//               primary_offering: competitorData.primary_offering || userRequirement.primary_offering,
//               usp: competitorData.usp || 'No clear USP identified',
//               order_index: orderIndex++,
//             },
//           });

//           competitorResults.push({
//             competitor_id,
//             brand_profile: {
//               title: competitorName,
//               industry: competitorData.industry || userRequirement.industry,
//               unique_selling_point: competitorData.usp || 'No clear USP identified',
//               primary_offering: competitorData.primary_offering || userRequirement.primary_offering,
//               logo_url: competitorData.logo_url || (typeof scraped === 'object' && scraped !== null ? scraped.logo_url : null) || null,
//               website_url: preferredUrl,
//             },
//           });

//           console.log(`[brandprofile] User-provided competitor saved: ${competitorName} (${preferredUrl})`);

//           processedUrls.add(preferredUrl);
//           processedNames.add(competitorName);
//         } catch (err) {
//           console.error(`[brandprofile] Error processing user competitor ${preferredUrl}: ${err}`);
//         }
//       })
//     );

//   await Promise.all(processingPromises);
//   console.log(`[brandprofile] Finished processing user-provided competitors. Total valid: ${competitorResults.length}`);

//   // LLM fallback (no extractCompetitorDataFromLLM here)
//   if (competitorResults.length < MIN_COMPETITORS) {
//     console.log(`[brandprofile] Less than ${MIN_COMPETITORS} competitors found. Fetching from LLM...`);

//     const aiResponse = await fetchCompetitorsFromLLM(
//       user_id,
//       website_id,
//       scrapedMain,
//       userRequirement,
//       Array.from(processedUrls),
//       Array.from(processedNames)
//     );

//     const parsed = parseCompetitorData(aiResponse);

//     for (const comp of parsed) {
//       const name = comp.name || `Competitor ${competitorResults.length + 1}`;
//       const url = comp.website_url;

//       if (!url || processedUrls.has(url) || processedNames.has(name)) {
//         console.log(`[brandprofile] Skipping duplicate or invalid AI-suggested: ${url}`);
//         continue;
//       }

//       const { isValid, preferredUrl } = await isValidCompetitorUrl(url, undefined, browser);
//       console.log(`[brandprofile] AI competitor validation: ${url}, isValid=${isValid}`);

//       if (!isValid || !preferredUrl) {
//         console.log(`[brandprofile] Skipping invalid AI-suggested URL: ${url}`);
//         continue;
//       }

//       try {
//         const competitor_id = uuidv4();
//         await prisma.competitor_details.create({
//           data: {
//             competitor_id,
//             website_id,
//             name,
//             competitor_website_url: preferredUrl,
//             industry: comp.industry || userRequirement.industry,
//             primary_offering: comp.primary_offering || userRequirement.primary_offering,
//             usp: comp.usp || 'No clear USP identified',
//             order_index: orderIndex++,
//           },
//         });

//         competitorResults.push({
//           competitor_id,
//           brand_profile: {
//             title: name,
//             industry: comp.industry || userRequirement.industry,
//             unique_selling_point: comp.usp || 'No clear USP identified',
//             primary_offering: comp.primary_offering || userRequirement.primary_offering,
//             website_url: preferredUrl,
//             logo_url: null,
//           },
//         });

//         processedUrls.add(preferredUrl);
//         processedNames.add(name);

//         console.log(`[brandprofile] AI competitor saved: ${name} (${preferredUrl})`);
//       } catch (err) {
//         console.error(`[brandprofile] Error saving AI competitor ${preferredUrl}: ${err}`);
//       }
//     }
//   }

//   await browser.close();
//   console.log(`[brandprofile] Browser closed`);

//   const t1 = performance.now();
//   console.log(`[brandprofile] Finished brandprofile in ${(t1 - t0).toFixed(2)}ms`);
//   console.log("competitorResults:", competitorResults);
//   return {
//     mainWebsite: {
//       brand_profile: {
//         title: scrapedMain.page_title ?? 'Unknown',
//         industry: userRequirement.industry,
//         unique_selling_point: userRequirement.USP,
//         primary_offering: userRequirement.primary_offering,
//         logo_url: scrapedMain.logo_url || null,
//         website_url,
//         is_valid: true,
//       },
//     },
//     competitors: competitorResults,
//   };
// }


static async brandprofile(user_id: string, website_id: string): Promise<Record<string, any>> {
  const t0 = performance.now();
  console.log(`[brandprofile] Starting brand profile generation for website_id=${website_id}`);

  if (!user_id || !website_id) throw new Error('user_id and website_id are required');

  const website_url = await getWebsiteUrlById(user_id, website_id);
  if (!website_url) throw new Error(`[brandprofile] No website URL found for website_id=${website_id}`);
  console.log(`[brandprofile] Found main website URL: ${website_url}`);

  const [scrapedMain, userRequirementRaw] = await Promise.all([
    prisma.website_scraped_data.findUnique({ where: { website_id } }),
    prisma.user_requirements.findFirst({ where: { website_id } }),
  ]);

  if (!scrapedMain) throw new Error(`[brandprofile] No scraped data found for website_id=${website_id}`);
  console.log(`[brandprofile] Loaded scraped main website data`);

  const userRequirement: UserRequirement = {
    industry: userRequirementRaw?.industry ?? 'Unknown',
    primary_offering: userRequirementRaw?.primary_offering ?? 'Unknown',
    USP: userRequirementRaw?.USP ?? 'Unknown',
    competitor_urls: Array.isArray(userRequirementRaw?.competitor_urls)
      ? userRequirementRaw.competitor_urls.filter((url): url is string => typeof url === 'string')
      : [],
  };

  console.log(`[brandprofile] Parsed user requirements: ${JSON.stringify(userRequirement)}`);

  const MAX_COMPETITORS = 3;
  const competitorResults: ProcessedResult[] = [];
  const processedUrls = new Set<string>([website_url]);
  const processedNames = new Set<string>();
  let orderIndex = 0;

  const browser = await puppeteer.launch({ headless: true });
  console.log(`[brandprofile] Puppeteer browser launched`);

  // Process user-provided competitors
  for (const originalUrl of userRequirement.competitor_urls) {
    if (competitorResults.length >= MAX_COMPETITORS) break;

    let preferredUrl = originalUrl;
    let competitorData: any = null;
    let scraped: any = null;
    let name = originalUrl;

    try {
      const result = await isValidCompetitorUrl(originalUrl, undefined, browser);
      console.log(`[brandprofile] Validation result for ${originalUrl}:`, result);

      if (result.isValid && result.preferredUrl && !processedUrls.has(result.preferredUrl)) {
        preferredUrl = result.preferredUrl;
        scraped = await scrapeWebsiteCompetitors(preferredUrl);
        competitorData = await extractCompetitorDataFromLLM(scraped);
      } else {
        // Not valid, use fallback data
        preferredUrl = originalUrl;
        competitorData = await extractCompetitorDataFromLLM(null);
      }

      name = competitorData?.name || scraped?.page_title || originalUrl;
      if (processedNames.has(name)) {
        console.log(`[brandprofile] Duplicate name, skipping user competitor: ${name}`);
        continue;
      }

      const competitor_id = uuidv4();
      await prisma.competitor_details.create({
        data: {
          competitor_id,
          website_id,
          name,
          competitor_website_url: preferredUrl,
          industry: competitorData?.industry || userRequirement.industry,
          primary_offering: competitorData?.primary_offering || userRequirement.primary_offering,
          usp: competitorData?.usp || 'No clear USP identified',
          order_index: orderIndex++,
        },
      });

      competitorResults.push({
        competitor_id,
        brand_profile: {
          title: name,
          industry: competitorData?.industry || userRequirement.industry,
          unique_selling_point: competitorData?.usp || 'No clear USP identified',
          primary_offering: competitorData?.primary_offering || userRequirement.primary_offering,
          logo_url: competitorData?.logo_url || scraped?.logo_url || null,
          website_url: preferredUrl,
        },
      });

      processedUrls.add(preferredUrl);
      processedNames.add(name);
      console.log(`[brandprofile] Saved user competitor: ${name} (${preferredUrl})`);
    } catch (err) {
      console.error(`[brandprofile] Error processing user competitor ${originalUrl}: ${err}`);
    }
  }

  // If fewer than MAX_COMPETITORS, fetch from LLM
  if (competitorResults.length < MAX_COMPETITORS) {
    console.log(`[brandprofile] Fetching remaining competitors from LLM...`);

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
      if (competitorResults.length >= MAX_COMPETITORS) break;

      const name = comp.name || `Competitor ${competitorResults.length + 1}`;
      const url = comp.website_url;

      if (!url || processedUrls.has(url) || processedNames.has(name)) continue;

      try {
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
            logo_url: null,
            website_url: preferredUrl,
          },
        });

        processedUrls.add(preferredUrl);
        processedNames.add(name);
        console.log(`[brandprofile] Saved LLM competitor: ${name} (${preferredUrl})`);
      } catch (err) {
        console.error(`[brandprofile] Error saving LLM competitor ${url}: ${err}`);
      }
    }
  }

  await browser.close();
  console.log(`[brandprofile] Browser closed`);

  const t1 = performance.now();
  console.log(`[brandprofile] Finished brandprofile in ${(t1 - t0).toFixed(2)}ms`);
  console.log("competitorResults:", competitorResults);

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
    competitors: competitorResults.slice(0, MAX_COMPETITORS),
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
      console.log('geo_llm response fetched:', AI_Discoverability);
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

  const [userRequirements, websiteScraped, mainPageSpeedData,geo_llm] = await Promise.all([
    prisma.user_requirements.findFirst({ where: { website_id } }),
    prisma.website_scraped_data.findFirst({ where: { website_id } }),
    getPageSpeedData(website_url),

    prisma.llm_responses.findFirst({
      where: { website_id },
      orderBy: { created_at: 'desc' },
      select: {
        geo_llm: true,
      },
    }),
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
      industry: true,
      order_index: true,
    },
    orderBy: { order_index: 'asc' },
    take: 7,
  });

  console.log(`competitors website_audit - Fetched ${competitors.length} competitors for website_id: ${website_id}, URLs: ${competitors.map((c) => c.competitor_website_url).filter(Boolean).join(', ')}`);

  const competitors_data = await prisma.competitor_data.findMany({
    where: { website_id },
    take: 7,
  });

  const competitorDataMap = new Map(competitors_data.map((item) => [item.competitor_id, item]));
  interface CompetitorResult {
    competitor_id:any;
      brand_profile: {
        title: string;
        website_url: string;
        revenueLossPercent?: number | null;
        industry?: string | null;
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
        meta_keywords?: string | null; // ✅ Add this line
        schema_markup_status: any;
        isCrawlable: boolean | null;
        headingAnalysis: any;
        alt_text_coverage: any;
        h1_heading: string | null;
        AI_Discoverability?: string | null; // ✅ Add this line
      };
    }
  const competitorResults: CompetitorResult[] = [];
  const processedUrls = new Set<string>([website_url]);

  const limit = pLimit(7); // Adjust concurrency here

  const competitorTasks = competitors.map((competitor) =>
    limit(async () => {
      const { competitor_id, name, competitor_website_url, usp, primary_offering ,industry} = competitor;
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
          competitor_id,
          brand_profile: {
            title: name ?? '',
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
            schema_markup_status: safeParse(competitorDataMap.get(competitor_id)?.schema_analysis) ?? null,
            isCrawlable: competitorDataMap.get(competitor_id)?.isCrawlable ?? null,
            headingAnalysis: competitorDataMap.get(competitor_id)?.headingAnalysis ?? null,
            alt_text_coverage: competitorDataMap.get(competitor_id)?.homepage_alt_text_coverage ?? null,
            h1_heading: h1_heading || null,
            AI_Discoverability: 'True', // Assuming AI discoverability is always true for competitors
          },
        });
      } catch (err) {
        const rawHtml = competitorDataMap.get(competitor_id)?.raw_html ?? null;
        const h1_heading = await extractH1(rawHtml);
        const errorMsg = err instanceof Error ? err.message : String(err);

        competitorResults.push({
          competitor_id,
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
            meta_keywords: competitorDataMap.get(competitor_id)?.meta_keywords ?? null,
            schema_markup_status: safeParse(competitorDataMap.get(competitor_id)?.schema_analysis) ?? null,
            isCrawlable: competitorDataMap.get(competitor_id)?.isCrawlable ?? null,
            headingAnalysis: competitorDataMap.get(competitor_id)?.headingAnalysis ?? null,
            alt_text_coverage: competitorDataMap.get(competitor_id)?.homepage_alt_text_coverage ?? null,
            h1_heading,
            AI_Discoverability: 'True',
          },
        });

        console.warn(`⚠️ Fallback for ${competitor_website_url}: ${errorMsg}`);
      }
    })
  );

  await Promise.all(competitorTasks);
  // 1. Extract preferred competitor URLs from user_requirements
let preferredUrls: string[] = [];

try {
  const rawUrls = userRequirements?.competitor_urls;

  if (Array.isArray(rawUrls)) {
    preferredUrls = rawUrls.map((url) => String(url).trim().toLowerCase());
  } else if (typeof rawUrls === 'string') {
    // If it's stored as a JSON string (unlikely with Prisma, but just in case)
    const parsed = JSON.parse(rawUrls);
    if (Array.isArray(parsed)) {
      preferredUrls = parsed.map((url) => String(url).trim().toLowerCase());
    }
  }
} catch (e) {
  console.warn('[website_audit] Failed to parse competitor_urls:', e);
}


// 2. Sort competitorResults so preferred URLs come first, in their original input order
const sortedCompetitorResults = competitorResults.sort((a, b) => {
  const aIndex = preferredUrls.indexOf(a.brand_profile.website_url?.toLowerCase() ?? '');
  const bIndex = preferredUrls.indexOf(b.brand_profile.website_url?.toLowerCase() ?? '');

  if (aIndex === -1 && bIndex === -1) return 0; // Neither is preferred
  if (aIndex === -1) return 1; // a is not preferred, b is
  if (bIndex === -1) return -1; // b is not preferred, a is
  return aIndex - bIndex; // Both are preferred, maintain order
});

  const mainH1Heading = await extractH1(websiteScraped?.raw_html ?? null);
  const labeledResults: Record<string, any> = {
    mainWebsite: mainPageSpeedData && isValidPageSpeedData(mainPageSpeedData) ? {
      brand_profile: {
        title: websiteScraped?.page_title || 'Unknown',
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
        schema_markup_status: safeParse(websiteScraped?.schema_analysis) || null,
        isCrawlable: websiteScraped?.isCrawlable || null,
        headingAnalysis: websiteScraped?.headingAnalysis || null,
        alt_text_coverage: websiteScraped?.homepage_alt_text_coverage || null,
        h1_heading: mainH1Heading || null,
        AI_Discoverability: geo_llm?.geo_llm || 'False',
      },
    } : null,
    competitors: [], 
  };


    // labeledResults.competitors = competitorResults
    labeledResults.competitors = sortedCompetitorResults;


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



