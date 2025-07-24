import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import * as cheerio from "cheerio";
import { all } from 'axios';
import { Target } from 'puppeteer';

const client = new OpenAI();

interface CMORecommendationInput {
  user_id: string;
  website_id: string;
}



interface CMORecommendationOutput {
  cmo_recommendation: string;
  response?: any; // Adjust type as needed
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
          website_audit: true,
          seo_audit: true,
          dashboard1: true,

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
      website_data: analysis_status?.dashboard1|| null,
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
        website_data
      } = await this.fetchRecommendations(input.user_id, input.website_id);

    

      // };
      const currentDate = new Date().toISOString().split('T')[0]; 



 const [scraped, analysis, traffic, llm_Response,userRequirement] = await Promise.all([
      this.prisma.website_scraped_data.findUnique({ where: { website_id:input.website_id } }),
      this.prisma.brand_website_analysis.findFirst({
        where: { website_id: input.website_id },
        orderBy: { created_at: "desc" },
      }),
         this.prisma.brand_traffic_analysis.findFirst({
            where: { website_id:input.website_id },
            orderBy: { created_at: "desc" },
          }),
        
         this.prisma.llm_responses.findFirst({
            where: { website_id:input.website_id },
            orderBy: { created_at: "desc" },
            select: {
              geo_llm: true,
            },
          }),

          
         this.prisma.user_requirements.findFirst({
            where: { website_id:input.website_id },
            orderBy: { created_at: "desc" },
            select: {
              industry: true,
              target_audience: true 
            },
          })
      
    ]);

    // Extract H1
    let h1Text = "Not Found";
    if (scraped?.raw_html) {
      const $ = cheerio.load(scraped.raw_html);
      h1Text = $("h1").first().text().trim() || "Not Found";
    }




    const allData: any = {
      Analytics: {
        revenue_loss_definition: `*Formula:*

1.  *Average Revenue Conversion Loss (Percentage):*
    RevenueLoss% = ((LCP - 2.5) × 7) + (((TBT - 200) / 100) × 3) + (CLS × 10)

*Assumptions and Metric Impacts:*

* *LCP (Largest Contentful Paint):*
    * *Threshold:* 2.5 seconds (s)
    * *Impact:* For every 1 second (s) that LCP exceeds 2.5s, there is an estimated 7% drop in conversions.
* *TBT (Total Blocking Time):*
    * *Threshold:* 200 milliseconds (ms)
    * *Impact:* For every 100 milliseconds (ms) that TBT exceeds 200ms, there is an estimated 3% drop in conversions.
* *CLS (Cumulative Layout Shift):*
    * *Threshold:* 0.1 units
    * *Impact:* For every 1.0 unit increase in CLS, there is an estimated 10% drop in conversions.

*Interpretation of Results:*

* *Positive RevenueLoss%:*
    * A positive result indicates a *projected revenue loss* due to the current performance metrics exceeding the defined thresholds. The higher the positive number, the greater the anticipated negative impact on conversion rates, and by extension, revenue.
* *Negative RevenueLoss%:*
    * A negative result indicates that the current performance metrics are *better than the defined thresholds*.
    * This suggests that these specific performance aspects are not contributing to conversion loss, and may even be positively impacting user experience, leading to potentially higher conversions. In essence, a negative value signifies a "good" or "optimal" performance state relative to these thresholds, indicating no estimated revenue loss from these factors. 
        Current value: ${analysis?.revenue_loss_percent ?? "N/A"}%`,
        ctr_loss_percent: scraped?.ctr_loss_percent ?? "N/A",
      },
     
      website_audit: {
        websiite_details: website_data ?? "N/A",
  } ,
    };

    if (traffic) {
      allData.traffic = {
        avg_session_duration_in_seconds: traffic?.avg_session_duration ?? "N/A",
        engagement_rate: traffic?.engagement_rate ?? "N/A",
        engaged_sessions: traffic?.engaged_sessions ?? "N/A",
        total_visitors: traffic?.total_visitors ?? "N/A",
        unique_visitors: traffic?.unassigned ?? "N/A",
        
        new_vs_returning: traffic?.new_vs_returning ?? "N/A",
        top_countries: traffic?.top_countries ?? "N/A",
        // top_devices: traffic?.top_devices ?? "N/A",
      };

      allData.onpage_opptimization = {
        title: scraped?.page_title ?? "N/A",
        description: scraped?.meta_description ?? "N/A",
        keywords: scraped?.meta_keywords ?? "N/A",
        h1: h1Text,
        og: {
          title: scraped?.og_title ?? "N/A",
          description: scraped?.og_description ?? "N/A",
          image: scraped?.og_image ? "Present" : "Missing",
        },
        homepage_alt_text_coverage: scraped?.homepage_alt_text_coverage ?? "N/A",
      };

      allData.technical_seo = {
        schema: scraped?.schema_analysis ?? "None",
        no_of_broken_links: analysis?.total_broken_links ?? "N/A",
        broken_links: analysis?.broken_links ?? "N/A",
      };

      allData.Geo = {
        schema: scraped?.schema_analysis ?? "None",
        AI_discovilibilty: llm_Response?.geo_llm ?? "None",
        number_of_sources_from_being: traffic?.top_sources ?? "N/A",
      };
      allData.user_industry_and_target_location={
       industry: userRequirement?.industry,
       Target_location:userRequirement?.industry
      }
      
       allData.competitor_details = {competitor_details}
         allData.competitor_comparison = {competitor_analysis};
    }    





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
S${allData ? '-' : ''}


Your task is to generate a **structured JSON report** based on the given input data. The output must help executive stakeholders understand the brand’s position, performance risks, and growth levers.

---

🧠 **Output Format**

Return a **valid JSON object** with the following top-level keys in this exact order:
\`\`\`json
{
  "brand": {
    "name": "Example Brand",
    "website": "https://example.com"
  },
  "executive_summary": {"High-level overview of current brand performance
                        Key challenges & growth opportunities in plain English
                        A one-liner verdict: “Here’s what you need to fix now to grow faster"},
  
                        
                       
  "brand_health_overview": {"
  camparison of website anaylsis data like lcp /fcp etc"},

  "swot_analysis": {
    "strengths": ["..."],
    "weaknesses": ["..."],
    "opportunities": ["..."],
    "threats": ["..."]
  },
  
    

  "priority_fixes_bottom_funnel": 
    {
      "use the website revenue loss and seo revenue loss check which one needs to be prioritize first .
      what can we do do enhance these matrix based on how these are calculated "
    },
  

  "brand_positioning_messaging_review": 
  {
  "Is your messaging consistent across touchpoints?
   Do your USPs stand out?
   Does your website and social reflect your actual value prop?
   Brand voice alignment: Are you sounding premium, helpful, or confused?
"
}
 
   
  "retention_strategy": {
    
    "analysis": "Describe whether the return user behavior meets healthy retention standards for the industry.",
    "industry_benchmark": "Provide benchmark values for the industry (e.g., SaaS = 40% returning users).",
    "recommendations": "Targeted strategies to increase retention — via loyalty programs, better onboarding, email flows, etc."
  },

      "market_suggestions": {
    "target_audience_validation": "Explain if the current top countries matches the brand's intended target location. Highlight mismatches and suggest corrective targeting strategies.",
    "expansion_opportunities": "Suggest specific regional or audience segments within or outside the target location that show high potential based on interest or performance signals."
  },
   "channel_budget_suggestions": 
    {
      "channel": "Paid Search",
      "suggestion": "Reduce spend by 15% due to saturated CPCs and low ROAS"
    },
    {
      "channel": "SEO",
      "suggestion": "Increase investment in blog clusters targeting bottom-of-funnel keywords"
    },
    
  ]
}
\`\`\`json
---

 **Special Instructions for Bottom-of-Funnel Fixes**
- The 'priority_fixes_bottom_funnel' section must only focus on issues that **directly cause revenue loss or leakage**
- These must come from either:
  - **SEO drop-offs** (e.g., keyword cannibalization, poor SERP CTR, missing schema, etc.)
  - **Website performance issues** (e.g., broken forms, slow mobile load, friction in lead gen UX)
- For each issue:
  - Use the 'source' field to flag whether the issue is "seo", "website", or "both"
  - Make sure the fix is specific and implementable (no vague suggestions)

---

 **General Formatting & Style**
- Use **markdown-style bold headings** only inside the JSON values where helpful
- Start with **brand name and website URL** in the 'brand' object
- Use bullet lists or arrays where specified
- Write in a **concise, executive tone** for brand leadership and growth teams
- If data is unavailable, use inferred logic — **never skip a section or say “no data”**
- Do not mention or rely on external tools, platforms, or vendors

---
Your output is a strategic intelligence memo. Structure it strictly as valid JSON. Prioritize clarity, business impact, and next-step relevance.

NOTE: Never mention a third api like pagespeed , semrush etc
`;



      console.log('Calling OpenAI for CMO recommendation...');

      const response = await this.openai.chat.completions.create({
        model: this.model,
        temperature: 0.5,
        max_tokens: 8000,
        messages: [
          { role: 'system', content: executiveCMOPrompt },
          { role: 'user', content: JSON.stringify(allData) },
        ],
      });

      let rawText = response.choices[0]?.message?.content || 'No response generated.';
       rawText = rawText.replace(/^```json|```$/g, '').trim();
      const responseContent = JSON.parse(rawText);
      console.log('Saving response to database...');

      await this.prisma.llm_responses.upsert({
        where: { website_id: input.website_id },
        update: {
          recommendation_by_cmo: JSON.stringify(rawText),
          updated_at: new Date(),
        },
        create: {
          id: uuidv4(),
          website_id: input.website_id,
          recommendation_by_cmo: JSON.stringify(rawText),
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
          recommendation_by_cmo: JSON.stringify(responseContent),
          updated_at: new Date(),
        },
        create: {
          website_id: input.website_id,
          user_id: input.user_id,
          recommendation_by_cmo: JSON.stringify(responseContent),
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      return { cmo_recommendation: responseContent};
    } catch (error) {
      console.error('Error generating CMO recommendation:', error);
      throw new Error('Failed to generate CMO recommendation');
    }
  }
}
