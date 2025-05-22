import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const model = process.env.OPENAI_MODEL || "gpt-4.1";
const prisma = new PrismaClient();

export const createBrandAudit = async (websiteId: string, user_id : string,) => {
  try {
  
    const userWebsite = await prisma.user_websites.findFirst({
        where: {
            user_id: user_id, 
            website_id: websiteId,
        },
        include: {
            llm_audit_reports: true,
        },
        });

        if (!userWebsite) {
        throw new Error("Website not found");
        }

        const websiteUrl = userWebsite.website_url;

    if (!userWebsite || !userWebsite.llm_audit_reports) {
      throw new Error("Audit reports not found for this website.");
    }

    const {
      pagespeed_report,
      traffic_report,
      broken_links_report,
      social_media_report,
    } = userWebsite.llm_audit_reports;

    if (!pagespeed_report && !traffic_report && !broken_links_report && !social_media_report) {
      throw new Error("No separate audit reports found to generate combined report.");
    }


//     const systemPrompt = `You are a senior marketing strategist and web performance expert with a strong understanding of SEO, analytics, UX, content strategy, and technical audits.

// Your job is to take multiple types of audit data and synthesize them into one in-depth, unified brand audit. Your report should be detailed, long, and professional — suitable for presentation to stakeholders.

// You must cover insights, key findings, specific metrics, strengths, weaknesses, and give actionable, prioritized recommendations. Format the response into sections with clear headings and bullet points if appropriate.

// Generate a comprehensive Brand Audit & Competitor Analysis Report" in the following structured format if the document
// The report should be detailed, professional, and tailored for a  business owner, with actionable recommendations in the Recommendations Summary section.
// `;

// const userPrompt = `
// You are provided with several audit report components for the following website: **${websiteUrl}**

// Use **all the data provided below**, and **do not omit or summarize prematurely**. The goal is to generate a **comprehensive, unified brand audit report** that reflects the full scope of the data.

// ---

// 🔹 **Traffic Report**
// ${traffic_report || "No traffic report available."}

// ---

// 🔹 **PageSpeed Report**
// ${pagespeed_report || "No pagespeed report available."}

// ---

// 🔹 **Broken Links Report**
// ${broken_links_report || "No broken links report available."}

// ---

// 🔹 **Social Media Report**
// ${social_media_report || "No social media report available."}

// ---

// Please:

// Ensure all metrics are presented in a table format with Description and 
// Significance, followed by a concise analysis paragraph for each section. 
// Each section must include:

// A metrics table with the following columns:

// | Metric | Description | Significance | Identified Issue | Specific Fix |

// A diagnostic analysis paragraph summarizing:

// Key performance issues

// Patterns across metrics or sections

// Prioritization where applicable
// The Recommendations Summary should combine insights from all sections into 
// actionable steps, and the Competitor Analysis should compare the brand to its 
// competitors, highlighting strategic fixes to close the competitive gap.
// for now you can add these place holders.
//  Recommendations Summary
// This should be a table or checklist that consolidates the most important findings from all sections. Use the following columns:

// | Area | Problem | Specific Fix | Priority (High/Med/Low) | Suggested Owner (e.g., Marketing, Dev, Founder) |

// Make sure recommendations are clear, specific, and immediately actionable by a small business owner or small team. Avoid generic advice.
// `;
const systemPrompt = `You are a senior marketing strategist and web performance analyst with deep expertise in SEO, technical audits, content strategy, UX, analytics, and branding.

Your task is to synthesize multiple types of audit data into a single, comprehensive **Brand Audit & Competitor Analysis Report**.

The report should be:
- Professional and presentation-ready
- Detailed and structured
- Written for business owners, founders, or decision-makers

### Report Structure:

1. **Brand Overview**
   Begin with a brief summary of the brand based on available data. Include:
   - Brand Name
   - Industry
   - Core Offerings
   - Target Audience
   - Overall Digital Footprint Summary  
   If data is limited, infer reasonably — do not fabricate.

2. **Audit Sections** (Traffic, PageSpeed, Social Media, Broken Links, etc.)
   For each section:
   - Include a metrics table:
     | Metric | Description | Significance | Identified Issue | Specific Fix |
   - Follow with a diagnostic analysis paragraph that:
     - Identifies key issues
     - Highlights patterns or recurring problems
     - Prioritizes what matters most

3. **Recommendations Summary**
3. **Recommendations Summary**  
   Begin this section with a brief introductory paragraph summarizing the main recommendations. Use concise bullet points to highlight the top priorities and strategic actions.

   Create a final table that consolidates actionable fixes:
   | Area | Problem | Specific Fix | Priority (High/Med/Low) | Suggested Owner (e.g., Marketing, Dev, Founder) |


### Important Guidelines:
- Be specific, not generic.
- Avoid filler language or vague suggestions.
- Write in a confident, expert tone.
- Tailor recommendations to be practical and understandable for small business teams.

Prioritize clarity, depth, and real-world value in every section.
`;

const userPrompt = `
You are provided with multiple audit components for the website: **${websiteUrl}**. Your task is to generate a **comprehensive Brand Audit Report** based on the following data.

Use **ALL** the information below. Do not omit or summarize prematurely. Ensure every section follows the required structure, and all findings are actionable, specific, and business-relevant.

---

🔹 **Traffic Report**
${traffic_report || "No traffic report available."}

---

🔹 **PageSpeed Report**
${pagespeed_report || "No pagespeed report available."}

---

🔹 **Broken Links Report**
${broken_links_report || "No broken links report available."}

---

🔹 **Social Media Report**
${social_media_report || "No social media report available."}

if the data for any of the reports is not available skips that section and more to next for report.

---






`;


    const gptResponse = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    }); 
    console.log("LLM Response:", gptResponse);

    const combinedAudit = gptResponse.choices[0].message?.content?.trim();
    
    if (!combinedAudit) {
      throw new Error("LLM did not return a valid brand audit.");
    }

    await prisma.llm_audit_reports.update({
      where: {
        website_id: userWebsite.website_id,
      },
      data: {
        brand_audit: combinedAudit,
      },
    });

    return {
      websiteId,
      brandAudit: combinedAudit,
    };

  } catch (error) {
    console.error("Error generating combined brand audit:", error);
    throw new Error("Failed to generate combined brand audit.");
  }
};
