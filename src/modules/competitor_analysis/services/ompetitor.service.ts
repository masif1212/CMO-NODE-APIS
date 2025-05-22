
import { scrapeWebsite } from '../../scraped_data/service';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { openai } from '../lib/openai';
import { parseCompetitorData } from '../utils/parser';

const prisma = new PrismaClient();

export class CompetitorService {
     static async getWebsite(url: string): Promise<(import('@prisma/client').website_scraped_data & { competitorDetails: import('@prisma/client').competitor_details[] }) | null> {
          let website = await prisma.website_scraped_data.findFirst({
               where: { website_url: url },
               include: { competitor_details: true }
          });

          if (website) {
               return { ...website, competitorDetails: website.competitor_details ?? [] };
          }

          const userWebsite = await prisma.user_websites.findFirst({
               where: { website_url: url },
               include: { website_scraped_data: true }
          });

          if (!userWebsite) {
               throw new Error(`No user_website found for URL: ${url}`);
          }

        //   if (!userWebsite.website_scraped_data) {
        //        await scrapeWebsite(userWebsite.website_id);
        //        console.log("Scraped new data for:", url);
        //   }

          const updatedWebsite = await prisma.website_scraped_data.findFirst({
               where: { website_url: url },
               include: { competitor_details: true }
          });

          if (!updatedWebsite) {
               throw new Error(`Scraping failed or data still not found for URL: ${url}`);
          }

          return {
               ...updatedWebsite,
               competitorDetails: updatedWebsite.competitor_details ?? []
          };
     }

     static async fetchFromLLM(site: {
          page_title?: string | null;
          meta_description?: string | null;
          meta_keywords?: string | null;
          website_url: string;
     }) {
          
          const prompt = `
               You are a market research assistant. I have the following website details:

               ### Website Information:
               - **Title**: {title}
               - **Description**: {description}
               - **Keywords**: {keywords}
               - **Website URL**: {website_input}

               Identify the top 3 most relevant competitors based on target audience and region of the given website  and provide their details in the EXACT format below. Do not deviate from this structure, and ensure all fields are filled with meaningful data. Use numbered sections (1., 2., 3.) and plain URLs (not Markdown links).
     
               Your task is to identify the **top 3 most relevant competitors** based on BOTH:
               1. **Target Audience** (demographics, interests, intent), AND
               2. **Region of Operation** (local or regional scope matching the input website ).

               ⚠️ IMPORTANT:
               - You MUST prioritize competitors that operate **primarily in the same region** as the input website.
               - Do **not** include global companies unless they have **localized services for the same region**.
               - Do not list unrelated or international companies just because they are large or well-known.
               - Use **credible, active businesses with valid websites** that start with http:// or https://.

               **Output Format**:
               \`\`\`
               1. **Competitor Name**: [Name]
                    - **Website URL**: [URL]
                    - **Industry/Niche**: [Industry]
                    - **Region of Operation**: [Region]
                    - **Target Audience**: [Audience]
                    - **Primary Offering**: [Offering]
                    - **Unique Selling Proposition (USP)**: [USP]

               2. **Competitor Name**: [Name]
                    - **Website URL**: [URL]
                    - **Industry/Niche**: [Industry]
                    - **Region of Operation**: [Region]
                    - **Target Audience**: [Audience]
                    - **Primary Offering**: [Offering]
                    - **Unique Selling Proposition (USP)**: [USP]

               3. **Competitor Name**: [Name]
                    - **Website URL**: [URL]
                    - **Industry/Niche**: [Industry]
                    - **Region of Operation**: [Region]
                    - **Target Audience**: [Audience]
                    - **Primary Offering**: [Offering]
                    - **Unique Selling Proposition (USP)**: [USP]
               \`\`\`

               Ensure each competitor has a valid website URL starting with http:// or https://. If no competitors are found, return an empty list in the same format with placeholders (e.g., "None" for each field).
          `;
          


//        
          const filledPrompt = prompt


               .replace('{title}', site.page_title ?? 'None')
               .replace('{description}', site.meta_description ?? 'None')
               .replace('{keywords}', site.meta_keywords ?? 'None')
               .replace('{website_input}', site.website_url);
          console.log("filledPrompt",filledPrompt)
          const res = await openai.chat.completions.create({
               model: 'gpt-4o-search-preview',
               messages: [{ role: 'user', content: filledPrompt }],
               max_tokens: 800
          });
          console.log("response####",res)
          return res.choices[0].message?.content?.trim() || '';
     }
     
     static async persistAiResponseOnly(websiteId: string, aiResponse: string) {
          await prisma.website_scraped_data.update({
               where: { website_id: websiteId },
               data: { ai_response: aiResponse }
          });
     }

     static async scrapeWebsite(url: string) {
          try {
               const res = await axios.get(url, { timeout: 10000 });
               const html = res.data;
               const $ = cheerio.load(html);

               return {
                    website_url: url,
                    page_title: $('title').text() || null,
                    meta_description: $('meta[name="description"]').attr('content') || null,
                    meta_keywords: $('meta[name="keywords"]').attr('content') || null,
                    og_title: $('meta[property="og:title"]').attr('content') || null,
                    og_description: $('meta[property="og:description"]').attr('content') || null,
                    og_image: $('meta[property="og:image"]').attr('content') || null,
                    raw_html: html
               };
          } catch (error) {
               console.error(`Error scraping ${url}:`, error);
               return null;
          }
     }

     static async saveScrapedCompetitor(competitorId: string, websiteId: string, scraped: any) {
          return await prisma.competitor_scraped_data.create({
               data: {
                    competitor_id: competitorId,
                    website_id: websiteId,
                    ...scraped
               }
          });
     }

     static async process(url: string) {
          const site = await this.getWebsite(url);
          if (!site) throw new Error(`No scraped data found for ${url}`);

          let competitors = site.competitorDetails;
          let parsed = [];

          // If AI response already present, use it
         
      
          const aiResponse = await this.fetchFromLLM({
               page_title: site.page_title ?? undefined,
               meta_description: site.meta_description ?? undefined,
               meta_keywords: site.meta_keywords ?? undefined,
               website_url: site.website_url
          });
          
          parsed = parseCompetitorData(aiResponse);
          await this.persistAiResponseOnly(site.website_id, aiResponse);
     

          const competitorResults = [];

          for (const comp of parsed) {
               if (!comp.website_url?.startsWith('http')) continue;

               // 1. Save competitor to DB
               const saved = await prisma.competitor_details.create({
                    data: {
                         website_id: site.website_id,
                         name: comp.name,
                         website_url: comp.website_url,
                         industry: comp.industry,
                         region: comp.region,
                         target_audience: comp.target_audience,
                         primary_offering: comp.primary_offering,
                         usp: comp.usp
                    }
               });

               // 2. Scrape competitor's website
               const scraped = await this.scrapeWebsite(comp.website_url);
               if (scraped) {
                    await this.saveScrapedCompetitor(saved.competitor_id, site.website_id, scraped);
               }

               competitorResults.push(saved);
          }

          return competitorResults;
     }
}


