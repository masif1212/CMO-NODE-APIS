
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { OpenAI } from "openai";
import * as cheerio from "cheerio";

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = process.env.OPENAI_MODEL || "gpt-4.1";

// Utility: Estimate numeric rating from textual content
const estimateRating = (key: string, content: any): number => {
  const str = JSON.stringify(content).toLowerCase();

  if (str.includes("excellent") || str.includes("present") || str.includes("implemented")) return 10;
  if (str.includes("strong") || str.includes("comprehensive")) return 9;
  if (str.includes("good") || str.includes("clear")) return 8;
  if (str.includes("adequate") || str.includes("detected")) return 7;
  if (str.includes("missing") || str.includes("not found")) return 2;
  if (str.includes("n/a") || str.includes("na")) return 1;

  return 5;
};

// Utility: Inject title+ratings into nested structure
const injectRatings = (section: any): any => {
  if (!section || typeof section !== "object") return section;

  const result: any = {};

  for (const [key, value] of Object.entries(section)) {
    if (
      value &&
      typeof value === "object" &&
      ("title" in value || "reason" in value || "issue" in value)
    ) {
      const title =
        (value as any).title ||
        (value as any).reason ||
        ((value as any).issue && (value as any).issue.title) ||
        ((value as any).issue && (value as any).issue.reason) ||
        key;
      const rating = estimateRating(title, value);
      result[key] = {
        ...((value as any).element ? { element: { rating, title } } : {}),
        ...((value as any).issue ? { issue: { rating, title } } : {}),
    
          rating,
          reason:
            (value as any).explanation?.reason ||
            (value as any).reason ||
            "No explanation provided",
      
      };
    } else {
      result[key] = injectRatings(value);
    }
  }

  return result;
};


const normalizeRecommendations = (
  input: any
): Record<string, { tag: string; recommendation: string }[]> => {
  const result: Record<string, { tag: string; recommendation: string }[]> = {};

  for (const [category, items] of Object.entries(input || {})) {
    result[category] = [];

    for (const item of items as any[]) {
      result[category].push({
        tag: item.tag || "Untitled",
        recommendation: typeof item.recommendation === "string"
          ? item.recommendation.trim()
          : JSON.stringify(item.recommendation),
      });
    }
  }

  return result;
};

export const generateLLMTrafficReport = async (website_id: string, user_id: string) => {
  if (!website_id || !user_id) {
    return Response.json({ error: "Missing website_id or user_id" }, { status: 400 });
  }

  try {
    const [scraped, analysis, traffic] = await Promise.all([
      prisma.website_scraped_data.findUnique({ where: { website_id } }),
      prisma.brand_website_analysis.findFirst({
        where: { website_id },
        orderBy: { created_at: "desc" },
      }),
      prisma.brand_traffic_analysis.findFirst({
        where: { website_id },
        orderBy: { created_at: "desc" },
      }),
    ]);

    // Extract H1
    let h1Text = "Not Found";
    if (scraped?.raw_html) {
      const $ = cheerio.load(scraped.raw_html);
      h1Text = $("h1").first().text().trim() || "Not Found";
    }

       
let optimization_opportinuties: any = "None";

if (analysis?.audit_details) {
  try {
    const auditDetails =
      typeof analysis.audit_details === "string"
        ? JSON.parse(analysis.audit_details)
        : analysis.audit_details;

    optimization_opportinuties = auditDetails?.optimization_opportinuties || "None";
  } catch (error) {
    console.error("Error parsing audit_details:", error);
    optimization_opportinuties = "None";
  }
}

// console.log("Optimization Opportunities:", optimization_opportinuties);



    const allData = {
      metadata: {
        title: scraped?.page_title ?? "N/A",
        description: scraped?.meta_description ?? "N/A",
        keywords: scraped?.meta_keywords ?? "N/A",
        h1: h1Text,
        og: {
          title: scraped?.og_title ?? "N/A",
          description: scraped?.og_description ?? "N/A",
          image: scraped?.og_image ? "Present" : "Missing",
        },
        schema: scraped?.schema_analysis ?? "None",
        ctr_loss_percent: scraped?.ctr_loss_percent ?? "N/A",
        homepage_alt_text_coverage: scraped?.homepage_alt_text_coverage ?? "N/A",
      },
      performance: {
        lcp: analysis?.largest_contentful_paint ?? "N/A",
        cls: analysis?.cumulative_layout_shift ?? "N/A",
        fcp: analysis?.first_contentful_paint ?? "N/A",
        speed_index: analysis?.speed_index ?? "N/A",
        tti: analysis?.time_to_interactive ?? "N/A",
        tbt: analysis?.total_blocking_time ?? "N/A",
        performance_score: analysis?.performance_score ?? "N/A",
        accessibility_score: analysis?.accessibility_score ?? "N/A",
        best_practices_score: analysis?.best_practices_score ?? "N/A",
        revenue_loss_percent: analysis?.revenue_loss_percent ?? "N/A",
        optimization_oppurtunities: optimization_opportinuties,
        // status_code: scraped?.status_code ?? "N/A",
        // status_message: scraped?.status_message ?? "N/A",
        // ip_address: scraped?.ip_address ?? "N/A",
        // response_time_ms: scraped?.response_time_ms ?? "N/A",
        

      },
      seo: {
        seo_score: analysis?.seo_score ?? "N/A",
        broken_links: Array.isArray(analysis?.broken_links)
          ? analysis?.broken_links
          : [analysis?.broken_links ?? "None"],
      },
      traffic: {
        avg_session_duration: traffic?.avg_session_duration,
        engagement_rate: traffic?.engagement_rate,
        engaged_sessions: traffic?.engaged_sessions,
        total_visitors: traffic?.total_visitors,
        unique_visitors: traffic?.unassigned,
        sources: {
          organic: traffic?.organic_search,
          direct: traffic?.direct,
          referral: traffic?.referral,
          social: traffic?.organic_social,
        },
        new_vs_returning: traffic?.new_vs_returning,
        top_countries: traffic?.top_countries,
        top_devices: traffic?.top_devices,
        top_sources: traffic?.top_sources,
      },
    };

    const prompt = `
You are a senior technical SEO expert with extensive experience in metadata, accessibility, structured data, web vitals, and analytics.

Each element you describe will be rated numerically from 1 to 10 by an automated system:
- 10 = Excellent
- 5 = Average / Needs improvement
- 1 = Poor / Missing / Broken


Given the provided JSON input, output a structured JSON response with these three keys:

1. **whats_working**: A dictionary of working elements. Each entry must include:
   - \`title\`: A short descriptive label (e.g., "Title Tag", "Open Graph Image")
   - \`explanation.reason\`: A brief expert explanation of why it works well

2. **what_needs_fixing**: A dictionary of problematic elements. Each must include:
   - \`title\`: A clear label (e.g., "Missing og:image")
   - \`explanation.reason\`: Why it’s underperforming or incorrect

3. **recommendations**: A dictionary where keys are categories (e.g., "metadata", "performance") and each value is an array of objects:
   - \`tag\`: A readable identifier (matching titles above)
   - \`recommendation\`: A clear, technical, actionable fix  in detail(avoid generic tools)

Be consistent: titles in “what_needs_fixing” and “recommendations.tag” should match.

Output only valid JSON.
`;

    const llmResponse = await openai.chat.completions.create({
      model,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: JSON.stringify(allData) },
      ],
    });

    const llmContent = llmResponse.choices[0].message.function_call?.arguments
      ? JSON.parse(llmResponse.choices[0].message.function_call.arguments)
      : JSON.parse(llmResponse.choices[0].message.content || "{}");

    const combinedOutput = {
      whats_working: injectRatings(llmContent.whats_working),
      what_needs_fixing: injectRatings(llmContent.what_needs_fixing),
      recommendations: normalizeRecommendations(llmContent.recommendations),
    };

    await prisma.llm_responses.upsert({
      where: { website_id },
      update: {
        dashboard1_what_working: JSON.stringify(combinedOutput),
      },
      create: {
        website_id,
        dashboard1_what_working: JSON.stringify(combinedOutput),
      },
    });

    return { success: true, data: combinedOutput };
  } catch (err) {
    console.error("LLM Audit Error:", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
};
