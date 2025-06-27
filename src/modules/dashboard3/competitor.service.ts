import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { scrapeWebsitecompetitos } from './scraper';
import { fetchCompetitorsFromLLM, extractCompetitorDataFromLLM, createComparisonPrompt } from './llm';
import { parseCompetitorData } from './parser';
import { getPageSpeedData } from './pagespeed';
import OpenAI from 'openai';
import 'dotenv/config';
import * as cheerio from "cheerio";

import axios from 'axios';


export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
const model = process.env.OPENAI_MODEL || 'gpt-4.1';

const prisma = new PrismaClient();



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



export class CompetitorService {
  // Helper function to validate URLs (retained for other parts of the code)
  static async isValidCompetitorUrl(url: string, competitorName?: string): Promise<boolean> {
    try {
      new URL(url);
      if (!/^https?:\/\//.test(url)) return false;
    } catch {
      return false;
    }

    const blocklist = [
      'facebook.com',
      'twitter.com',
      'google.com',
      'youtube.com',
      'instagram.com',
      'linkedin.com',
      'tiktok.com',
      'example.com',
      'nonexistent.com',
    ];

    const { hostname } = new URL(url);
    if (blocklist.some(blocked => hostname.includes(blocked))) {
      console.log(`URL ${url} is in blocklist`);
      return false;
    }

    if (competitorName) {
      const normalizedName = competitorName.toLowerCase().replace(/\s+/g, '');
      if (!hostname.toLowerCase().includes(normalizedName)) {
        console.log(`URL ${url} does not match competitor name ${competitorName}`);
        return false;
      }
    }

    try {
      const response = await axios.head(url, { timeout: 5000 });
      return response.status >= 200 && response.status < 400;
    } catch (err) {
      console.log(`URL ${url} is inaccessible: ${err instanceof Error ? err.message : err}`);
      return false;
    }
  }

  // Helper function to extract H1
  static extractH1(rawHtml: string | null): string {
    if (!rawHtml) return 'Not Found';
    const $ = cheerio.load(rawHtml);
    return $('h1').first().text().trim() || 'Not Found';
  }

  static async process(website_id: string, user_id: string) {
    if (!website_id || !user_id) {
      throw new Error('website_id and user_id are required');
    }

    console.log(`Getting website URL for user_id ${user_id}, website_id: ${website_id}`);
    const website_url = await getWebsiteUrlById(user_id, website_id);
    if (!website_url) {
      throw new Error(`No website URL found for user_id: ${user_id} and website_id: ${website_id}`);
    }
    console.log('Website URL retrieved:', website_url);

    const [scrapedMain, analysis] = await Promise.all([
      prisma.website_scraped_data.findUnique({ where: { website_id } }),
      prisma.brand_website_analysis.findFirst({
        where: { website_id },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    // Extract H1
    const h1Text = this.extractH1(scrapedMain?.raw_html ?? null);

    // Fetch and save PageSpeed data if it doesn't exist
    if (!analysis?.performance_score) {
      console.log(`Fetching PageSpeed data for ${website_url}`);
      const pageSpeed = await getPageSpeedData(website_url);
      if (pageSpeed) {
        await prisma.brand_website_analysis.create({
          data: {
            website_id,
            performance_score: pageSpeed.categories.performance || null,
            seo_score: pageSpeed.categories.seo || null,
            accessibility_score: pageSpeed.categories.accessibility || null,
            best_practices_score: pageSpeed.categories.best_practices || null,
            first_contentful_paint: pageSpeed.audits?.first_contentful_paint?.display_value || null,
            largest_contentful_paint: pageSpeed.audits?.largest_contentful_paint?.display_value || null,
            total_blocking_time: pageSpeed.audits?.total_blocking_time?.display_value || null,
            speed_index: pageSpeed.audits?.speed_index?.display_value || null,
            cumulative_layout_shift: pageSpeed.audits?.cumulative_layout_shift?.display_value || null,
            time_to_interactive: pageSpeed.audits?.interactive?.display_value || null,
          },
        });
      }
    } else {
      console.log(`PageSpeed data already exists for ${website_url}`);
    }

    const userRequirementRaw = await prisma.user_requirements.findFirst({
      where: { website_id },
    });

    const userRequirement = {
      industry: userRequirementRaw?.industry ?? 'Unknown',
      region_of_operation: userRequirementRaw?.region_of_operation ?? 'Unknown',
      target_location: userRequirementRaw?.target_location ?? 'Unknown',
      target_audience: userRequirementRaw?.target_audience ?? 'Unknown',
      primary_offering: userRequirementRaw?.primary_offering ?? 'Unknown',
      USP: userRequirementRaw?.USP ?? 'Unknown',
      competitor_urls: userRequirementRaw?.competitor_urls ?? '',
    };

    const competitorUrls: string[] = userRequirement.competitor_urls
      ? userRequirement.competitor_urls.split(',').map(u => u.trim()).filter(Boolean)
      : [];

    const competitorResults = [];
    const processedUrls = new Set<string>();
    const processedNames = new Set<string>();

    // Process user-provided competitor URLs
    const competitorPromises = competitorUrls.filter(u => u.startsWith('http')).map(async (compUrl) => {
      try {
        const scraped = await scrapeWebsitecompetitos(compUrl);
        if (!scraped || typeof scraped !== 'object') throw new Error('Scrape failed');

        const competitorData = await extractCompetitorDataFromLLM(scraped);
        if (!competitorData) throw new Error('LLM parsing failed');

        const competitorName = competitorData.name || scraped.page_title || compUrl;



        if (processedUrls.has(compUrl) || processedNames.has(competitorName)) {
          console.log(`Skipping duplicate competitor: ${competitorName} (${compUrl})`);
          return null;
        }

        const competitor_id = uuidv4();
        const savedCompetitor = await prisma.competitor_details.create({
          data: {
            competitor_id,
            website_id,
            name: competitorName,
            competitor_website_url: compUrl,
            industry: competitorData.industry || userRequirement.industry || 'Unknown',
            region: competitorData.region || userRequirement.region_of_operation || 'Unknown',
            target_audience: competitorData.target_audience || userRequirement.target_audience || 'Unknown',
            primary_offering: competitorData.primary_offering || userRequirement.primary_offering || 'Unknown',
            usp: competitorData.usp || 'No clear USP identified',
          },
        });

        await prisma.competitor_data.upsert({
          where: { competitor_id },
          update: { ...scraped, updated_at: new Date() },
          create: {
            competitor_id,
            website_id,
            ...scraped,
            website_url: scraped.website_url ?? compUrl,
          },
        });

        const pageSpeedData = await getPageSpeedData(compUrl);
        if (pageSpeedData) {
          await prisma.competitor_data.update({
            where: { competitor_id },
            data: { page_speed: pageSpeedData },
          });
        }

        const h1_Text = (typeof scraped === 'object' && scraped !== null && 'raw_html' in scraped && scraped.raw_html)
          ? cheerio.load(scraped.raw_html)('h1').first().text().trim() || null
          : null;

        processedUrls.add(compUrl);
        processedNames.add(competitorName);

        return {
          ...savedCompetitor,
          website_health: pageSpeedData || null,
          website_scraped_data: {
            h1_tag: h1_Text,
            page_title: typeof scraped === 'object' && scraped !== null ? scraped.page_title : null,
            meta_description: typeof scraped === 'object' && scraped !== null ? scraped.meta_description : null,
            og_description: typeof scraped === 'object' && scraped !== null ? scraped.og_description : null,
            og_title: typeof scraped === 'object' && scraped !== null ? scraped.og_title : null,
            og_image: typeof scraped === 'object' && scraped !== null ? scraped.og_image : null,
            facebook_handle: typeof scraped === 'object' && scraped !== null ? scraped.facebook_handle : null,
            twitter_handle: typeof scraped === 'object' && scraped !== null ? scraped.twitter_handle : null,
            tiktok_handle: typeof scraped === 'object' && scraped !== null ? scraped.tiktok_handle : null,
            youtube_handle: typeof scraped === 'object' && scraped !== null ? scraped.youtube_handle : null,
            linkedin_handle: typeof scraped === 'object' && scraped !== null ? scraped.linkedin_handle : null,
            instagram_handle: typeof scraped === 'object' && scraped !== null ? scraped.instagram_handle : null,
          },
        };
      } catch (err) {
        console.error(`Failed processing competitor ${compUrl}: ${err instanceof Error ? err.message : err}`);
        return null;
      }
    });

    const results = await Promise.allSettled(competitorPromises);
    for (const res of results) {
      if (res.status === 'fulfilled' && res.value) {
        competitorResults.push(res.value);
      }
    }

    // Ensure at least 3 unique, valid competitors
    const MIN_COMPETITORS = 3;
    const MAX_RETRIES = 3;
    let retryCount = 0;

    while (competitorResults.length < MIN_COMPETITORS && retryCount < MAX_RETRIES) {
      try {
        const competitorsToGenerate = 6; // Fetch 6 to ensure enough valid ones
        console.log(`Fetching ${competitorsToGenerate} additional competitors (Retry ${retryCount + 1})`);

        const aiResponse = await fetchCompetitorsFromLLM(
          scrapedMain,
          userRequirement,
          competitorsToGenerate,
          Array.from(processedUrls),
          Array.from(processedNames)
        );

        await prisma.website_scraped_data.update({
          where: { website_id },
          data: { ai_response: aiResponse },
        });

        const parsedCompetitors = parseCompetitorData(aiResponse);
        // Define a type for parsed competitor objects
        interface ParsedCompetitor {
          website_url: string;
          name: string;
          industry?: string;
          region?: string;
          target_audience?: string;
          primary_offering?: string;
          usp?: string;
        }

        for (const comp of parsedCompetitors.slice(0, MIN_COMPETITORS - competitorResults.length) as ParsedCompetitor[]) {
          const url: string = (comp as ParsedCompetitor).website_url;
          const name = (comp as ParsedCompetitor).name;

          if (processedUrls.has(url) || processedNames.has(name) || competitorUrls.includes(url) || competitorResults.some(r => r.competitor_website_url === url || r.name === name)) {
            console.log(`Skipping duplicate competitor: ${name} (${url})`);
            continue;
          }

          try {
            const competitor_id = uuidv4();
            const savedCompetitor: any = await prisma.competitor_details.create({
              data: {
                competitor_id,
                website_id,
                name,
                competitor_website_url: url,
                industry: (comp as ParsedCompetitor).industry,
                region: (comp as ParsedCompetitor).region,
                target_audience: (comp as ParsedCompetitor).target_audience,
                primary_offering: (comp as ParsedCompetitor).primary_offering,
                usp: (comp as ParsedCompetitor).usp,
              },
            });

            const scraped = await scrapeWebsitecompetitos(url);
            if (scraped) {
              await prisma.competitor_data.upsert({
                where: { competitor_id },
                update: { ...(typeof scraped === 'object' && scraped !== null ? scraped : {}), updated_at: new Date() },
                create: {
                  competitor_id,
                  website_id,
                  ...(typeof scraped === 'object' && scraped !== null ? scraped : {}),
                  website_url: (typeof scraped === 'object' && scraped !== null && 'website_url' in scraped) ? scraped.website_url : url,
                },
              });

              const pageSpeedData = await getPageSpeedData(url);
              if (pageSpeedData) {
                await prisma.competitor_data.update({
                  where: { competitor_id },
                  data: { page_speed: pageSpeedData },
                });
              }

              const h1_Text = (typeof scraped === 'object' && scraped !== null && 'raw_html' in scraped && scraped.raw_html)
                ? cheerio.load(scraped.raw_html)('h1').first().text().trim() || null
                : null;

              const competitorResult = {
                ...savedCompetitor,
                website_health: pageSpeedData || null,
                website_scraped_data: {
                  h1_tag: h1_Text,
                  page_title: typeof scraped === 'object' && scraped !== null ? scraped.page_title : null,
                  meta_description: typeof scraped === 'object' && scraped !== null ? scraped.meta_description : null,
                  og_description: typeof scraped === 'object' && scraped !== null ? scraped.og_description : null,
                  og_title: typeof scraped === 'object' && scraped !== null ? scraped.og_title : null,
                  og_image: typeof scraped === 'object' && scraped !== null ? scraped.og_image : null,
                  facebook_handle: typeof scraped === 'object' && scraped !== null ? scraped.facebook_handle : null,
                  twitter_handle: typeof scraped === 'object' && scraped !== null ? scraped.twitter_handle : null,
                  tiktok_handle: typeof scraped === 'object' && scraped !== null ? scraped.tiktok_handle : null,
                  youtube_handle: typeof scraped === 'object' && scraped !== null ? scraped.youtube_handle : null,
                  linkedin_handle: typeof scraped === 'object' && scraped !== null ? scraped.linkedin_handle : null,
                  instagram_handle: typeof scraped === 'object' && scraped !== null ? scraped.instagram_handle : null,
                },
              };

              competitorResults.push(competitorResult);
              processedUrls.add(url);
              processedNames.add(name);
            }
          } catch (err) {
            console.error(`AI fallback competitor error for ${url}: ${err instanceof Error ? err.message : err}`);
          }
        }

        retryCount++;
        if (competitorResults.length < MIN_COMPETITORS && retryCount >= MAX_RETRIES) {
          console.warn(`Could not find ${MIN_COMPETITORS} unique, valid competitors after ${MAX_RETRIES} retries. Returning ${competitorResults.length} competitors.`);
        }
      } catch (err) {
        console.error(`Error during AI fallback competitor fetch (Retry ${retryCount + 1}): ${err instanceof Error ? err.message : err}`);
        retryCount++;
      }
    }

    const labeledResults: Record<string, any> = {};
    competitorResults.forEach((result, idx) => {
      labeledResults[`competitor${idx + 1}`] = result;
    });

    const brandWebsiteAnalysis = await prisma.brand_website_analysis.findFirst({
      where: { website_id },
      orderBy: { created_at: 'desc' },
    });

    const { raw_html, other_links, ctr_loss_percent, schema_analysis, sitemap_pages, ...scrapedMainWithoutRawHtml } = scrapedMain ?? {};

    labeledResults['mainWebsite'] = {
      h1_tag: h1Text,
      website: scrapedMainWithoutRawHtml,
      brandWebsiteAnalysis: brandWebsiteAnalysis ?? null,
    };



    return labeledResults;
  }


  static async getComparisonRecommendations(website_id: string) {
    if (!website_id) {
      throw new Error('website_id is required');
    } else (console.log("website id get ", website_id));

    const mainWebsite = await prisma.user_websites.findUnique({

      where: { website_id },
      include: {
        website_scraped_data: true,
        brand_website_analysis: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });

    if (!mainWebsite) {
      throw new Error('Website not found');
    }

    // Fetch user requirements for use in the prompt
    const userRequirementRaw = await prisma.user_requirements.findFirst({
      where: { website_id },
    });

    const competitors = await prisma.competitor_details.findMany({
      where: { website_id },
      include: {
        competitor_data: true,
      },
    });

    const main = {
      website_url: mainWebsite.website_url,
      meta: {
        title: mainWebsite.website_scraped_data?.page_title || 'N/A',
        meta_keywords: mainWebsite.website_scraped_data?.meta_keywords || 'N/A',
        meta_description: mainWebsite.website_scraped_data?.meta_description || 'N/A',
        og_description: mainWebsite.website_scraped_data?.og_description || 'N/A',
        facebook_handle: mainWebsite.website_scraped_data?.facebook_handle || 'N/A',
        twitter_handle: mainWebsite.website_scraped_data?.twitter_handle || 'N/A',
        youtube_handle: mainWebsite.website_scraped_data?.youtube_handle || 'N/A',
        instagram_handle: mainWebsite.website_scraped_data?.instagram_handle || 'N/A',
        linkedin_handle: mainWebsite.website_scraped_data?.linkedin_handle || 'N/A',
        tiktok_handle: mainWebsite.website_scraped_data?.tiktok_handle || 'N/A',
        og_title: mainWebsite.website_scraped_data?.og_title || 'N/A',
        og_image: mainWebsite.website_scraped_data?.og_image || 'N/A',

      },
      page_speed: {
        performance_score: mainWebsite.brand_website_analysis?.[0]?.performance_score ?? 'N/A',
        seo_score: mainWebsite.brand_website_analysis?.[0]?.seo_score ?? 'N/A',
        accessibility_score: mainWebsite.brand_website_analysis?.[0]?.accessibility_score ?? 'N/A',
        best_practices_score: mainWebsite.brand_website_analysis?.[0]?.best_practices_score ?? 'N/A',
        time_to_interactive: mainWebsite.brand_website_analysis?.[0]?.time_to_interactive ?? 'N/A',
        speed_index: mainWebsite.brand_website_analysis?.[0]?.speed_index ?? 'N/A',
        largest_contentful_paint: mainWebsite.brand_website_analysis?.[0]?.largest_contentful_paint ?? 'N/A',
        total_blocking_time: mainWebsite.brand_website_analysis?.[0]?.total_blocking_time ?? 'N/A',
        cumulative_layout_shift: mainWebsite.brand_website_analysis?.[0]?.cumulative_layout_shift ?? 'N/A',
        // total_broken_links: mainWebsite.brand_website_analysis?.[0]?.total_broken_links ?? 'N/A',
        // broken_links: mainWebsite.brand_website_analysis?.[0]?.broken_links ?? [],
        // audit_details: mainWebsite.brand_website_analysis?.[0]?.audit_details ?? [],

      },
    };

    console.log("main website data", main);
    const comps = competitors.map(comp => {
      const scraped = comp.competitor_data;
      let ps: any = scraped?.page_speed ?? {};
      if (typeof ps === 'string') {
        try {
          ps = JSON.parse(ps);
        } catch {
          ps = {};
        }
      }
      const audits = ps.audits ?? {};
      const categories = ps.categories ?? {};

      return {
        name: comp.name,
        website_url: comp.competitor_website_url,
        meta: {
          title: scraped?.page_title || 'N/A',
          meta_keywords: scraped?.meta_keywords || 'N/A',
          meta_description: scraped?.meta_description || 'N/A',
          og_description: scraped?.og_description || 'N/A',
          facbook_handler: scraped?.facebook_handle || 'N/A',
          instagram_handler: scraped?.instagram_handle || 'N/A',
          twitter_hanlder: scraped?.twitter_handle || 'N/A',
          youtube_handle: scraped?.youtube_handle || 'N/A',
          instagram_handle: scraped?.instagram_handle || 'N/A',
          linkedin_handle: scraped?.linkedin_handle || 'N/A',
          tiktok_handle: scraped?.tiktok_handle || 'N/A',
          og_title: scraped?.og_title || 'N/A',
          og_image: scraped?.og_image || 'N/A',


        },
        page_speed: {
          performance_score: categories.performance ?? 'N/A',
          seo_score: categories.seo ?? 'N/A',
          accessibility_score: categories.accessibility ?? 'N/A',
          best_practices_score: categories.best_practices ?? 'N/A',
          time_to_interactive: audits.interactive?.display_value ?? 'N/A',
          speed_index: audits.speed_index?.display_value ?? 'N/A',
          largest_contentful_paint: audits.largest_contentful_paint?.display_value ?? 'N/A',
          total_blocking_time: audits.total_blocking_time?.display_value ?? 'N/A',
          cumulative_layout_shift: audits.cumulative_layout_shift?.display_value ?? 'N/A',
        },
      };
    });
    console.log("competitors data", comps);
    const prompt = createComparisonPrompt(main, comps, userRequirementRaw);
    // console.log('Generated prompt for LLM:', prompt);
    if (!prompt) {
      throw new Error('Failed to generate prompt for LLM');
    } else (console.log("prompt updated with data "));
    const response = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: model,
      temperature: 0.7,
      max_tokens: 3000,
    });
    console.log("prompt", prompt)
    if (response.choices.length === 0 || !response.choices[0].message.content) {
      throw new Error('LLM response is empty or invalid');
    } else {
      console.log("LLM response is valid");
    }
    return {
      recommendations: response.choices[0].message.content,
    };
  }

}

