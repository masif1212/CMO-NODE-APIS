import { PrismaClient } from '@prisma/client';
import { openai } from '../lib/openai';
import { parseCompetitorData } from '../utils/parser';

const prisma = new PrismaClient();

export class CompetitorService {
     /** Equivalent of get_website_data() returning a single row + relations. */
     static async getWebsite(url: string): Promise<(import('@prisma/client').website_scraped_data & { competitorDetails: import('@prisma/client').competitor_details[] }) | null> {
          const website = await prisma.website_scraped_data.findFirst({
               where: { website_url: url },
               include: { competitor_details: true }   // implicit relation via `website_id`
          });
          return website ? { ...website, competitorDetails: website.competitor_details ?? [] } : null;
     }

     /** Equivalent of find_competitors_using_openai(). */
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

               Identify the top 3 most relevant competitors and provide their details in the EXACT format below. Do not deviate from this structure, and ensure all fields are filled with meaningful data. Use numbered sections (1., 2., 3.) and plain URLs (not Markdown links).

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

          const filledPrompt = prompt
               .replace('{title}', site.page_title ?? 'None')
               .replace('{description}', site.meta_description ?? 'None')
               .replace('{keywords}', site.meta_keywords ?? 'None')
               .replace('{website_input}', site.website_url);

          const res = await openai.chat.completions.create({
               model: 'gpt-4o-search-preview',
               messages: [{ role: 'user', content: filledPrompt }],
               max_tokens: 800
          });

          return res.choices[0].message?.content?.trim() || "";
     }


     /** Equivalent of save_ai_response_and_competitors(). */
     static async persist(
          websiteId: string,
          aiResponse: string,
          competitors: ReturnType<typeof parseCompetitorData>
     ) {
          await prisma.$transaction([
               prisma.website_scraped_data.update({
                    where: { website_id: websiteId },
                    data: { ai_response: aiResponse }
               }),
               prisma.competitor_details.createMany({
                    data: competitors.map(c => ({ website_id: websiteId, ...c })),
                    skipDuplicates: true
               })
          ]);
     }

     /** Equivalent of process_url(). */
     static async process(url: string) {
          const site = await this.getWebsite(url);
          if (!site) throw new Error(`No scraped data for ${url}`);

          if (site.ai_response) {
               // competitors already parsed? nothing to do
               if (site.competitorDetails && site.competitorDetails.length) return site.competitorDetails;
               const parsed = parseCompetitorData(site.ai_response);
               await this.persist(site.website_id, site.ai_response, parsed);
               return parsed;
          }

          // call GPT
          const aiResponse = await this.fetchFromLLM({
               page_title: site.page_title ?? undefined,
               meta_description: site.meta_description ?? undefined,
               meta_keywords: site.meta_keywords ?? undefined,
               website_url: url
          });

          const parsed = parseCompetitorData(aiResponse);
          await this.persist(site.website_id, aiResponse, parsed);
          return parsed;
     }
}
