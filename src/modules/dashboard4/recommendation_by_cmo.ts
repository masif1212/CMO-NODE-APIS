import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { sanitizeAndStringify } from '../../utils/clean_text';


interface CMORecommendationInput {
  user_id: string;
  website_id: string;
  report_ids: string[],
}

interface CMORecommendationOutput {
  cmo_recommendation: string;
  response?: any; // Adjust type as needed
}

export class CMORecommendationService {
  private prisma: PrismaClient;
  private openai: OpenAI;

  constructor(prisma: PrismaClient, openai: OpenAI, model: string = 'gpt-4.1') {
    this.prisma = prisma;
    this.openai = openai;
  }

private async fetchRecommendations(user_id: string, website_id: string, report_ids: string[]) {
  const [website, requirement, reports] = await Promise.all([
    this.prisma.user_websites.findUnique({
      where: { website_id },
      select: { user_id: true, website_url: true },
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
    this.prisma.report.findMany({
      where: {
        report_id: { in: report_ids },
      },
    }),
  ]);

  if (!website || website.user_id !== user_id) {
    throw new Error("Invalid user_id or website_id");
  }

  // ✅ Find the first report that has a scraped_data_id
  const firstScrapedDataId = reports.find(r => r.scraped_data_id)?.scraped_data_id;

  let scraped_data: { logo_url: string | null } | null = null;

  if (firstScrapedDataId) {
    scraped_data = await this.prisma.website_scraped_data.findUnique({
      where: { scraped_data_id: firstScrapedDataId },
      select: { logo_url: true },
    });
  }
  const competitor_social_media : any = reports.map(r => r.dashboard3_socialmedia).filter(Boolean);

  // Combine multiple report sections
  const website_audit_data = reports.map(r => r.dashboard1_Freedata).filter(Boolean);
  const seo_audit = reports.map(r => r.dashboard_paiddata).filter(Boolean);
  const competitor_analysis = reports.map(r => r.dashboard3_data).filter(Boolean);
  const social_media_anaylsis = reports.map(r => r.dashboard2_data).filter(Boolean);

  return {
    website_audit_data,
    seo_audit,
    competitor_analysis,
    requirement,
    website,
    reports,
    logo_url: scraped_data?.logo_url || null, 
    social_media_anaylsis,
    competitor_social_media
  };
}


public async generateCMORecommendation(input: CMORecommendationInput): Promise<CMORecommendationOutput> {
    try {
      const {
        website_audit_data: website_audit_data,
        seo_audit: seo_audit,
        competitor_analysis: competitor_analysis,
        requirement,
        website,
        // reports,
        logo_url,
        social_media_anaylsis,
        competitor_social_media
      } = await this.fetchRecommendations(input.user_id, input.website_id, input.report_ids);

      

      function stripCodeFences(text: string): string {
        return text
          .replace(/^\s*```(?:json)?\s*/i, '') // Remove opening
          .replace(/\s*```\s*$/i, '')          // Remove closing
          .trim();
      }
      


let fullreportseo: any = {};
for (const entry of seo_audit) {
  try {
    const parsed = typeof entry === 'string' ? JSON.parse(entry) : entry;
    fullreportseo = { ...seo_audit, ...parsed }; // shallow merge
    // console.log("fullreportseo",fullreportseo)
  } catch (err) {
    console.warn("Invalid JSON in dashboard_paiddata entry", err);
  }
}


const datafor_llm = fullreportseo?.datafor_llm;
// console.log("datafor_llm", datafor_llm)



const parseFirstValidJSON = (arr: any[]): any => {
  for (const val of arr) {
    try {
      return typeof val === 'string' ? JSON.parse(val) : val;
    } catch (e) {
      console.warn("Skipping invalid JSON entry in website_audit_data", e);
    }
  }
  return null;
};

let fullreportwebsaudit: any = parseFirstValidJSON(website_audit_data);



const webdatafor_llm = fullreportwebsaudit?.data_for_llm;



let fullcompetitor_data: any = parseFirstValidJSON(competitor_analysis);



const competitor_data = fullcompetitor_data?.llmData;


const allData: any = {};

if (webdatafor_llm) {
  allData.Analytics = {
    website_revenue_loss: `*Formula:*

1.  Average Revenue Conversion Loss (Percentage):
    website_revenue_loss% = ((LCP - 2.5) × 7) + (((TBT - 200) / 100) × 3) + (CLS × 10)

Assumptions and Metric Impacts:

* LCP (Largest Contentful Paint):
    * Threshold: 2.5s → Estimated 7% drop per extra second
* TBT (Total Blocking Time):
    * Threshold: 200ms → Estimated 3% drop per 100ms over
* CLS (Cumulative Layout Shift):
    * Threshold: 0.1 → Estimated 10% drop per 1.0 unit

Interpretation:
Positive = projected revenue loss.  
Negative = better-than-threshold performance.

Current value: ${webdatafor_llm.revenueLossPercent ?? "N/A"}%`,

    ctr_loss_percent_oR_SeoRevenueLoss: webdatafor_llm.seo_revenue_loss_percentage ?? "N/A",
  };

  allData.website_audit = {
    websiite_details: webdatafor_llm,
  };
}

// 🧠 Traffic analysis
if (datafor_llm?.traffic_anaylsis) {
  allData.traffic = datafor_llm.traffic_anaylsis;
}

// 🧠 On-page optimization
if (datafor_llm?.onpage_opptimization) {
  allData.onpage_opptimization = datafor_llm.onpage_opptimization;
}

// 🧠 Technical SEO
if (datafor_llm?.technical_seo) {
  allData.technical_seo = datafor_llm.technical_seo;
}

// 🧠 Geo insights
if (datafor_llm?.geo) {
  allData.Geo = datafor_llm.geo;
}


if (social_media_anaylsis)
{
  allData.social_media_data = social_media_anaylsis
}
// 🧠 Competitor comparison
if (competitor_data) {
  allData.competitor_comparison = competitor_data;
}

if (competitor_social_media) {
  allData.competitor_social_media = competitor_social_media;
}
const clean_data = sanitizeAndStringify(allData)
// console.log("✅ allData prepared:", clean_data);
function extractFirstJSONObject(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
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


Your task is to generate a *structured JSON report* based on the given input data. The output must help executive stakeholders understand the brand’s position, performance risks, and growth levers.

---

🧠 *Output Format*
The following JSON structure is strictly required.

Return a *valid JSON object* with the following keys in this exact order:
\\\`json
{
  "brand": {
    "name": "Example Brand",
    "website": "https://example.com"
  },
 "executive_summary": {
  
               "High-level overview":"High-level overview of current brand performance" ,
               "challenges_opportunities" :"Key challenges & growth opportunities in plain English",
               "A one-liner verdict" :" Here’s what you need to fix now to grow faster""
                },                  

  "brand_health_overview": {
    "overview": "Website performance metrics are strong",
    "metrics": {
      "Speed Index": {
        "value": "0.8s",
        "score": 0.99,
        "comment": "Exceptional, far ahead of competitors (e.g., Cakeshop.ae at 1.8s, Artisan Bakers at 6.6s)"
      },
      "First Contentful Paint (FCP)": {
        "value": "0.3s",
        "score": 1,
        "comment": "Best-in-class, ensuring fast visual feedback"
      },
      "Largest Contentful Paint (LCP)": {
        "value": "1.2s",
        "score": 0.9,
        "comment": "Well below the 2.5s threshold, indicating fast main content delivery"
      },
      "Total Blocking Time (TBT)": {
        "value": "540ms",
        "score": 0.25,
        "comment": "Needs improvement; higher than ideal (competitors range from 0ms to 440ms)"
      },
      "Cumulative Layout Shift (CLS)": {
        "value": 0.029,
        "score": 1,
        "comment": "Excellent visual stability"
      },
      "SEO Health": {
        "value": "100/100",
        "comment": "Technical SEO is robust, outperforming most peers"
      },
      "Accessibility": {
        "value": "99/100",
        "comment": "Industry-leading, with only minor alt text redundancy issues"
      },
      "Best Practices": {
        "value": "96/100",
        "comment": "High compliance, exceeding most competitors"
      }
    },
    "summary": "Overall, First Crust leads in speed, SEO, and accessibility, but TBT and on-page SEO require targeted fixes"
  }
  "swot_analysis": {
    "strengths": ["..."],
    "weaknesses": ["..."],
    "opportunities": ["..."],
    "threats": ["..."]
  },
  
    

 "priority_fixes_bottom_funnel": {
  "website_revenue_loss": "Is your website revenue being impacted by slow loading times? Are large Total Blocking Time (TBT) or poor Largest Contentful Paint (LCP) causing users to drop off before converting? Are your product and checkout pages optimized for speed and interaction?",
  "seo_revenue_loss": "Is the seo revenue loss optimize ?Are you losing organic traffic due to missing keyword opportunities or underperforming landing pages? Are your high-intent keywords ranking well? Are technical SEO issues like crawl delays or poor Core Web Vitals limiting your visibility?"
  "what_to_prioritize_first": "what to prioritize first and why "
  }

   "priority_fixes_bottom_funnel": {
  "website_revenue_loss":
  { 
  issue :"Is your website revenue being impacted by slow loading times? Are large Total Blocking Time (TBT) or poor Largest Contentful Paint (LCP) causing users to drop off before converting? Are your product and checkout pages optimized for speed and interaction?",
  fix: "Improve LCP to under 2.5s by optimizing images and reducing server response times.",
  source: "website"
}
  "seo_revenue_loss": {
  issue :"Is the seo revenue loss optimize ?Are you losing organic traffic due to missing keyword opportunities or underperforming landing pages? Are your high-intent keywords ranking well? Are technical SEO issues like crawl delays or poor Core Web Vitals limiting your visibility?"
  fix: "Target high-value keywords with low competition to improve organic traffic.",
  source: "seo"
}
  "what_to_prioritize_first": "what to prioritize first and why "
  }

  "brand_positioning_messaging_review": 
  {
  "Is your messaging consistent across touchpoints?"
  "Do your USPs stand out?"
  "Does your website and social reflect your actual value prop?"
   "Brand voice alignment: Are you sounding premium, helpful, or confused?"
"
 }
 "content_Strategy(minium 4)": {
  "analysis": "Evaluate whether the brand has defined content pillars or is producing scattered one-off blogs without strategic clustering.",
  "general_recommendation": "Develop 2–3 strong content pillars aligned with  revenue drivers. Each pillar should have one comprehensive guide (pillar page) and 5–7 supporting blogs or assets that target specific subtopics.",
  "pillars": [
    {
      "pillar_theme": "Customer Retention for SaaS",
      "pillar_page": "Ultimate Guide to SaaS Customer Retention",
      "cluster_examples": [
        "Top 5 retention metrics SaaS companies should track",
        "Onboarding flows that reduce churn by 20%",
        "Case study: How SaaS X improved retention with loyalty programs"
      ]
    },
    {
      "pillar_theme": "Digital Marketing for Small Businesses",
      "pillar_page": "Complete Handbook on SMB Digital Marketing",
      "cluster_examples": [
        "Facebook vs. Google Ads for SMBs",
        "How to track ROI on a small budget",
        "Local SEO strategies to dominate your city"
      ]
    }
  ],
  "recommendations": [
    "Audit existing blogs and group them into logical clusters under new pillar pages.",
    "Fill missing clusters by targeting long-tail, bottom-funnel keywords (e.g., 'pricing', 'alternatives', 'best tools').",
    "Cross-link all cluster blogs to their pillar page to improve topical authority."
  ]
}

  "retention_strategy": {
    
    "analysis": "Describe whether the return user behavior meets healthy retention standards for the industry.",
    "industry_benchmark": "Provide benchmark values for the industry (e.g., SaaS = 40% returning users).",
    "recommendations": "Targeted strategies to increase retention — via loyalty programs, better onboarding, email flows, etc.(suggestion should be in detail and depth insist of generic)"
  },

      "market_suggestions":
      {
    "target_audience_validation": "Explain if the current top countries matches the brand's intended target location. Highlight mismatches and suggest corrective targeting strategies.",
    "expansion_opportunities": "Suggest specific regional or audience segments or social media platform and content within or outside the target location that show high potential based on interest or performance signals.(suggestion should be in detail and depth insist of generic)"
      },

   "channel_budget_suggestions": 
    {
      "channel": "Paid Search",
      "suggestion": "check if there are paid ad or not and then give suggestion based on it , what paid ads should be run (facebook , google etc), there content etc , there extimated buget ",
      "channel": "SEO",
      "suggestion": "Increase investment in blog clusters targeting bottom-of-funnel keywords(suggestion should be in detail and depth insist of generic)"
    
    },
    
 
}
\\\`json
---

 *Special Instructions for Bottom-of-Funnel Fixes*
- The 'priority_fixes_bottom_funnel' section should have 3 tags website_revenue_loss, seo_revenue_loss and what_to_prioritize_first**
       -website_revenue_loss: it is 
- These must come from either:
  - *SEO drop-offs* (e.g., keyword cannibalization, poor SERP CTR, missing schema, etc.)
  - *Website performance issues* (e.g., broken forms, slow mobile load, friction in lead gen UX)
- For each issue:
  - Use the 'source' field to flag whether the issue is "seo", "website", or "both"
  - Make sure the fix is specific and implementable (no vague suggestions)

---

 *General Formatting & Style*
- Use *markdown-style bold headings* only inside the JSON values where helpful
- Start with *brand name and website URL* in the 'brand' object
- Use bullet lists or arrays where specified
- Write in a *concise, executive tone* for brand leadership and growth teams
- If data is unavailable, use inferred logic — *never skip a section or say “no data”*
- Do not mention or rely on external tools, platforms, or vendors

---
Your output is a strategic intelligence memo. Structure it strictly as valid JSON. Prioritize clarity, business impact, and next-step relevance.
NOTE: Do not mention or refer to any third-party tools (such as PageSpeed, Semrush, etc.). 
  Always write in full words, not short forms or abbreviations. 
  Keep the language simple, clear, and easy for anyone to understand.

`;
console.log('Calling OpenAI for CMO recommendation...');

      const response = await this.openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: 'system', content: executiveCMOPrompt },
          { role: 'user', content: JSON.stringify(clean_data) },
        ],
      });
      console.log("open ai response fetch")
      let rawText = response.choices[0]?.message?.content || 'No response generated.';
      rawText = stripCodeFences(rawText);
      const rawText2 = extractFirstJSONObject(rawText);

      const responseContent = JSON.parse(rawText2 || '{}');
      console.log('Saving response to database...');
      const cmo_recommendation = {
        logo_url,
        ...responseContent
      }
      
      for (const reportId of input.report_ids) {
          await this.prisma.report.upsert({
            where: { report_id: reportId },
            update: {
              cmorecommendation: JSON.stringify(cmo_recommendation),
            },
            create: {
              report_id: reportId,
              website_id: input.website_id,
              cmorecommendation: JSON.stringify(cmo_recommendation),
            },
          });
        }
        await this.prisma.cmo_recommendation.create({
            data: {
              user_id: input.user_id,
              report_ids: input.report_ids, // saves as JSON array
            },
          });
     

        for (const reportId of input.report_ids) {
                const existing = await this.prisma.analysis_status.findFirst({
            where: { report_id: reportId }
          });

          if (existing) {
            await this.prisma.analysis_status.update({
              where: { id: existing.id },
              data: { cmo_recommendation: true },
            });
          } else {
            await this.prisma.analysis_status.create({
              data: {
                user_id: input.user_id,
                report_id: reportId,
                website_id: input.website_id,
                cmo_recommendation: true,
              },
            });
          }
        }
  
      return { cmo_recommendation: cmo_recommendation};

    } catch (error) {
      console.error('Error generating CMO recommendation:', error);
      throw new Error('Failed to generate CMO recommendation');
    }
  }
}