
import axios from 'axios';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';
import { parseCompetitorData } from './parser';
import { openai } from './openai';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export class CompetitorService {
  static async getWebsite(website_url: string, website_id?: string, user_id?: string): Promise<
    (import('@prisma/client').website_scraped_data & {
      competitorDetails: import('@prisma/client').competitor_details[];
    }) | null
  > {
    console.log(`Entering getWebsite: url=${website_url}, website_id=${website_id}, user_id=${user_id}`);
    let websiteIdToUse = website_id;

    // Case 1: website_id is provided
    if (website_id) {
      console.log(`Case 1: website_id provided (${website_id})`);
      const website = await prisma.website_scraped_data.findFirst({
        where: { website_id },
        include: { competitor_details: true },
      });

      if (website) {
        console.log(`Found existing website data for website_id=${website_id}`);
        return { ...website, competitorDetails: website.competitor_details ?? [] };
      }

      console.log(`No data found for website_id=${website_id}`);
      throw new Error(`No scraped data found for website_id: ${website_id}`);
    }

    // Case 2: No website_id provided, create a new one and scrape
    console.log('Case 2: No website_id provided, creating new entry');
    if (!user_id) {
      console.log('No user_id provided');
      throw new Error(`No user_id provided to create a new website entry for URL: ${website_url}`);
    }

    websiteIdToUse = uuidv4();
    console.log(`Generated new website_id: ${websiteIdToUse}`);
    await prisma.user_websites.create({
      data: {
        website_id: websiteIdToUse,
        user_id,
        website_url,
      },
    });
    console.log(`Created user_websites entry for website_id=${websiteIdToUse}`);

    // Scrape the website
    console.log(`Starting scrape for url=${website_url}`);
    const scraped = await this.scrapeWebsite(website_url);
    if (!scraped) {
      console.log(`Scrape failed for url=${website_url}`);
      throw new Error(`Failed to scrape website: ${website_url}`);
    }
    // console.log(`Scrape successful for url=${website_url}`);

    // Save or update scraped data
    // console.log(`Upserting website_scraped_data for website_id=${websiteIdToUse}`);
    const updatedWebsite = await prisma.website_scraped_data.upsert({
      where: { website_id: websiteIdToUse },
      update: {
        website_url: scraped.website_url,
        page_title: scraped.page_title,
        meta_description: scraped.meta_description,
        meta_keywords: scraped.meta_keywords,
        og_title: scraped.og_title,
        og_description: scraped.og_description,
        og_image: scraped.og_image,
        twitter_handle: scraped.twitter_handle,
        facebook_handle: scraped.facebook_handle,
        instagram_handle: scraped.instagram_handle,
        linkedin_handle: scraped.linkedin_handle,
        youtube_handle: scraped.youtube_handle,
        tiktok_handle: scraped.tiktok_handle,
        other_links: scraped.other_links,
        raw_html: scraped.raw_html,
        updated_at: new Date(),
      },
      create: {
        website_id: websiteIdToUse,
        website_url: scraped.website_url,
        page_title: scraped.page_title,
        meta_description: scraped.meta_description,
        meta_keywords: scraped.meta_keywords,
        og_title: scraped.og_title,
        og_description: scraped.og_description,
        og_image: scraped.og_image,
        twitter_handle: scraped.twitter_handle,
        facebook_handle: scraped.facebook_handle,
        instagram_handle: scraped.instagram_handle,
        linkedin_handle: scraped.linkedin_handle,
        youtube_handle: scraped.youtube_handle,
        tiktok_handle: scraped.tiktok_handle,
        other_links: scraped.other_links,
        raw_html: scraped.raw_html,
      },
      include: { competitor_details: true },
    });
    console.log(`Upserted website_scraped_data for website_id=${websiteIdToUse}`);

    return {
      ...updatedWebsite,
      competitorDetails: updatedWebsite.competitor_details ?? [],
    };
  }

  static async fetchFromLLM(
    site: {
      page_title?: string | null;
      meta_description?: string | null;
      meta_keywords?: string | null;
      website_url: string;
      industry?: string | null;
      region_of_operation?: string | null;
      target_location?: string | null;
      target_audience?: string | null;
      primary_offering?: string | null;
      USP?: string | null;
    },
    competitorsToGenerate: number = 4
  ) {
    console.log(`Entering fetchFromLLM: website_url=${site.website_url}, competitorsToGenerate=${competitorsToGenerate}`);
    const prompt = `
You are a market research assistant.

Given the following website metadata and details:

- Title: ${site.page_title ?? 'None'}
- Description: ${site.meta_description ?? 'None'}
- Keywords: ${site.meta_keywords ?? 'None'}
- Website URL: ${site.website_url}

- Industry: ${site.industry ?? 'Unknown'}
- Region of Operation: ${site.region_of_operation ?? 'Unknown'}
- Target Location: ${site.target_location ?? 'Unknown'}
- Target Audience: ${site.target_audience ?? 'Unknown'}
- Primary Offering: ${site.primary_offering ?? 'Unknown'}
- USP: ${site.USP ?? 'Unknown'}

Return a **JSON array** with the **top ${competitorsToGenerate} regional competitors** based on:
- Target audience (demographics, interests, intent)
- Region of operation (must be in the same or relevant local region)

Each competitor must:
- Be a real, active business with a valid, accessible HTTP(S) website (verified to return HTTP 200 status).
- Have a website URL of the primary landing page (e.g., https://example.com/home), not a blog post, article, or subpage.
- Not be a hypothetical or non-existent entity.
- Have a clear unique selling proposition (USP) and primary offering relevant to the website's industry.

Output format:

\`\`\`json
[
  {
    "name": "Competitor Name",
    "website_url": "https://example.com",
    "industry": "Industry/Niche",
    "region": "Region of Operation",
    "target_audience": "Target Audience",
    "primary_offering": "Primary Offering",
    "usp": "Unique Selling Proposition"
  }
]
\`\`\`

If no competitors are found, return an empty array.
`;

    console.log('Sending prompt to LLM');
    const res = await openai.responses.create({
      model: 'gpt-4o',
      input: prompt,
      tools: [
        {
          type: 'web_search_preview',
          search_context_size: 'medium',
        },
      ],
    });

    // console.log('Received LLM response:', res.output_text);
    return res.output_text.trim() || '';
  }

  static async extractdataFroGivencompetitors(scrapedData: any): Promise<{
    name: string;
    industry: string;
    region: string;
    target_audience: string;
    primary_offering: string;
    usp: string;
  } | null> {
    // console.log(`Entering extractdataFroGivencompetitors: website_url=${scrapedData.website_url}`);
    const prompt = `
You are a market research assistant. Given the following scraped website data, identify and return the Unique Selling Proposition (USP) and other relevant details of the competitor. If no clear details are identifiable, return a concise inferred set of details based on the data provided.

Scraped Data:
- Website URL: ${scrapedData.website_url}
- Page Title: ${scrapedData.page_title ?? 'None'}
- Meta Description: ${scrapedData.meta_description ?? 'None'}
- Meta Keywords: ${scrapedData.meta_keywords ?? 'None'}
- OG Title: ${scrapedData.og_title ?? 'None'}
- OG Description: ${scrapedData.og_description ?? 'None'}

Identify and return a JSON object like:
\`\`\`json
{
  "name": "Business Name",
  "industry": "Relevant industry",
  "region": "Region of operation",
  "target_audience": "Target audience",
  "primary_offering": "Primary product/service",
  "usp": "Unique Selling Proposition"
}
\`\`\`
If data is insufficient, return null.
`;

    try {
    //   console.log('Sending prompt to LLM for competitor data extraction');
      const res = await openai.responses.create({
        model: 'gpt-4o',
        input: prompt,
      });

      const output = res.output_text.trim();
    //   console.log(`Received LLM output for competitor data: ${output}`);
      if (!output || output === 'null') {
        console.log('No valid competitor data returned by LLM');
        return null;
      }

      return JSON.parse(output);
    } catch (error) {
      console.error(`Error parsing USP JSON for ${scrapedData.website_url}:`, error);
      return null;
    }
  }

  static async persistAiResponseOnly(websiteId: string, aiResponse: string) {
    // console.log(`Entering persistAiResponseOnly: website_id=${websiteId}`);
    await prisma.website_scraped_data.update({
      where: { website_id: websiteId },
      data: { ai_response: aiResponse },
    });
    // console.log(`Persisted AI response for website_id=${websiteId}`);
  }

  static async scrapeWebsite(url: string) {
    // console.log(`Entering scrapeWebsite: url=${url}`);
    try {
      console.log(`Fetching URL: ${url}`);
      const res = await axios.get(url, { timeout: 10000 });
    //   console.log(`Successfully fetched URL: ${url}`);
      const html = res.data;
      const $ = cheerio.load(html);

      const extractHandle = (platform: string) => {
        const link = $(`a[href*="${platform}.com"]`).attr('href');
        // console.log(`Extracted ${platform} handle: ${link || 'null'}`);
        return link || null;
      };

      const otherLinks = $('a')
        .map((_, el) => $(el).attr('href'))
        .get()
        .filter((href) => href && !href.includes(url))
        .filter((href, index, self) => self.indexOf(href) === index);
    //   console.log(`Extracted ${otherLinks.length} unique other links`);

      const scrapedData = {
        website_url: url,
        page_title: $('title').text() || null,
        meta_description: $('meta[name="description"]').attr('content') || null,
        meta_keywords: $('meta[name="keywords"]').attr('content') || null,
        og_title: $('meta[property="og:title"]').attr('content') || null,
        og_description: $('meta[property="og:description"]').attr('content') || null,
        og_image: $('meta[property="og:image"]').attr('content') || null,
        twitter_handle: extractHandle('twitter'),
        facebook_handle: extractHandle('facebook'),
        instagram_handle: extractHandle('instagram'),
        linkedin_handle: extractHandle('linkedin'),
        youtube_handle: extractHandle('youtube'),
        tiktok_handle: extractHandle('tiktok'),
        other_links: otherLinks,
        raw_html: html,
      };
    //   console.log(`Scraped data for ${url}:`, JSON.stringify(scrapedData, null, 2));
      return scrapedData;
    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
      return null;
    }
  }

  static async saveScrapedCompetitor(competitor_id: string, website_id: string, scraped: any) {
    console.log(`Entering saveScrapedCompetitor: competitor_id=${competitor_id}, website_id=${website_id}`);
    const result = await prisma.competitor_scraped_data.upsert({
      where: { competitor_id },
      update: {
        website_url: scraped.website_url,
        page_title: scraped.page_title,
        meta_description: scraped.meta_description,
        updated_at: new Date(),
      },
      create: {
        competitor_id,
        website_id,
        ...scraped,
      },
    });
    // console.log(`Upserted competitor_scraped_data for competitor_id=${competitor_id}`);
    return result;
  }

  static async process(url: string, website_id?: string, user_id?: string) {
    // console.log(`Entering process: url=${url}, website_id=${website_id}, user_id=${user_id}`);
    try {
      // Step 1: Get or create website entry
      console.log('Step 1: Fetching or creating website entry');
      const site = await this.getWebsite(url, website_id, user_id);
      if (!site) {
        console.log('No site data returned');
        throw new Error(`No scraped data found or created for ${url}`);
      }
      console.log(`Site data retrieved: website_id=${site.website_id}`);

      // Step 2: Fetch user requirements
      console.log(`Step 2: Fetching user requirements for website_id=${site.website_id}`);
      const userRequirement = await prisma.user_requirements.findFirst({
        where: { website_id: site.website_id },
      });
    //   console.log(`User requirements: ${userRequirement ? JSON.stringify(userRequirement) : 'none'}`);

      // Step 3: Get competitor URLs
      const competitorUrls: string[] = userRequirement?.competitor_urls
        ? userRequirement.competitor_urls.split(',').map(url => url.trim()).filter(Boolean)
        : [];
      console.log(`Competitor URLs: ${competitorUrls.length ? competitorUrls.join(', ') : 'none'}`);

      const competitorResults = [];

      // Step 4: Process each competitor URL in parallel
      console.log('Step 4: Processing competitor URLs');
      const competitorPromises = competitorUrls
        .filter(compUrl => compUrl.startsWith('http'))
        .map(async (compUrl) => {
          console.log(`Processing competitor URL: ${compUrl}`);
          try {
            const scraped = await this.scrapeWebsite(compUrl);
            if (!scraped) {
              console.log(`Scrape failed for competitor URL: ${compUrl}`);
              return null;
            }
            console.log(`Scraped competitor URL: ${compUrl}`);

            const competitorData = await this.extractdataFroGivencompetitors(scraped);
            if (!competitorData) {
              console.log(`No competitor data extracted for ${compUrl}`);
              return null;
            }
            console.log(`Extracted competitor data for ${compUrl}:`, competitorData);

            const competitorId = uuidv4();
            console.log(`Generated competitor_id: ${competitorId}`);
            const savedCompetitor = await prisma.competitor_details.create({
              data: {
                competitor_id: competitorId,
                website_id: site.website_id,
                name: competitorData.name || scraped.page_title || compUrl,
                website_url: compUrl,
                industry: competitorData.industry || userRequirement?.industry || 'Unknown',
                region: competitorData.region || userRequirement?.region_of_operation || 'Unknown',
                target_audience: competitorData.target_audience || userRequirement?.target_audience || 'Unknown',
                primary_offering: competitorData.primary_offering || userRequirement?.primary_offering || 'Unknown',
                usp: competitorData.usp || 'No clear USP identified',
              },
            });
            console.log(`Saved competitor details for ${compUrl}: competitor_id=${competitorId}`);

            await this.saveScrapedCompetitor(competitorId, site.website_id, scraped);
            console.log(`Saved scraped data for competitor_id=${competitorId}`);
            return savedCompetitor;
          } catch (err) {
            console.warn(`Competitor scrape failed for ${compUrl}:`, err);
            return null;
          }
        });

      const results = await Promise.all(competitorPromises);
      competitorResults.push(...results.filter((result): result is NonNullable<typeof result> => result !== null));
      console.log(`Processed ${competitorResults.length} competitors from provided URLs`);

      // Step 5: Fetch AI-generated competitors if needed
      const competitorsToGenerate = Math.max(0, 3 - competitorResults.length);
      console.log(`Step 5: Need to generate ${competitorsToGenerate} additional competitors`);
      if (competitorsToGenerate > 0) {
        try {
          console.log('Fetching AI-generated competitors');
          const aiResponse = await this.fetchFromLLM(
            {
              page_title: site.page_title ?? undefined,
              meta_description: site.meta_description ?? undefined,
              meta_keywords: site.meta_keywords ?? undefined,
              website_url: site.website_url,
              industry: userRequirement?.industry,
              region_of_operation: userRequirement?.region_of_operation,
              target_location: userRequirement?.target_location,
              target_audience: userRequirement?.target_audience,
              primary_offering: userRequirement?.primary_offering,
              USP: userRequirement?.USP,
            },
            competitorsToGenerate
          );
        //   console.log('AI-generated competitors response:', aiResponse);

        //   console.log(`Persisting AI response for website_id=${site.website_id}`);
          await this.persistAiResponseOnly(site.website_id, aiResponse);

        //   console.log('Parsing AI-generated competitors');
          const parsedCompetitors = parseCompetitorData(aiResponse);
          console.log(`Parsed ${parsedCompetitors.length} AI-generated competitors`);

          for (const comp of parsedCompetitors) {
            if (!comp.website_url?.startsWith('http')) {
              console.log(`Skipping invalid competitor URL: ${comp.website_url}`);
              continue;
            }
            if (competitorUrls.includes(comp.website_url) || competitorResults.some(res => res.website_url === comp.website_url)) {
              console.log(`Skipping duplicate competitor URL: ${comp.website_url}`);
              continue;
            }

            try {
              const competitorId = uuidv4();
            //   console.log(`Generated competitor_id for AI competitor: ${competitorId}`);

              const saved = await prisma.competitor_details.create({
                data: {
                  competitor_id: competitorId,
                  website_id: site.website_id,
                  name: comp.name,
                  website_url: comp.website_url,
                  industry: comp.industry,
                  region: comp.region,
                  target_audience: comp.target_audience,
                  primary_offering: comp.primary_offering,
                  usp: comp.usp,
                },
              });
            //   console.log(`Saved AI competitor details: ${comp.website_url}, competitor_id=${competitorId}`);

              const scraped = await this.scrapeWebsite(comp.website_url);
              if (scraped) {
                // console.log(`Scraped AI competitor: ${comp.website_url}`);
                await this.saveScrapedCompetitor(competitorId, site.website_id, scraped);
                // console.log(`Saved scraped data for AI competitor: competitor_id=${competitorId}`);
              } else {
                console.log(`Failed to scrape AI competitor: ${comp.website_url}`);
              }

              competitorResults.push(saved);
            } catch (err) {
              console.warn(`Failed to process AI-generated competitor ${comp.website_url}:`, err);
            }
          }
        } catch (err) {
          console.warn('Failed to fetch AI-generated competitors:', err);
        }
      }

      console.log(`Process completed: ${competitorResults.length} competitors processed`);
      return competitorResults;
    } catch (err) {
      console.error('Process failed:', err);
      return [];
    }
  }
}