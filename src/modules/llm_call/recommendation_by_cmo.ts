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
            llm_responses: true,
        },
        });

        if (!userWebsite) {
        throw new Error("Website not found");
        }

        const websiteUrl = userWebsite.website_url;

    if (!userWebsite || !userWebsite.llm_responses) {
      throw new Error("Audit reports not found for this website.");
    }

    const {
      recommendation_by_mo_dashboard1,
      
      
      recommendation_by_mo_dashboard2,
    } = userWebsite.llm_responses;

    if (!recommendation_by_mo_dashboard1 &&  !recommendation_by_mo_dashboard2) {
      throw new Error("No separate audit reports found to generate combined report.");
    }



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
${recommendation_by_mo_dashboard1 || "No traffic report available."}


---

🔹 **Social Media Report**
${recommendation_by_mo_dashboard2 || "No social media report available."}

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
    // console.log("LLM Response:", gptResponse);

    const combinedAudit = gptResponse.choices[0].message?.content?.trim();
    
    if (!combinedAudit) {
      throw new Error("LLM did not return a valid brand audit.");
    }

    await prisma.llm_responses.update({
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