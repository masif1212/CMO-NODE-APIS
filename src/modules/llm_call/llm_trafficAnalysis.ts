import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { OpenAI } from "openai";
import * as cheerio from "cheerio"; 

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = process.env.OPENAI_MODEL || "gpt-4.1";


export async function generateLLMTrafficReport(website_id: string) {    
 

  try {
              const scrapedData = await prisma.website_scraped_data.findUnique({
               where: { website_id },
               select: {
                 page_title: true,
                 meta_description: true,
                 meta_keywords: true,
                 og_title: true,
                 og_description: true,
                 raw_html: true,
               },
             });
         
             if (!scrapedData) {
               return ({
                 success: false,
                 error: "No scraped metadata found for the provided website_id.",
               });
             }
         
             // Extract <h1> from HTML
             let h1Text = "Not Found";
             if (scrapedData.raw_html) {
               const $ = cheerio.load(scrapedData.raw_html);
               h1Text = $("h1").first().text().trim() || "Not Found";
             }

    const trafficData = await prisma.brand_traffic_analysis.findFirst({
      where: { website_id },
      select: {
        traffic_analysis_id: true,
        total_visitors: true,
        organic_search: true,
        direct: true,
        referral: true,
        organic_social: true,
        unassigned: true,
        high_bounce_pages: true,
        top_countries: true,
        overall_bounce_rate: true,
        actionable_fix: true,
      },
    });

    if (!trafficData) {
      return ({
        success: false,
        error: "No traffic analysis found for the provided website_id.",
      });
    }

    const {
      traffic_analysis_id,
      total_visitors,
      organic_search,
      direct,
      referral,
      organic_social,
      unassigned,
      high_bounce_pages,
      top_countries,
      overall_bounce_rate,
      actionable_fix,
    } = trafficData;

    // 2. Build the prompt
    const prompt = `
You are a digital marketing analyst. A website traffic audit was conducted and the following data was collected:


### Website Metadata Overview:
- Page Title: ${scrapedData.page_title || "N/A"}
- Meta Description: ${scrapedData.meta_description || "N/A"}
- Meta Keywords: ${scrapedData.meta_keywords || "N/A"}

- First H1 Tag: ${h1Text}

Traffic Sources:
- Total Visitors: ${total_visitors}
- Organic Search: ${organic_search}
- Direct: ${direct}
- Referral: ${referral}
- Organic Social: ${organic_social}
- Unassigned: ${unassigned}

Top Countries:
${JSON.stringify(top_countries, null, 2)}

High Bounce Pages:
${JSON.stringify(high_bounce_pages, null, 2)}

Overall Bounce Rate: ${overall_bounce_rate}%

Existing Fix Summary (if any): ${actionable_fix ?? "N/A"}

Using the above data, provide a traffic analysis report that includes:
1. Summary of the current traffic distribution and visitor behavior.
2. Insights from bounce rate and suggestions for reducing it.
3. Key geographic insights and how to optimize based on location-based engagement.
4. Review of high bounce pages with clear technical and content-based recommendations.
5. General SEO, marketing, or UX strategies to improve traffic retention and conversion.

Make the tone professional and technically actionable. Prioritize changes that yield the biggest improvements.
`;

    // 3. Call OpenAI
    const response = await openai.chat.completions.create({
      model: model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
    });
    // console.log("LLM Response:", response);
    const llmOutput = response.choices?.[0]?.message?.content;
    await prisma.llm_responses.upsert({
        where: { website_id },
        update: {
            brand_audit: llmOutput,
        },create: {
            website_id,
            brand_audit: llmOutput,
        },
        });
    return ({
      success: true,
      website_id,
      traffic_analysis_id,
      report: llmOutput,
    });
  } catch (err: any) {
    console.error("❌ Traffic Audit Error:", err);
    return ({
      success: false,
      error: "Failed to generate LLM traffic audit report.",
      detail: err?.message || "Internal server error",
    });
    
  }
};
