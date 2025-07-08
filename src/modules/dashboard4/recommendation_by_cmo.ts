import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';

const client = new OpenAI();

interface CMORecommendationInput {
  user_id: string;
  website_id: string;
}



interface CMORecommendationOutput {
  recommendation_by_cmo: string;
}

export class CMORecommendationService {
  private prisma: PrismaClient;
  private openai: OpenAI;
  private model: string;

  constructor(prisma: PrismaClient, openai: OpenAI, model: string = 'gpt-4.1') {
    this.prisma = prisma;
    this.openai = openai;
    this.model = model;
  }

  private async fetchRecommendations(user_id: string, website_id: string) {
    const [llmResponse, website, requirement,analysis_status] = await Promise.all([
      this.prisma.llm_responses.findUnique({
        where: { website_id },
        select: {
          recommendation_by_mo_dashboard1: true,
          recommendation_by_mo_dashboard2: true,
          recommendation_by_mo_dashboard3: true,
        },
      }),
      this.prisma.user_websites.findUnique({
        where: { website_id },
        select: {
          user_id: true,
          website_url: true,
        },
      }),
      this.prisma.user_requirements.findFirst({
        where: { website_id },
        select: {
          industry: true,
          region_of_operation: true,
          target_location: true,
          target_audience: true,
          primary_offering: true,
          USP: true,
        },
      }),
      this.prisma.analysis_status.findUnique({
        where: { user_id_website_id: { user_id, website_id } },
        select: {
          user_id: true,
          competitor_details: true,
        },
      }),
    ]);

    if (!website || website.user_id !== user_id) {
      throw new Error('Invalid user_id or website_id');
    }

    return {
      dashboard1: llmResponse?.recommendation_by_mo_dashboard1 || null,
      dashboard2: llmResponse?.recommendation_by_mo_dashboard2 || null,
      dashboard3: llmResponse?.recommendation_by_mo_dashboard3 || null,
      website,
      requirement,
      competitor_details: analysis_status?.competitor_details || null, 
    };
  }

  public async generateCMORecommendation(input: CMORecommendationInput): Promise<CMORecommendationOutput> {
    try {
      const {
        dashboard1: website_analytics,
        dashboard2: social_media,
        dashboard3: competitor_analysis,
        website,
        requirement,
        competitor_details,
      } = await this.fetchRecommendations(input.user_id, input.website_id);

      const allData = {
        website_analytics,
        social_media,
        competitor_analysis,
        competitor_details,

      };

      const executiveCMOPrompt = `
Act as the Chief Marketing Officer for the following brand, and generate a full strategic brand report intended for executive leadership and board members.

### Brand Profile
- Website: ${website?.website_url || 'N/A'}
- Industry: ${requirement?.industry || 'N/A'}
- Region of Operation: ${requirement?.region_of_operation || 'N/A'}
- Target Location: ${requirement?.target_location || 'N/A'}
- Target Audience: ${requirement?.target_audience || 'N/A'}
- Primary Offering: ${requirement?.primary_offering || 'N/A'}
- Unique Selling Proposition (USP): ${requirement?.USP || 'N/A'}

### Data Inputs
${website_analytics ? '- Website Analytics: available' : ''}
${social_media ? '- Social Media Performance: available' : ''}
${competitor_analysis ? ' - Competitor Analysis: available' : ''}
${competitor_details ? '- Competitor Details (raw): available' : ''}

---

Based on the data and brand information, provide a comprehensive and structured report with the following sections:

1. **Executive Summary** 
   - Brand introdunction in 3-4 sentences . 
   - High-level overview of brand health, performance, and market stance  
   - Include 2–3 high-impact, data-driven strategic recommendations

2. **Brand Health Overview**  
   - Insights on awareness, brand perception, loyalty, and share of voice  
   - Include metrics such as NPS, aided/unaided awareness, or sentiment (if data is available)

3. **Market & Audience Insights**  
   - Define key customer personas  
   - Interpret audience behavior patterns and emerging consumer trends relevant to the brand’s segment and region

4. **Competitive Landscape**  
   - Analyze competitors  
   - Include a positioning map (descriptive) and a brief SWOT analysis

5. **Brand Performance Metrics**  
   - Report on marketing KPIs like engagement rate, campaign ROI, click-through rate, or conversion rate  
   - Highlight top-performing campaigns across digital and/or traditional channels

6. **Brand Strategy & Positioning**  
   - Evaluate current positioning, messaging, and alignment with mission and values  
   - Include any recent pivots or upcoming shifts in market or customer strategy

7. **Creative & Content Review**  
   - Review tone of voice, messaging consistency, and visual branding  
   - Evaluate recent campaigns and assets for brand equity contribution

8. **Reputation & Risk Management**  
   - Comment on PR exposure, reputation threats, or areas of potential backlash  
   - Include commentary on sentiment shifts if available

9. **Roadmap & Recommendations**  
   - Provide near- and long-term brand priorities  
   - Recommend innovations, cross-functional actions, and performance levers that align with the brand’s USP and growth ambitions

---

Use a professional, strategic tone suitable for C-level review. Where data is unavailable, use inferred logic or industry best practices. Do not reference external tools, services, or vendors.
      `.trim();

      console.log('Calling OpenAI for CMO recommendation...');

      const response = await this.openai.chat.completions.create({
        model: this.model,
        temperature: 0.5,
        max_tokens: 4000,
        messages: [
          { role: 'system', content: executiveCMOPrompt },
          { role: 'user', content: JSON.stringify(allData) },
        ],
      });

      const responseContent = response.choices[0]?.message?.content || 'No response generated.';

      console.log('Saving response to database...');

      await this.prisma.llm_responses.upsert({
        where: { website_id: input.website_id },
        update: {
          recommendation_by_cmo: responseContent,
          updated_at: new Date(),
        },
        create: {
          id: uuidv4(),
          website_id: input.website_id,
          recommendation_by_cmo: responseContent,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      await this.prisma.analysis_status.upsert({
        where: {
          user_id_website_id: {
            user_id: input.user_id,
            website_id: input.website_id,
          },
        },
        update: {
          recommendation_by_cmo: 'true',
          updated_at: new Date(),
        },
        create: {
          website_id: input.website_id,
          user_id: input.user_id,
          recommendation_by_cmo: 'true',
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      return { recommendation_by_cmo: responseContent };
    } catch (error) {
      console.error('Error generating CMO recommendation:', error);
      throw new Error('Failed to generate CMO recommendation');
    }
  }
}
