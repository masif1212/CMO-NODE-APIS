import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { OpenAI } from "openai";
import * as cheerio from "cheerio";

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = process.env.OPENAI_MODEL || "gpt-4.1";

// Normalize recommendations
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

// Validate recommendations to ensure they match what_needs_fixing
const validateRecommendations = (output: any) => {
  const issues = new Set(Object.keys(output.what_needs_fixing || {}));
  const recommendations = output.recommendations || {};

  // If what_needs_fixing is empty, recommendations must be empty
  if (issues.size === 0) {
    if (Object.keys(recommendations).length > 0) {
      console.warn("what_needs_fixing is empty, but recommendations are not. Clearing recommendations.");
      output.recommendations = {};
    }
    return output;
  }

  // Validate each recommendation tag
  for (const [category, recs] of Object.entries(recommendations)) {
    for (const rec of recs as any[]) {
      if (!issues.has(rec.tag)) {
        console.warn(`Recommendation tag "${rec.tag}" does not match any issue in what_needs_fixing`);
        output.recommendations[category] = (output.recommendations[category] || []).filter(
          (r: any) => r.tag !== rec.tag
        );
      }
    }
    if (output.recommendations[category].length === 0) {
      delete output.recommendations[category];
    }
  }

  return output;
};

// LLM prompt
const prompt = `
You are a senior technical SEO expert with extensive experience in metadata, accessibility, structured data, web vitals, and analytics. You are generating output for a self-contained SEO audit tool that must provide actionable, technical solutions without relying on external tools or services (e.g., PageSpeed Insights, SEMrush, Lighthouse, or similar).
Handle all elements in the provided JSON input(title,meta data(keywords , descriptions),lcp).
Each element you describe will be rated numerically from 1 to 10 based on its performance:
- For **whats_working**: Assign ratings from 7 to 10:
  - 10 = Excellent (e.g., perfect implementation, optimal performance)
  - 9 = Strong (e.g., very good with minor room for improvement)
  - 8 = Good (e.g., solid but not exceptional)
  - 7 = Adequate (e.g., functional but could be enhanced)
- For **what_needs_fixing**: Assign ratings from 1 to 5:
  - 1 = Missing/Broken (e.g., completely absent or non-functional)
  - 2 = Poor (e.g., present but severely flawed)
  - 3 = Fair (e.g., functional but with significant issues)
  - 4 = Needs Improvement (e.g., minor issues)
  - 5 = Borderline (e.g., barely acceptable)


  Given the provided JSON input, output a structured JSON response with three keys:

1. **whats_working**: A dictionary of working elements. Each entry must include:
   - \`title\`: A short descriptive label (e.g., "Title Tag", "Open Graph Image")
   - \`explanation.reason\`: A detailed explanation (2-3 sentences) of why it works well, including technical context, impact on SEO/performance/user experience, and specific metrics or examples (e.g., "improves click-through rates by 20%"). Use positive terms like "excellent," "strong," "clear," or "robust." Do not mention external tools or services.
   - \`rating\`: A number from 7 to 10, based on the explanation.reason

2. **what_needs_fixing**: A dictionary of problematic elements. Each must include:
   - \`title\`: A clear label (e.g., "Missing og:image")(e.g., "organic visitors too low")
   - \`explanation.reason\`: A detailed explanation (2-3 sentences) of why it’s underperforming or incorrect, including technical context, impact on SEO/performance/user experience, and specific metrics or examples (e.g., "reduces click-through rates by 30-40%"). Use terms like "missing," "broken," "poor," or "incomplete." Do not mention external tools or services.
   - \`rating\`: A number from 1 to 5, based on the explanation.reason

3. **recommendations**: A dictionary where keys are categories (e.g., "metadata", "performance") and each value is an array of objects:
   - \`tag\`: Must exactly match a \`title\` from what_needs_fixing. Do not include recommendations for issues not listed in what_needs_fixing.
   - \`recommendation\`: A detailed, technical, actionable fix (3-4 sentences) that directly addresses the issue in the corresponding what_needs_fixing.reason. Include specific details like code snippets, configurations, or parameters. Provide manual validation steps (e.g., "Check the HTML source for the meta tag") instead of referencing external tools or services.


**Evaluation Criteria**:
- **Metadata**:
  - Title: <60 chars, keyword-rich (8–10); 60–70 chars (5–7); >70 or missing (1–3)
  - Description: 150–160 chars, compelling (8–10); <120 or >160 (5–7); missing (1–4)
  - Keywords: Optional, but relevant if present (7–9); irrelevant (2–4); missing (5 or skip)
  - H1: Present, unique, keyword-aligned (7–9); missing (0–4)
  - OG Tags: Complete, optimized (8–10); partial (2–4); all missing (0–2)
  - Schema: Valid JSON-LD (10); invalid (3); missing (1)

- **Performance**:
  - LCP: <2.5s (10); 2.5–4s (5); >4s (1); missing (3)
  - CLS: <0.1 (10); 0.1–0.25 (5); >0.25 (1); missing (3)
  - FCP: <1.8s (10); 1.8–3s (5); >3s (1); missing (3)
  - TTI: <3.8s (10); 3.8–7.8s (5); >7.8s (1); missing (3)
  - TBT: <200ms (10); 200–500ms (5); >500ms (1); missing (3)
  - Accessibility Score: >90 (10); 70–90 (7); <70 (3); missing (3)
  - Performance/Best Practices Score: >90 (10); 50–89 (5); <50 (1); missing (3)

- **SEO**:
  - SEO Score: >90 (10); 70–90 (7); <70 (3); missing (3)
  - Broken Links: None (10); 1–3 (5); >3 (1); missing (5)
  - Alt Text Coverage: >90% (10); 70–90% (7); <70% (3); missing (3)

- **Traffic**:
  - Avg Session Duration: >3 min (10); 1–3 min (7); <1 min (3); missing (3)
  - Engagement Rate: >50% (10); 30–50% (5); <30% (2); missing (3)
  - Organic Traffic: >50% of total (10); 20–50% (5); <20% (2); missing (3)
  - Total Visitors: >10,000 monthly (10); 1,000–10,000 (5–7); <1,000 (3); missing (3)
  - New vs. Returning: Balanced (40–60%) (10); skewed (>80% new) (5); missing (3)

- **Analytics**:
  - CTR Loss: <5% (10); 5–10% (5); >10% (2); missing (3)
  - Revenue Loss: <10% (10); 10–20% (5); >20% (2); missing (3)


Strictly ensure every recommendation has a \`tag\` matching a \`title\` in what_needs_fixing. If what_needs_fixing is empty, recommendations must be empty. Avoid ambiguous terms like "present" unless clearly positive or negative. Ensure ratings align with the tone and content of the explanation.reason. Never recommend using external tools or services like PageSpeed Insights, SEMrush, Lighthouse, or similar.

Example Output:
{
  "whats_working": {
    "Title Tag": {
      "title": "Title Tag",
      "explanation.reason": "The title tag is concise (under 60 characters) and includes primary keywords, enhancing search visibility. This improves click-through rates by approximately 20% in search results, supporting SEO goals.",
      "rating": 8
    },
    "HTTPS": {
      "title": "HTTPS",
      "explanation.reason": "The site uses HTTPS, ensuring secure data transmission and boosting user trust. This aligns with search engine ranking signals, providing a 5-10% SEO advantage.",
      "rating": 9
    }
  },
  "what_needs_fixing": {
    "Missing og:image": {
      "title": "Missing og:image",
      "explanation.reason": "No Open Graph image is defined, resulting in poor social media previews on platforms like Facebook and Twitter. This can reduce click-through rates from social shares by 30-40%, impacting brand visibility.",
      "rating": 1
    }
  },
  "recommendations": {
    "metadata": [
      {
        "tag": "Missing og:image",
        "recommendation": "Add a meta tag in the <head>: <meta property=\"og:image\" content=\"https://example.com/image.jpg\">. Use a 1200x630px PNG/JPG image (<5MB) that visually represents your brand with minimal text overlay. Ensure the URL is stable and publicly accessible. Verify the tag is correctly implemented by checking the HTML source code."
      }
    ]
  }
}

Output only valid JSON.
`;

export const generateLLMTrafficReport = async (website_id: string, user_id: string) => {
  if (!website_id || !user_id) {
    return Response.json({ error: "Missing website_id or user_id" }, { status: 400 });
  }else (console.log("Report generation started for website_id:", website_id));

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

    let optimization_opportunities: any = "None";
    if (analysis?.audit_details) {
      try {
        const auditDetails =
          typeof analysis.audit_details === "string"
            ? JSON.parse(analysis.audit_details)
            : analysis.audit_details;
        optimization_opportunities = auditDetails?.optimization_opportunities || "None";
      } catch (error) {
        console.error("Error parsing audit_details:", error);
        optimization_opportunities = "None";
      }
    }
    console.log("scraped?.meta_keywords", scraped?.meta_keywords);
    console.log("avg_session_duration:", traffic?.avg_session_duration);

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
    *  This suggests that these specific performance aspects are not contributing to conversion loss, and may even be positively impacting user experience, leading to potentially higher conversions. In essence, a negative value signifies a "good" or "optimal" performance state relative to these thresholds, indicating no estimated revenue loss from these factors. 
        Current value: ${analysis?.revenue_loss_percent ?? "N/A"}%`,
        optimization_opportunities: optimization_opportunities,
      },
      seo: {
        seo_score: analysis?.seo_score ?? "N/A",
        broken_links: Array.isArray(analysis?.broken_links)
          ? analysis.broken_links
          : [analysis?.broken_links ?? "None"],
      },
      traffic: {
        avg_session_duration_in_secounds: traffic?.avg_session_duration,
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

    // Generate LLM response with ratings
    console.log("Generating LLM response...");
    const llmResponse = await openai.chat.completions.create({
      model,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: JSON.stringify(allData) },
      ],
    });

    const llmContent = llmResponse.choices[0].message.content
      ? JSON.parse(llmResponse.choices[0].message.content)
      : {};

    // Validate recommendations
    const validatedContent = validateRecommendations(llmContent);

    // Combine output
    const combinedOutput = {
      whats_working: validatedContent.whats_working || {},
      what_needs_fixing: validatedContent.what_needs_fixing || {},
      recommendations: normalizeRecommendations(validatedContent.recommendations),
    };
    if (combinedOutput) {
      console.log("LLM response generated successfully:");
    }
    // Save to database
    console.log("Saving LLM response to database...");
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

    // Update analysis status
      await prisma.analysis_status.upsert({
  where: {
    user_id_website_id: {
      user_id,
      website_id,
    },
  },
  update: {
    dashboard1: "true",
  },
  create: {
    user_id,
    website_id,
    dashboard1: "true",
  },
});
    console.log("LLM response saved successfully for website_id:", website_id);

    return { success: true, data: combinedOutput };
  } catch (err) {
    console.error("LLM Audit Error:", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
};




// // import { Request, Response } from "express";
// // import { PrismaClient } from "@prisma/client";
// // import { OpenAI } from "openai";
// // import * as cheerio from "cheerio";

// // const prisma = new PrismaClient();
// // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// // const model = process.env.OPENAI_MODEL || "gpt-4.1";

// // // Normalize recommendations
// // const normalizeRecommendations = (
// //   input: any
// // ): Record<string, { tag: string; recommendation: string }[]> => {
// //   const result: Record<string, { tag: string; recommendation: string }[]> = {};
// //   for (const [category, items] of Object.entries(input || {})) {
// //     result[category] = [];
// //     for (const item of items as any[]) {
// //       result[category].push({
// //         tag: item.tag || "Untitled",
// //         recommendation: typeof item.recommendation === "string"
// //           ? item.recommendation.trim()
// //           : JSON.stringify(item.recommendation),
// //       });
// //     }
// //   }
// //   return result;
// // };

// // // Validate recommendations to ensure they match what_needs_fixing
// // const validateRecommendations = (output: any) => {
// //   const issues = new Set(Object.keys(output.what_needs_fixing || {}));
// //   const recommendations = output.recommendations || {};

// //   // If what_needs_fixing is empty, recommendations must be empty
// //   if (issues.size === 0) {
// //     if (Object.keys(recommendations).length > 0) {
// //       console.warn("what_needs_fixing is empty, but recommendations are not. Clearing recommendations.");
// //       output.recommendations = {};
// //     }
// //     return output;
// //   }

// //   // Validate each recommendation tag
// //   for (const [category, recs] of Object.entries(recommendations)) {
// //     for (const rec of recs as any[]) {
// //       if (!issues.has(rec.tag)) {
// //         console.warn(`Recommendation tag "${rec.tag}" does not match any issue in what_needs_fixing`);
// //         output.recommendations[category] = (output.recommendations[category] || []).filter(
// //           (r: any) => r.tag !== rec.tag
// //         );
// //       }
// //     }
// //     if (output.recommendations[category].length === 0) {
// //       delete output.recommendations[category];
// //     }
// //   }

// //   return output;
// // };

// // // LLM prompt with detailed explanations and recommendations
// // const prompt = `
// // You are a senior technical SEO expert with extensive experience in metadata, accessibility, structured data, web vitals, and analytics.

// // Each element you describe will be rated numerically from 1 to 10 based on its performance:
// // - For **whats_working**: Assign ratings from 7 to 10:
// //   - 10 = Excellent (e.g., perfect implementation, optimal performance)
// //   - 9 = Strong (e.g., very good with minor room for improvement)
// //   - 8 = Good (e.g., solid but not exceptional)
// //   - 7 = Adequate (e.g., functional but could be enhanced)
// // - For **what_needs_fixing**: Assign ratings from 1 to 5:
// //   - 1 = Missing/Broken (e.g., completely absent or non-functional)
// //   - 2 = Poor (e.g., present but severely flawed)
// //   - 3 = Fair (e.g., functional but with significant issues)
// //   - 4 = Needs Improvement (e.g., minor issues)
// //   - 5 = Borderline (e.g., barely acceptable)

// // Given the provided JSON input, output a structured JSON response with three keys:

// // 1. **whats_working**: A dictionary of working elements. Each entry must include:
// //    - \`title\`: A short descriptive label (e.g., "Title Tag", "Open Graph Image")
// //    - \`explanation.reason\`: A detailed expert explanation (2-3 sentences) of why it works well, including technical context, impact on SEO/performance/user experience, and specific metrics or examples. Use positive terms like "excellent," "strong," "clear," or "robust."
// //    - \`rating\`: A number from 7 to 10, based on the explanation.reason

// // 2. **what_needs_fixing**: A dictionary of problematic elements. Each must include:
// //    - \`title\`: A clear label (e.g., "Missing og:image")
// //    - \`explanation.reason\`: A detailed expert explanation (2-3 sentences) of why it’s underperforming or incorrect, including technical context, impact on SEO/performance/user experience, and specific metrics or examples. Use terms like "missing," "broken," "poor," or "incomplete."
// //    - \`rating\`: A number from 1 to 5, based on the explanation.reason

// // 3. **recommendations**: A dictionary where keys are categories (e.g., "metadata", "performance") and each value is an array of objects:
// //    - \`tag\`: Must exactly match a \`title\` from what_needs_fixing. Do not include recommendations for issues not listed in what_needs_fixing.
// //    - \`recommendation\`: A detailed, technical, actionable fix (3-4 sentences) that directly addresses the issue described in the corresponding what_needs_fixing.reason. Include specific details like code snippets, configurations, parameters, or validation steps. Avoid generic suggestions like "use a tool."

// // Strictly ensure that every recommendation has a \`tag\` matching a \`title\` in what_needs_fixing. If what_needs_fixing is empty, recommendations must be empty. Avoid ambiguous terms like "present" unless clearly positive or negative. Ensure ratings align with the tone and content of the explanation.reason.

// // Example Output:
// // {
// //   "whats_working": {
// //     "Title Tag": {
// //       "title": "Title Tag",
// //       "explanation.reason": "The title tag is concise (under 60 characters), includes primary keywords, and clearly describes the page’s content, improving click-through rates by up to 20% in search results.",
// //       "rating": 8
// //     },
// //     "HTTPS": {
// //       "title": "HTTPS",
// //       "explanation.reason": "The site uses HTTPS, ensuring secure data transmission and boosting user trust. This aligns with Google’s ranking signal, contributing to a 5-10% SEO advantage.",
// //       "rating": 9
// //     }
// //   },
// //   "what_needs_fixing": {
// //     "Missing og:image": {
// //       "title": "Missing og:image",
// //       "explanation.reason": "No Open Graph image is defined, leading to poor social media previews on platforms like Facebook, which can reduce click-through rates by 30-40%. This impacts social sharing effectiveness.",
// //       "rating": 1
// //     }
// //   },
// //   "recommendations": {
// //     "metadata": [
// //       {
// //         "tag": "Missing og:image",
// //         "recommendation": "Add a meta tag in the <head>: <meta property=\"og:image\" content=\"https://example.com/image.jpg\">. Use a 1200x630px PNG/JPG image (<5MB) that visually represents your brand. Ensure the URL is stable and publicly accessible. Validate the implementation using the Facebook Sharing Debugger to confirm proper rendering."
// //       }
// //     ]
// //   }
// // }

// // Output only valid JSON.
// // `;

// // export const generateLLMTrafficReport = async (website_id: string, user_id: string) => {
// //   if (!website_id || !user_id) {
// //     return Response.json({ error: "Missing website_id or user_id" }, { status: 400 });
// //   }

// //   try {
// //     const [scraped, analysis, traffic] = await Promise.all([
// //       prisma.website_scraped_data.findUnique({ where: { website_id } }),
// //       prisma.brand_website_analysis.findFirst({
// //         where: { website_id },
// //         orderBy: { created_at: "desc" },
// //       }),
// //       prisma.brand_traffic_analysis.findFirst({
// //         where: { website_id },
// //         orderBy: { created_at: "desc" },
// //       }),
// //     ]);

// //     // Extract H1
// //     let h1Text = "Not Found";
// //     if (scraped?.raw_html) {
// //       const $ = cheerio.load(scraped.raw_html);
// //       h1Text = $("h1").first().text().trim() || "Not Found";
// //     }

// //     let optimization_opportunities: any = "None";
// //     if (analysis?.audit_details) {
// //       try {
// //         const auditDetails =
// //           typeof analysis.audit_details === "string"
// //             ? JSON.parse(analysis.audit_details)
// //             : analysis.audit_details;
// //         optimization_opportunities = auditDetails?.optimization_opportunities || "None";
// //       } catch (error) {
// //         console.error("Error parsing audit_details:", error);
// //         optimization_opportunities = "None";
// //       }
// //     }

// //     const allData = {
// //       metadata: {
// //         title: scraped?.page_title ?? "N/A",
// //         description: scraped?.meta_description ?? "N/A",
// //         keywords: scraped?.meta_keywords ?? "N/A",
// //         h1: h1Text,
// //         og: {
// //           title: scraped?.og_title ?? "N/A",
// //           description: scraped?.og_description ?? "N/A",
// //           image: scraped?.og_image ? "Present" : "Missing",
// //         },
// //         schema: scraped?.schema_analysis ?? "None",
// //         ctr_loss_percent: scraped?.ctr_loss_percent ?? "N/A",
// //         homepage_alt_text_coverage: scraped?.homepage_alt_text_coverage ?? "N/A",
// //       },
// //       performance: {
// //         lcp: analysis?.largest_contentful_paint ?? "N/A",
// //         cls: analysis?.cumulative_layout_shift ?? "N/A",
// //         fcp: analysis?.first_contentful_paint ?? "N/A",
// //         speed_index: analysis?.speed_index ?? "N/A",
// //         tti: analysis?.time_to_interactive ?? "N/A",
// //         tbt: analysis?.total_blocking_time ?? "N/A",
// //         performance_score: analysis?.performance_score ?? "N/A",
// //         accessibility_score: analysis?.accessibility_score ?? "N/A",
// //         best_practices_score: analysis?.best_practices_score ?? "N/A",
// //         revenue_loss_percent: analysis?.revenue_loss_percent ?? "N/A",
// //         optimization_opportunities: optimization_opportunities,
// //       },
// //       seo: {
// //         seo_score: analysis?.seo_score ?? "N/A",
// //         broken_links: Array.isArray(analysis?.broken_links)
// //           ? analysis.broken_links
// //           : [analysis?.broken_links ?? "None"],
// //       },
// //       traffic: {
// //         avg_session_duration: traffic?.avg_session_duration,
// //         engagement_rate: traffic?.engagement_rate,
// //         engaged_sessions: traffic?.engaged_sessions,
// //         total_visitors: traffic?.total_visitors,
// //         unique_visitors: traffic?.unassigned,
// //         sources: {
// //           organic: traffic?.organic_search,
// //           direct: traffic?.direct,
// //           referral: traffic?.referral,
// //           social: traffic?.organic_social,
// //         },
// //         new_vs_returning: traffic?.new_vs_returning,
// //         top_countries: traffic?.top_countries,
// //         top_devices: traffic?.top_devices,
// //         top_sources: traffic?.top_sources,
// //       },
// //     };

// //     // Generate LLM response with ratings
// //     const llmResponse = await openai.chat.completions.create({
// //       model,
// //       temperature: 0.5,
// //       response_format: { type: "json_object" },
// //       messages: [
// //         { role: "system", content: prompt },
// //         { role: "user", content: JSON.stringify(allData) },
// //       ],
// //     });

// //     const llmContent = llmResponse.choices[0].message.content
// //       ? JSON.parse(llmResponse.choices[0].message.content)
// //       : {};

// //     // Validate recommendations
// //     const validatedContent = validateRecommendations(llmContent);

// //     // Combine output
// //     const combinedOutput = {
// //       whats_working: validatedContent.whats_working || {},
// //       what_needs_fixing: validatedContent.what_needs_fixing || {},
// //       recommendations: normalizeRecommendations(validatedContent.recommendations),
// //     };

// //     // Save to database
// //     await prisma.llm_responses.upsert({
// //       where: { website_id },
// //       update: {
// //         dashboard1_what_working: JSON.stringify(combinedOutput),
// //       },
// //       create: {
// //         website_id,
// //         dashboard1_what_working: JSON.stringify(combinedOutput),
// //       },
// //     });

// //     return { success: true, data: combinedOutput };
// //   } catch (err) {
// //     console.error("LLM Audit Error:", err);
// //     return Response.json({ error: "Internal Server Error" }, { status: 500 });
// //   }
// // };