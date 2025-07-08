import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { scrapeWebsiteCompetitors ,fetchBrands} from './scraper';
import { fetchCompetitorsFromLLM, extractCompetitorDataFromLLM, createComparisonPrompt } from './llm';
import { parseCompetitorData } from './parser';
import { getPageSpeedData } from './pagespeed';
import OpenAI from 'openai';
import 'dotenv/config';
import * as cheerio from "cheerio";


import {SchemaMarkupStatus,SeoAudit,SeoAuditResponse,BrandProfile_logo,CTRLossPercent} from './seo_audit_interface'
import {isValidCompetitorUrl,processSeoAudits} from './competitors_validation'
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
  if (!website_id || !user_id) {
    throw new Error('website_id and user_id are required');
  }

  console.log(`Getting website URL for user_id ${user_id}, website_id: ${website_id}`);
  const website_url = await getWebsiteUrlById(user_id, website_id);
  if (!website_url) {
    throw new Error(`No website URL found for user_id: ${user_id} and website_id: ${website_id}`);
  }
  console.log('Website URL retrieved:', website_url);

  // Fetch main website data and user requirements in parallel
  const [scrapedMain, userRequirementRaw] = await Promise.all([
    prisma.website_scraped_data.findUnique({ where: { website_id } }),
    prisma.user_requirements.findFirst({ where: { website_id } }),
  ]);

  // Check if main website data exists
  if (!scrapedMain) {
    throw new Error(`No scraped data found for website_id: ${website_id}`);
  }

  // Prepare user requirements
  const userRequirement: UserRequirement = {
    industry: userRequirementRaw?.industry ?? 'Unknown',
    primary_offering: userRequirementRaw?.primary_offering ?? 'Unknown',
    USP: userRequirementRaw?.USP ?? 'Unknown',
    competitor_urls: Array.isArray(userRequirementRaw?.competitor_urls)
      ? userRequirementRaw.competitor_urls.filter((url): url is string => typeof url === 'string')
      : [],
  };

  const competitorResults: ProcessedResult[] = [];
  const processedUrls = new Set<string>([website_url]);
  const processedNames = new Set<string>();
  const MIN_COMPETITORS = 5; // Set to 2 based on logs

  // Process user-provided competitor URLs sequentially until MIN_COMPETITORS are found
  const processDbCompetitors = async () => {
    for (const compUrl of userRequirement.competitor_urls) {
      if (competitorResults.length >= MIN_COMPETITORS) break;

      console.log(`Validating competitor URL: ${compUrl}`);
      const { isValid, preferredUrl } = await isValidCompetitorUrl(compUrl);
      if (!isValid) {
        console.log(`Skipping invalid competitor URL: ${compUrl}`);
        continue;
      }

      const urlToProcess = preferredUrl || compUrl;
      if (processedUrls.has(urlToProcess)) {
        console.log(`Skipping duplicate competitor URL: ${urlToProcess}`);
        continue;
      }

      try {
        console.log(`Scraping competitor URL: ${urlToProcess}`);
        const scraped = await scrapeWebsiteCompetitors(urlToProcess);
        if (!scraped || typeof scraped !== 'object') {
          throw new Error(`Scrape failed for ${urlToProcess}`);
        }

        console.log(`Extracting competitor data for ${urlToProcess}`);
        const competitorData = await extractCompetitorDataFromLLM(scraped);
        if (!competitorData) {
          console.log(`Skipping competitor due to LLM parsing failure: ${urlToProcess}`);
          continue;
        }

        const competitorName = competitorData.name || scraped.page_title || urlToProcess;
        if (processedNames.has(competitorName)) {
          console.log(`Skipping duplicate competitor name: ${competitorName}`);
          continue;
        }

        const competitor_id = uuidv4();
        const competitorResult: ProcessedResult = {
          brand_profile: {
            title: competitorName,
            industry: competitorData.industry || userRequirement.industry,
            unique_selling_point: competitorData.usp || 'No clear USP identified',
            primary_offering: competitorData.primary_offering || userRequirement.primary_offering,
            logo_url: competitorData.logo_url || scraped.logo_url || null,
            website_url: urlToProcess,
          },
        };

        // Save competitor details
        await prisma.competitor_details.create({
          data: {
            competitor_id,
            website_id,
            name: competitorName,
            competitor_website_url: urlToProcess,
            industry: competitorData.industry || userRequirement.industry,
            primary_offering: competitorData.primary_offering || userRequirement.primary_offering,
            usp: competitorData.usp || 'No clear USP identified',
          },
        });

        competitorResults.push(competitorResult);
        processedUrls.add(urlToProcess);
        processedNames.add(competitorName);
      } catch (err) {
        console.error(`Failed processing competitor ${urlToProcess}: ${err instanceof Error ? err.message : err}`);
        continue;
      }
    }
  };

  // Fetch additional competitors from LLM if needed
  const fetchLlmCompetitors = async () => {
    if (competitorResults.length < MIN_COMPETITORS) {
      const remainingNeeded = MIN_COMPETITORS - competitorResults.length;
      console.log(`Fetching ${remainingNeeded + 3} additional competitors from LLM to select ${remainingNeeded}`);
      const aiResponse = await fetchCompetitorsFromLLM(
        scrapedMain,
        userRequirement,
        remainingNeeded + 3, // Fetch extra to account for potential invalid URLs
        Array.from(processedUrls),
        Array.from(processedNames)
      );

      // Save AI response
      await prisma.website_scraped_data.update({
        where: { website_id },
        data: { ai_response: aiResponse },
      });

      const parsedCompetitors: LlmCompetitor[] = parseCompetitorData(aiResponse);
      for (const comp of parsedCompetitors) {
        if (competitorResults.length >= MIN_COMPETITORS) break;

        const url = comp.website_url || '';
        const name = comp.name || `Competitor ${competitorResults.length + 1}`;

        if (processedUrls.has(url) || processedNames.has(name)) {
          console.log(`Skipping duplicate LLM-generated competitor: ${name} (${url})`);
          continue;
        }

        const { isValid, preferredUrl } = await isValidCompetitorUrl(url);
        if (!isValid && url) {
          console.log(`Skipping invalid LLM-generated competitor URL: ${url}`);
          continue;
        }

        const urlToProcess = preferredUrl || url || '';
        if (url && processedUrls.has(urlToProcess)) {
          console.log(`Skipping duplicate LLM-generated URL: ${urlToProcess}`);
          continue;
        }

        const competitor_id = uuidv4();
        const competitorResult: ProcessedResult = {
          brand_profile: {
            title: name,
            industry: comp.industry || userRequirement.industry,
            unique_selling_point: comp.usp || 'No clear USP identified',
            primary_offering: comp.primary_offering || userRequirement.primary_offering,
            website_url: urlToProcess,
            logo_url: null, // LLM competitors may not have logo_url
          },
        };

        // Save competitor details
        await prisma.competitor_details.create({
          data: {
            competitor_id,
            website_id,
            name,
            competitor_website_url: urlToProcess,
            industry: comp.industry || userRequirement.industry,
            primary_offering: comp.primary_offering || userRequirement.primary_offering,
            usp: comp.usp || 'No clear USP identified',
          },
        });

        competitorResults.push(competitorResult);
        if (url) processedUrls.add(urlToProcess);
        processedNames.add(name);
      }
    }
  };

  // Execute the competitor processing steps sequentially
  await processDbCompetitors();
  await fetchLlmCompetitors();

  // Ensure exactly MIN_COMPETITORS competitors
  if (competitorResults.length < MIN_COMPETITORS) {
    console.warn(`Could not find ${MIN_COMPETITORS} valid competitors. Returning ${competitorResults.length} competitors.`);
  }

  // Construct labeled results
  const labeledResults: Record<string, any> = {
    mainWebsite: {
      brand_profile: {
        title: scrapedMain?.page_title ?? 'Unknown',
        industry: userRequirement.industry,
        unique_selling_point: userRequirement.USP,
        primary_offering: userRequirement.primary_offering,
        logo_url: scrapedMain?.logo_url || null,
        website_url: website_url,
      },
    },
  };

  competitorResults.slice(0, MIN_COMPETITORS).forEach((result, idx) => {
    labeledResults[`competitor${idx + 1}`] = result;
    console.log(`Added competitor${idx + 1} with title: ${result.brand_profile.website_url}`);
  });

  // Save results to database
  await prisma.llm_responses.upsert({
    where: { website_id },
    update: {
      dashboard3_competi_camparison: JSON.stringify(labeledResults),
    },
    create: {
      website_id,
      dashboard3_competi_camparison: JSON.stringify(labeledResults),
    },
  });

  console.log('Returning labeled results');
  return labeledResults;
}

static async seo_audit(user_id: string, website_id: string): Promise<SeoAuditResponse> {
  if (!website_id || !user_id) {
    throw new Error('website_id and user_id are required');
  }

  console.log(`Fetching SEO audit data for user_id ${user_id}, website_id: ${website_id}`);

  // Fetch main website URL
  const main_website_url = await getWebsiteUrlById(user_id, website_id);
  if (!main_website_url) {
    throw new Error(`No website URL found for user_id: ${user_id} and website_id: ${website_id}`);
  }
  console.log('Main website URL retrieved:', main_website_url);

  // Fetch main website data, competitors, and geo_llm in parallel
  const [main_website_scrapeddata, competitors, geollm] = await Promise.all([
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
        ctr_loss_percent:true
      },
    }),
    prisma.competitor_details.findMany({
      where: { website_id },
      take: 3,
      select: {
        competitor_id: true,
        name: true,
        competitor_website_url: true,
      },
    }),
    prisma.llm_responses.findUnique({
      where: { website_id },
      select: { geo_llm: true },
    }),
  ]);

  // Handle AI_Discoverability with geo_llm
  let AI_Discoverability: any;
  if (!geollm || geollm.geo_llm === null) {
    console.log('No geo_llm response found');
    AI_Discoverability = await fetchBrands(user_id, website_id);
    await prisma.analysis_status.upsert({
      where: {
        user_id_website_id: {
          user_id: user_id ?? '',
          website_id: website_id,
        },
      },
      update: { geo_llm: AI_Discoverability },
      create: {
        user_id: user_id ?? '',
        website_id: website_id,
        geo_llm: AI_Discoverability,
      },
    });
  } else {
    AI_Discoverability = geollm.geo_llm;
    console.log('geo_llm found');
  }

  // Initialize response
  const response: SeoAuditResponse = {
    competitors: {
      mainWebsite: { seo_audit: {} as SeoAudit, brand_profile: { logo_url: null, ctr_loss_percent: null }},// Placeholder
    },
  };

  // Construct main website SEO audit and brand profile
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

    const main_seo_audit: SeoAudit = {
      // logo_url:main_website_scrapeddata.logo_url,
      h1_heading: main_h1_heading,
      meta_title: main_website_scrapeddata.page_title || null,
      meta_description: main_website_scrapeddata.meta_description || null,
      alt_text_coverage: main_website_scrapeddata.homepage_alt_text_coverage,
      isCrawlable: main_website_scrapeddata.isCrawlable || false,
      headingAnalysis: main_website_scrapeddata.headingAnalysis as SeoAudit['headingAnalysis'],      schema_markup_status: main_schema_markup_status,
      AI_Discoverability,

    };

    const main_brand_profile: BrandProfile_logo = {
  logo_url: main_website_scrapeddata.logo_url || null,
  ctr_loss_percent: typeof main_website_scrapeddata.ctr_loss_percent === 'string'
    ? JSON.parse(main_website_scrapeddata.ctr_loss_percent)
    : main_website_scrapeddata.ctr_loss_percent || null,
};

    response.competitors.mainWebsite = {
      seo_audit: main_seo_audit,
      brand_profile: main_brand_profile,
    };
    console.log(`Added main website to SEO audit: ${main_website_url}`);
  } else {
    console.warn(`No scraped data found for main website_id: ${website_id}`);
    response.competitors.mainWebsite = {
      seo_audit: {
        h1_heading: null,
        meta_title: null,
        meta_description: null,
        alt_text_coverage: null,
        isCrawlable: false,
        headingAnalysis: null,
        schema_markup_status: null,
        // logo_url:null,
        AI_Discoverability: 'false',
      },
      brand_profile: {
        logo_url: null,
        ctr_loss_percent:null
        
      },
    };
  }

  // If no competitors, return main website result
  if (!competitors || competitors.length === 0) {
    console.warn(`No competitors found for website_id: ${website_id}`);
    console.log('Competitors identification complete');
    // console.log('Response structure:', JSON.stringify(response, null, 2));
    return response;
  }

  const processedNames = new Set<string>();
  let competitorIndex = 1;

  // Process competitors in parallel
  const scrapePromises = competitors.map(async (competitor) => {
    const { competitor_id, name, competitor_website_url } = competitor;

    if (!competitor_website_url) {
      console.log(`Skipping competitor ${competitor_id} due to missing URL`);
      return;
    }

    const urlToProcess = competitor_website_url;
    const competitorName = name || urlToProcess;

    if (processedNames.has(competitorName)) {
      console.log(`Skipping duplicate competitor name: ${competitorName} (${urlToProcess})`);
      return;
    }

    try {
      console.log(`Scraping competitor URL: ${urlToProcess}`);
      const scraped = await scrapeWebsiteCompetitors(urlToProcess);

      // Check if scrapeWebsiteCompetitors returned an error (string)
      if (typeof scraped === 'string') {
        throw new Error(`Scrape failed for ${urlToProcess}: ${scraped}`);
      }

      // Extract H1 heading from competitor's raw_html
      const h1_heading = scraped.raw_html ? await extractH1(scraped.raw_html) || null : null;

      // Construct schema_markup_status
      const schema_markup_status: SchemaMarkupStatus = {
        url: urlToProcess,
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

      // Construct seo_audit object
      const seo_audit: SeoAudit = {
        h1_heading: h1_heading || null,
        meta_title: scraped.page_title || null,
        meta_description: scraped.meta_description || null,
        alt_text_coverage: scraped.homepage_alt_text_coverage,
        isCrawlable: scraped.isCrawlable || false,
        headingAnalysis: scraped.headingAnalysis || null,
        schema_markup_status,
        AI_Discoverability: 'true',
        // logo_url:scraped.logo_url||null
      };

      const brand_profile: BrandProfile_logo = {
        logo_url: scraped.logo_url || null,
        ctr_loss_percent:scraped.ctr_loss_percent||null
      };

      console.log(`Upserting competitor data for ${competitor_id}`);
      const upsertedData = await prisma.competitor_data.upsert({
        where: { competitor_id },
        update: {
          ...scraped,
          schema_analysis: scraped.schema_analysis && typeof scraped.schema_analysis === 'object'
            ? JSON.stringify(scraped.schema_analysis)
            : scraped.schema_analysis,
          updated_at: new Date(),
          website_url: scraped.website_url || urlToProcess,
        },
        create: {
          competitor_id,
          website_id,
          ...scraped,
          schema_analysis: scraped.schema_analysis && typeof scraped.schema_analysis === 'object'
            ? JSON.stringify(scraped.schema_analysis)
            : scraped.schema_analysis,
          website_url: scraped.website_url || urlToProcess,
        },
      });

      processedNames.add(competitorName);
      response.competitors[`competitor${competitorIndex}`] = {
        seo_audit,
        brand_profile,
      };
      competitorIndex++;
      console.log(`Successfully added competitor: ${competitorName} (${urlToProcess})`);
    } catch (err) {
      console.error(`Failed processing competitor ${urlToProcess}: ${err instanceof Error ? err.message : err}`);
    }
  });

  await Promise.all(scrapePromises);

  if (Object.keys(response.competitors).length === 1) {
    console.warn('No competitors were successfully processed, returning only main website data');
  } else {
    console.log(`Successfully processed ${Object.keys(response.competitors).length - 1} competitors`);
  }

  console.log('Competitors seo_audit complete');
  console.log('Response structure:', JSON.stringify(response, null, 2));
  return response;
}



static async website_audit(user_id: string, website_id: string) {
  if (!website_id || !user_id) {
    throw new Error('website_id and user_id are required');
  }

  console.log(`Fetching website URL for user_id ${user_id}, website_id: ${website_id}`);
  const website_url = await getWebsiteUrlById(user_id, website_id);
  if (!website_url) {
    throw new Error(`No website URL found for user_id: ${user_id} and website_id: ${website_id}`);
  }
  console.log('Website URL retrieved:', website_url);

  console.log(`Fetching PageSpeed data for main website: ${website_url}`);
  const mainPageSpeedData: PageSpeedData | null = await getPageSpeedData(website_url);

  let mainWebsitePageSpeed: {
    website_id: string;
    created_at: Date;
    updated_at: Date;
    website_analysis_id: string;
    performance_score: number | null;
    seo_score: number | null;
    accessibility_score: number | null;
    best_practices_score: number | null;
    first_contentful_paint: string | null;
    largest_contentful_paint: string | null;
    total_blocking_time: string | null;
    speed_index: string | null;
    cumulative_layout_shift: string | null;
    time_to_interactive: string | null;
    audit_details: any;
    revenue_loss_percent: number | null;
  } | null = null;


  const [userRequirements, websiteScraped] = await Promise.all([
  prisma.user_requirements.findFirst({ where: { website_id } }),
  prisma.website_scraped_data.findFirst({ where: { website_id } }),
]);
  if (mainPageSpeedData) {
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
        best_practices_score: mainPageSpeedData.categories?.["best_practices"] ?? null,

        first_contentful_paint: getAuditValue("first-contentful-paint"),
        largest_contentful_paint: getAuditValue("largest-contentful-paint"),
        total_blocking_time: getAuditValue("total-blocking-time"),
        speed_index: getAuditValue("speed-index"),
        cumulative_layout_shift: getAuditValue("cumulative-layout-shift"),
        time_to_interactive: getAuditValue("interactive"),

        audit_details: {
          allAudits: mainPageSpeedData.audit_details.allAudits,
          optimization_opportunities: mainPageSpeedData.audit_details.optimization_opportunities,
          user_access_readiness: mainPageSpeedData.audit_details.user_access_readiness,
          seoAudits: mainPageSpeedData.audit_details.seoAudits,
        },

        revenue_loss_percent: mainPageSpeedData.revenueLossPercent ?? null,
      },
    });
    console.log(`Main website revenueLossPercent: ${mainPageSpeedData.revenueLossPercent}`);
  } else {
    console.log(`No PageSpeed data retrieved for ${website_url}`);
  }

 
  const competitors = await prisma.competitor_details.findMany({
    where: { website_id },
    take: 3,
  });


  const competitors_data = await prisma.competitor_data.findMany({
    where: { website_id },
    take: 3,
  });
 
  type CompetitorResult = {
    brand_profile: {
      title?: string;
      website_url: string;
      revenueLossPercent?: number | null;
      unique_selling_point?:string |null ;
      primary_offering?:string | null;
      logo_url?:string | null
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
      brandAuditseo?: any;
    };
  };

  const competitorResults: CompetitorResult[] = [];
  const processedUrls = new Set<string>([website_url]);

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
  const competitorDataMap = new Map(
  competitors_data.map((item) => [item.competitor_id, item])
);

  const competitorPromises = competitors.map(async (competitor) => {
    const { competitor_id, name, competitor_website_url,usp,primary_offering, } = competitor;

  


    if (!competitor_website_url) {
      console.log(`Skipping competitor ${competitor_id} due to missing URL`);
      return;
    }

    const urlToProcess = competitor_website_url;
    const competitorName = name || urlToProcess;

    if (processedUrls.has(urlToProcess)) {
      console.log(`Skipping competitor ${competitor_id} due to duplicate URL: ${urlToProcess}`);
      return;
    }

    try {
      console.log(`Fetching PageSpeed data for ${urlToProcess}`);
      const pageSpeedData: PageSpeedData | null = await getPageSpeedData(urlToProcess);

      if (pageSpeedData && isValidPageSpeedData(pageSpeedData)) {
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
        // console.log(`Competitor ${competitorName} revenueLossPercent: ${revenueLossPercent}, URL: ${urlToProcess}`);
        competitorResults.push({
          brand_profile: {
            title: competitorName,
            website_url: urlToProcess,
            revenueLossPercent: revenueLossPercent || null,
            logo_url: competitorDataMap.get(competitor_id)?.logo_url ?? null,
            primary_offering:primary_offering || null,
            unique_selling_point:usp || null
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
          // seo_audit:
          //  {
          //   brandAuditseo: audit_details?.seoAudits && Array.isArray(audit_details.seoAudits)
          //     ? processSeoAudits(audit_details.seoAudits)
          //     : null,
          // },

          seo_audit: {
          brandAuditseo: audit_details?.seoAudits && Array.isArray(audit_details.seoAudits)
            ? processSeoAudits(audit_details.seoAudits)
            : null,
          ...(competitorDataMap.get(competitor_id) && {
            meta_description: competitorDataMap.get(competitor_id)?.meta_description ?? null,
            page_title: competitorDataMap.get(competitor_id)?.page_title ?? null,
            schema_analysis: competitorDataMap.get(competitor_id)?.schema_analysis ?? null,
            isCrawlable: competitorDataMap.get(competitor_id)?.isCrawlable ?? null,
            headingAnalysis: competitorDataMap.get(competitor_id)?.headingAnalysis ?? null,
            homepage_alt_text_coverage: competitorDataMap.get(competitor_id)?.homepage_alt_text_coverage ?? null,
            // raw_html: competitorDataMap.get(competitor_id)?.raw_html ?? null,
            h1_heading: h1_heading || null,
          }),
        },

        });

        processedUrls.add(urlToProcess);
      } else {
        console.log(`No valid PageSpeed data retrieved for ${urlToProcess}`);
      }
    } catch (err) {
      console.error(`Failed processing PageSpeed data for ${urlToProcess}: ${err instanceof Error ? err.message : err}`);
    }
  });

  await Promise.all(competitorPromises);
 
 

  const mainH1Heading = await extractH1(websiteScraped?.raw_html ?? null);
  const labeledResults: Record<string, any> = {
    main_website: mainPageSpeedData && isValidPageSpeedData(mainPageSpeedData) ? {
      brand_profile: {
      title: website_url,
      website_url: website_url,
      revenueLossPercent: mainPageSpeedData.revenueLossPercent || null,
      unique_selling_point: userRequirements?.USP || null,
      primary_offering: userRequirements?.primary_offering || null,
      logo_url: websiteScraped?.logo_url || null,
      ctr_loss_percent:websiteScraped?.ctr_loss_percent ||null
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
      brandAuditseo: mainPageSpeedData.audit_details?.seoAudits && Array.isArray(mainPageSpeedData.audit_details.seoAudits)
        ? processSeoAudits(mainPageSpeedData.audit_details.seoAudits)
        : null,
      meta_description: websiteScraped?.meta_description || null,
      page_title: websiteScraped?.page_title || null,
      schema_analysis: websiteScraped?.schema_analysis || null,
      isCrawlable: websiteScraped?.isCrawlable || null,
      headingAnalysis: websiteScraped?.headingAnalysis || null,
      homepage_alt_text_coverage: websiteScraped?.homepage_alt_text_coverage || null,
      // raw_html: websiteScraped?.raw_html || null,
      h1_heading: mainH1Heading || null, // ✅ Add this line

      
    },
    } : null,
  };

  competitorResults.forEach((result, idx) => {
    labeledResults[`competitor${idx + 1}`] = {
      brand_profile: {
        title: result.brand_profile.title,
        website_url: result.brand_profile.website_url,
        revenueLossPercent: result.brand_profile.revenueLossPercent,
        unique_selling_point:result.brand_profile.unique_selling_point,
      },
      website_audit: {
        performance_insights: result.website_audit.performance_insights,
        website_health_matrix: result.website_audit.website_health_matrix,
      },
      seo_audit: result.seo_audit,
    };
    console.log(`Added competitor${idx + 1} with title: ${result.brand_profile.title}, revenueLossPercent: ${result.brand_profile.revenueLossPercent}`);
  });

  await prisma.llm_responses.upsert({
    where: { website_id },
    update: {
      dashboard3_competi_camparison: JSON.stringify(labeledResults),
    },
    create: {
      website_id,
      dashboard3_competi_camparison: JSON.stringify(labeledResults),
    },
  });

  // console.log('Returning labeled results');
  return labeledResults;
}




static async getComparisonRecommendations(website_id: string) {
    if (!website_id) {
      throw new Error('website_id is required');
    } else console.log("website id get ", website_id);

    const mainWebsite = await prisma.user_websites.findUnique({

      where: { website_id },
      include: {
        website_scraped_data: true,
        brand_website_analysis: {
          orderBy: { created_at: 'desc' },
          take: 1,
        }
      },
    });

    if (!mainWebsite) {
      throw new Error('Website not found');
    }

    // Fetch user requirements for use in the prompt
    const userRequirementRaw = await prisma.user_requirements.findFirst({
      where: { website_id },
    });

    // const competitors = await prisma.competitor_details.findMany({
    //   where: { website_id },
    //   include: {
    //     competitor_data: true,
    //   },
    // });

    
    // console.log("competitors data", comps);
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
  // console.log("parsed",parsed)
  await prisma.llm_responses.upsert({
      where: { website_id },
      update: {
        recommendation_by_mo_dashboard3: JSON.stringify(parsed),
      },
      create: {
        website_id,
        recommendation_by_mo_dashboard3: JSON.stringify(parsed),
      },
    });
   await prisma.analysis_status.upsert({
      where: {
        user_id_website_id: {
          user_id: userRequirementRaw?.user_id ?? '',
          website_id: website_id,
        },
      },
      update: {
        recommendation_by_mo3: "true",
      },
      create: {
        website_id: website_id,
        user_id: userRequirementRaw?.user_id ?? '', // Provide the correct user_id here
        recommendation_by_mo3: "true",
      },
    });
    console.log("LLM response saved successfully for website_id:", website_id);
} catch (err) {
  console.error("Error parsing JSON response:", err);
  parsed = { recommendations: [] }; // fail-safe fallback
}

return parsed;
  }
}

