// import { PrismaClient } from '@prisma/client';
// import { v4 as uuidv4 } from 'uuid';
// import OpenAI from "openai";
// const client = new OpenAI();



// interface CMORecommendationInput {
//   user_id: string;
//   website_id: string;
// }

// interface DashboardRecommendations {
//   dashboard1?: string; // Website analytics recommendations
//   dashboard2?: string; // Social media analysis recommendations
//   dashboard3?: string; // Competitor analysis recommendations
// }

// interface CMORecommendationOutput {
//   recommendation_by_cmo: string;
// }

// export class CMORecommendationService {
//   private prisma: PrismaClient;
//   private openai: OpenAI;
//   private model: string;

//   constructor(prisma: PrismaClient, openai: OpenAI, model: string = 'gpt-4.1') {
//     this.prisma = prisma;
//     this.openai = openai;
//     this.model = model;
//   }

//   // Fetch existing recommendations for a website
//   private async fetchRecommendations(user_id: string, website_id: string): Promise<DashboardRecommendations> {
//     const llmResponse = await this.prisma.llm_responses.findUnique({
//       where: { website_id },
//       select: {
//         recommendation_by_mo_dashboard1: true,
//         recommendation_by_mo_dashboard2: true,
//         recommendation_by_mo_dashboard3: true,
//       },
//     });

//     if (!llmResponse) {
//       return {};
//     }

//     // Verify user_id matches the website's user_id
//     const website = await this.prisma.user_websites.findUnique({
//       where: { website_id: website_id },
//       select: { user_id: true,website_url:true },
//     });

//     if (!website || website.user_id !== user_id) {
//       throw new Error('Invalid user_id or website_id');
//     }

//     return {
//       dashboard1: llmResponse.recommendation_by_mo_dashboard1 || undefined,
//       dashboard2: llmResponse.recommendation_by_mo_dashboard2 || undefined,
//       dashboard3: llmResponse.recommendation_by_mo_dashboard3 || undefined,
//     };
//   }

//   // Generate CMO-level recommendation
//   public async generateCMORecommendation(input: CMORecommendationInput): Promise<CMORecommendationOutput> {
//     try {
//       // Fetch existing recommendations
//       const recommendations = await this.fetchRecommendations(input.user_id, input.website_id);

//       // Prepare data for the prompt
//       const allData = {
//         website_analytics: recommendations.dashboard1 || null,
//         social_media: recommendations.dashboard2 || null,
//         competitor_analysis: recommendations.dashboard3 || null,
//       };

//       // // System prompt for all combinations
//       // const systemPrompt = `
//       //   You are a Chief Marketing Officer (CMO) tasked with generating a comprehensive, high-level strategic recommendation for a business based on the provided data. The data includes:
//       //   - Website analytics (website_analytics): Insights from website analysis, traffic analysis, and traffic data, covering strengths, issues, and recommendations for optimization.
//       //   - Social media (social_media): Analysis and recommendations for social media engagement and performance.
//       //   - Competitor analysis (competitor_analysis): Comparison with competitors, including their strategies and recommendations for competitive positioning.
        
//       //   Based on the available data (fields with non-null values), create a detailed, actionable recommendation in a single paragraph. The recommendation must:
//       //   - Explain specific SEO benefits (e.g., improved search rankings, organic traffic growth) derived from website analytics or competitor strategies.
//       //   - Describe the impact on client customers (e.g., enhanced engagement, increased conversions, better user experience) from website usability, social media engagement, or competitive positioning.
//       //   - Provide a strategic, CMO-level plan focusing on maximizing ROI, brand visibility, and competitive advantage.
//       //   - Use only the provided data and avoid referencing external tools or services.
//       //   - If no specific data is available (all fields null), provide a general marketing strategy emphasizing broad improvements in SEO and customer engagement.
        
        
//       //   Example outputs:
//       //   - All data available: {"recommendation_by_cmo": "Optimize website load times and content structure as recommended in website analytics to boost SEO rankings and organic traffic, while enhancing user experience to increase customer conversions; leverage social media insights to create targeted campaigns that drive engagement and brand loyalty; adopt competitor strategies like dynamic pricing to strengthen market positioning, ultimately maximizing ROI and customer retention."}
//       //   - Website only: {"recommendation_by_cmo": "Implement website analytics recommendations to optimize page speed and on-page SEO elements, improving search rankings and organic traffic, while enhancing navigation to boost customer satisfaction and conversion rates, driving higher ROI through improved user experience."}
//       //   - Social media only: {"recommendation_by_cmo": "Refine social media strategies based on provided insights to increase engagement through targeted content, enhancing brand visibility and fostering customer loyalty, which will drive higher interaction rates and potential conversions."}
//       //   - No data: {"recommendation_by_cmo": "Focus on integrated marketing strategies, such as optimizing website content for SEO to improve search visibility and creating engaging social media campaigns to enhance customer interaction, to drive brand growth and conversions."}
//       // `;

//       const systemPrompt = `
// You are a Chief Marketing Officer (CMO) tasked with generating a full strategic marketing report based on provided data. The data includes:

// - website_analytics: Technical SEO performance, content engagement, traffic sources, UX issues, and site optimization.
// - social_media: Platform performance, engagement rates, content types, and growth strategies.
// - competitor_analysis: Insights into competitor marketing, content, pricing, SEO, and social strategy.

// Generate a detailed, multi-section report **that not only recommends strategies, but also explains how each recommendation influences or enhances others.** Emphasize the **interconnections between SEO, social media, user experience, and competitive positioning.**

// Use the following structure:

// ---

// **1. Executive Summary**  
// - Provide a concise overview of the business’s marketing strengths, weaknesses, and opportunity areas.  
// - Mention the synergies between website, social, and competitive insights.

// **2. Key Findings (Data-Driven)**  
// - Website Analytics  
// - Social Media Performance  
// - Competitor Analysis  
// *(Include only sections for which data is available.)*

// **3. Cross-Validated Strategic Recommendations**  
// For each recommendation, clearly explain:
// - The **primary benefit** (e.g., better SEO, higher engagement, improved ROI)  
// - The **secondary effects** it enables in other areas (e.g., “Improved site speed boosts SEO **and** lowers bounce rate, which improves social share success”)  
// - How **combined efforts** across areas create compounding growth (e.g., content SEO + social amplification = exponential reach)

// **4. Strategic Integration Plan**  
// - Short-term actions (0–3 months)  
// - Mid-term actions (3–12 months)  
// - Prioritize initiatives that unlock multi-channel advantages

// **5. Risk & Dependency Notes**  
// - Outline where progress in one area depends on another (e.g., “Social performance is gated by content SEO”)

// **6. Conclusion**  
// - Recap how integrated marketing efforts create a competitive advantage and long-term ROI.

// ---

// Use only the non-null data provided. If all fields are null, generate a general version of this cross-validated report based on best practices in SEO, engagement, and competitive positioning. Avoid referencing third-party tools or external vendors.
// `;


//       // Log for debugging
//       console.log("Generating LLM response...");

//       // Call OpenAI directly
//       const llmResponse = await this.openai.chat.completions.create({
//         model: this.model,
//         temperature: 0.5,
//         // response_format: { type: 'json_object' },
//         messages: [
//           { role: 'system', content: systemPrompt },
//           { role: 'user', content: JSON.stringify(allData) },
//         ],
//         max_tokens: 4000,
//       });


// //  const llmResponse = await client.responses.create({
// //         model: this.model,
// //         temperature: 0.5,
// //         // response_format: { type: 'json_object' },
// //         input: [
// //           { role: 'system', content: systemPrompt },
// //           { role: 'user', content: JSON.stringify(allData) },
// //         ],
// //         instructions:"talk like a chief marketing officer"
// //       });

// //       // Extract and validate response
// //       const responseContent = llmResponse.output || "not response";

//       // Extract and validate response
//       const responseContent = llmResponse.choices[0]?.message?.content;
//       console.log("LLM response generated");
      

//       // Save recommendation to database
//       await this.prisma.llm_responses.upsert({
//         where: { website_id: input.website_id },
//         update: {
//           recommendation_by_cmo: responseContent,
//           updated_at: new Date(),
//         },
//         create: {
//           id: uuidv4(),
//           website_id: input.website_id,
//           recommendation_by_cmo: responseContent,
//           created_at: new Date(),
//           updated_at: new Date(),
//         },
//       });

//           await this.prisma.analysis_status.upsert({
//       where: {
//         user_id_website_id: {
//           user_id: input.user_id,
//           website_id: input.website_id,
//         },
//       },
//       update: {
//         recommendation_by_cmo: "true", 
//         updated_at: new Date(),
//       },
//       create: {
//         website_id: input.website_id,
//         user_id: input.user_id,
//         recommendation_by_cmo: "true", 
//         created_at: new Date(),
//         updated_at: new Date(),
//       },
//     });

//       return {
//         recommendation_by_cmo: responseContent || ''
//       };
//     } catch (error) {
//       console.error('Error generating CMO recommendation:', error);
//       throw new Error('Failed to generate CMO recommendation');
//     }
//   }

// }





import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';

const client = new OpenAI();

interface CMORecommendationInput {
  user_id: string;
  website_id: string;
}

interface DashboardRecommendations {
  dashboard1?: string; // Website analytics
  dashboard2?: string; // Social media
  dashboard3?: string; // Competitor analysis
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
    const [llmResponse, website, requirement] = await Promise.all([
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
      } = await this.fetchRecommendations(input.user_id, input.website_id);

      const allData = {
        website_analytics,
        social_media,
        competitor_analysis,
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
${competitor_analysis ? '- Competitor Analysis: available' : ''}
${!website_analytics && !social_media && !competitor_analysis ? '- No performance data available. Use best practices.' : ''}

---

Based on the data and brand information, provide a comprehensive and structured report with the following sections:

1. **Executive Summary** 
   - Brand introdunction in 3 -4 sentences . 
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
