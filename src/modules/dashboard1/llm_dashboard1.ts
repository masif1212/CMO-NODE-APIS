// import { Request, Response } from "express";
// import { PrismaClient } from "@prisma/client";
// import { OpenAI } from "openai";
// import * as cheerio from "cheerio";
// import { technical_seo } from "./technical_seo/tech_controller";
// import geo_llm from "./geo/router";

// const prisma = new PrismaClient();
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// const model = process.env.OPENAI_MODEL || "gpt-4.1";

// // Normalize recommendations
// const normalizeRecommendations = (
//   input: any
// ): Record<string, { tag: string; recommendation: string }[]> => {
//   const result: Record<string, { tag: string; recommendation: string }[]> = {};
//   for (const [category, items] of Object.entries(input || {})) {
//     result[category] = [];
//     for (const item of items as any[]) {
//       result[category].push({
//         tag: item.tag || "Untitled",
//         recommendation: typeof item.recommendation === "string"
//           ? item.recommendation.trim()
//           : JSON.stringify(item.recommendation),
//       });
//     }
//   }
//   return result;
// };

// // Validate recommendations to ensure they match what_needs_fixing
// const validateRecommendations = (output: any) => {
//   const issues = new Set(Object.keys(output.what_needs_fixing || {}));
//   const recommendations = output.recommendations || {};

//   // If what_needs_fixing is empty, recommendations must be empty
//   if (issues.size === 0) {
//     if (Object.keys(recommendations).length > 0) {
//       console.warn("what_needs_fixing is empty, but recommendations are not. Clearing recommendations.");
//       output.recommendations = {};
//     }
//     return output;
//   }

//   // Validate each recommendation tag
//   for (const [category, recs] of Object.entries(recommendations)) {
//     for (const rec of recs as any[]) {
//       if (!issues.has(rec.tag)) {
//         console.warn(`Recommendation tag "${rec.tag}" does not match any issue in what_needs_fixing`);
//         output.recommendations[category] = (output.recommendations[category] || []).filter(
//           (r: any) => r.tag !== rec.tag
//         );
//       }
//     }
//     if (output.recommendations[category].length === 0) {
//       delete output.recommendations[category];
//     }
//   }

//   return output;
// };

// // LLM prompt
// const prompt_web_and_seo = `
// You are a senior technical SEO expert with extensive experience in metadata, accessibility, structured data, web vitals, and analytics. You are generating output for a self-contained SEO audit tool that must provide actionable, technical solutions without relying on external tools or services (e.g., PageSpeed Insights, SEMrush, Lighthouse, or similar).
// Handle all elements in the provided JSON input(title,meta data(keywords , descriptions),lcp).
// Each element you describe will be rated numerically from 1 to 10 based on its performance:
// - For **whats_working**: Assign ratings from 7 to 10:
//   - 10 = Excellent (e.g., perfect implementation, optimal performance)
//   - 9 = Strong (e.g., very good with minor room for improvement)
//   - 8 = Good (e.g., solid but not exceptional)
//   - 7 = Adequate (e.g., functional but could be enhanced)
// - For **what_needs_fixing**: Assign ratings from 1 to 5:
//   - 1 = Missing/Broken (e.g., completely absent or non-functional)
//   - 2 = Poor (e.g., present but severely flawed)
//   - 3 = Fair (e.g., functional but with significant issues)
//   - 4 = Needs Improvement (e.g., minor issues)
//   - 5 = Borderline (e.g., barely acceptable)


//   Given the provided JSON input, output a structured JSON response with three keys:

// 1. **whats_working**: A dictionary of working elements. Each entry must include:
//    - \`title\`: A short descriptive label (e.g., "Title Tag", "Open Graph Image")
//    - \`explanation_reason\`: A detailed explanation (2-3 sentences) of why it works well, including technical context, impact on SEO/performance/user experience, and specific metrics or examples (e.g., "improves click-through rates by 20%"). Use positive terms like "excellent," "strong," "clear," or "robust." Do not mention external tools or services.
//    - \`rating\`: A number from 7 to 10, based on the explanation_reason

// 2. **what_needs_fixing**: A dictionary of problematic elements. Each must include:
//    - \`title\`: A clear label (e.g., "Missing og:image")(e.g., "organic visitors too low")
//    - \`explanation_reason\`: A detailed explanation (2-3 sentences) of why it’s underperforming or incorrect, including technical context, impact on SEO/performance/user experience, and specific metrics or examples (e.g., "reduces click-through rates by 30-40%"). Use terms like "missing," "broken," "poor," or "incomplete." Do not mention external tools or services.
//    - \`rating\`: A number from 1 to 5, based on the explanation_reason

// 3. **recommendations**: A dictionary where keys are categories ( "Analytics:", "website audit","Traffic Anaylsis","OnPage Optimization","Technical SEO","GEO") and each value is an array of objects:
//    - \`tag\`: Must exactly match a \`title\` from what_needs_fixing. Do not include recommendations for issues not listed in what_needs_fixing.
//    - \`recommendation\`: A detailed, technical, actionable fix (3-4 sentences) that directly addresses the issue in the corresponding what_needs_fixing_reason. Include specific details like code snippets, configurations, or parameters. Provide manual validation steps (e.g., "Check the HTML source for the meta tag") instead of referencing external tools or services.


// **Evaluation Criteria**:


// - **Analytics**:
//   - CTR Loss: <5% (10); 5–10% (5); >10% (2); missing (3)
//   - Revenue Loss: <10% (10); 10–20% (5); >20% (2); missing (3)

// - **website audit**:
//   - LCP: <2.5s (10); 2.5–4s (5); >4s (1); missing (3)
//   - CLS: <0.1 (10); 0.1–0.25 (5); >0.25 (1); missing (3)
//   - FCP: <1.8s (10); 1.8–3s (5); >3s (1); missing (3)
//   - TTI: <3.8s (10); 3.8–7.8s (5); >7.8s (1); missing (3)
//   - TBT: <200ms (10); 200–500ms (5); >500ms (1); missing (3)
//   - Performance: >90 (10); 50–89 (5); <50 (1); missing (3)
//   -Optimization Oppurtunities 


// - **Traffic Anaylsis**:
// - Avg Session Duration: >3 min (10); 1–3 min (7); <1 min (3); missing (3)
//   - Engagement Rate: >50% (10); 30–50% (5); <30% (2); missing (3)
//   - Organic Traffic: >50% of total (10); 20–50% (5); <20% (2); missing (3)
//   - Total Visitors: >10,000 monthly (10); 1,000–10,000 (5–7); <1,000 (3); missing (3)
//   - New vs. Returning: Balanced (40–60%) (10); skewed (>80% new) (5); missing (3)
//   - bounce rate 
  


// - **OnPage Optimization**  
//   - Title: <60 chars, keyword-rich (8–10); 60–70 chars (5–7); >70 or missing (1–3)
//   - Description: 150–160 chars, compelling (8–10); <120 or >160 (5–7); missing (1–4)
//   - H1: Present, unique, keyword-aligned (7–9); missing (0–4)
//   - Alt Text Coverage: >90% (10); 70–90% (7); <70% (3); missing (3)
//   - og: {
//             title: scraped?.og_title ?? "N/A",
//             description: scraped?.og_description ?? "N/A",
//             image: scraped?.og_image ? "Present" : "Missing",
//           },


// - **Technical SEO**:
//   - Schema: Valid JSON-LD (10); invalid (3); missing (1)-(refer this as chatbot crawlability
  
//   - Broken Links: None (10); 1–3 (5); >3 (1); missing (5)

// - **GEO**:
//   - Schema: Valid JSON-LD (10); invalid (3); missing (1)
//   - AI_Discoverability (visibility on openai search)

  


// Strictly ensure every recommendation has a \`tag\` matching a \`title\` in what_needs_fixing. If what_needs_fixing is empty, recommendations must be empty. Avoid ambiguous terms like "present" unless clearly positive or negative. Ensure ratings align with the tone and content of the explanation.reason. Never recommend using external tools or services like PageSpeed Insights, SEMrush, Lighthouse, or similar.

// Example Output:
// {
//   "whats_working": {
//     "OnPage Optimization": {
//       "title": "Title Tag",
//       "explanation_reason": "The title tag is concise (under 60 characters) and includes primary keywords, enhancing search visibility. This improves click-through rates by approximately 20% in search results, supporting SEO goals.",
//       "rating": 8
//     },
//     "HTTPS": {
//       "title": "HTTPS",
//       "explanation_reason": "The site uses HTTPS, ensuring secure data transmission and boosting user trust. This aligns with search engine ranking signals, providing a 5-10% SEO advantage.",
//       "rating": 9
//     }
//   },
//   "what_needs_fixing": {
//     "OnPage Optimization": {
//       "title": "Missing og:image",
//       "explanation_reason": "No Open Graph image is defined, resulting in poor social media previews on platforms like Facebook and Twitter. This can reduce click-through rates from social shares by 30-40%, impacting brand visibility.",
//       "rating": 1
//     }
//   },
//   "recommendations": {
//     "OnPage Optimization": [
//       {
//         "tag": "Missing og:image",
//         "recommendation": "Add a meta tag in the <head>: <meta property=\"og:image\" content=\"https://example.com/image.jpg\">. Use a 1200x630px PNG/JPG image (<5MB) that visually represents your brand with minimal text overlay. Ensure the URL is stable and publicly accessible. Verify the tag is correctly implemented by checking the HTML source code."
//       }
//     ]
//   }
// }

// Output only valid JSON.
// `;


// const prompt_web_only = `
// You are a senior technical SEO expert with extensive experience in web vitals, and analytics. You are generating output for a self-contained Web audit tool that must provide actionable, technical solutions without relying on external tools or services (e.g., PageSpeed Insights, SEMrush, Lighthouse, or similar).
// Handle all elements in the provided JSON input(.
// Each element you describe will be rated numerically from 1 to 10 based on its performance:
// - For **whats_working**: Assign ratings from 7 to 10:
//   - 10 = Excellent (e.g., perfect implementation, optimal performance)
//   - 9 = Strong (e.g., very good with minor room for improvement)
//   - 8 = Good (e.g., solid but not exceptional)
//   - 7 = Adequate (e.g., functional but could be enhanced)
// - For **what_needs_fixing**: Assign ratings from 1 to 5:
//   - 1 = Missing/Broken (e.g., completely absent or non-functional)
//   - 2 = Poor (e.g., present but severely flawed)
//   - 3 = Fair (e.g., functional but with significant issues)
//   - 4 = Needs Improvement (e.g., minor issues)
//   - 5 = Borderline (e.g., barely acceptable)


//   Given the provided JSON input, output a structured JSON response with three keys:

// 1. **whats_working**: A dictionary of working elements. Each entry must include:
//    - \`title\`: A short descriptive label (e.g., "Title Tag", "Open Graph Image")
//    - \`explanation_reason\`: A detailed explanation (2-3 sentences) of why it works well, including technical context, impact on SEO/performance/user experience, and specific metrics or examples (e.g., "improves click-through rates by 20%"). Use positive terms like "excellent," "strong," "clear," or "robust." Do not mention external tools or services.
//    - \`rating\`: A number from 7 to 10, based on the explanation_reason

// 2. **what_needs_fixing**: A dictionary of problematic elements. Each must include:
//    - \`title\`: A clear label (e.g., "Missing og:image")(e.g., "organic visitors too low")
//    - \`explanation_reason\`: A detailed explanation (2-3 sentences) of why it’s underperforming or incorrect, including technical context, impact on SEO/performance/user experience, and specific metrics or examples (e.g., "reduces click-through rates by 30-40%"). Use terms like "missing," "broken," "poor," or "incomplete." Do not mention external tools or services.
//    - \`rating\`: A number from 1 to 5, based on the explanation_reason

// 3. **recommendations**: A dictionary where keys are categories ("Analytics", "website audit") and each value is an array of objects:
//    - \`tag\`: Must exactly match a \`title\` from what_needs_fixing. Do not include recommendations for issues not listed in what_needs_fixing.
//    - \`recommendation\`: A detailed, technical, actionable fix (3-4 sentences) that directly addresses the issue in the corresponding what_needs_fixing_reason. Include specific details like  configurations, or parameters. Provide manual validation steps (e.g., "Check the HTML source for the meta tag") instead of referencing external tools or services.


// **Evaluation Criteria**:

// - **Analytics**:
//   - CTR Loss: <5% (10); 5–10% (5); >10% (2); missing (3)
//   - Revenue Loss: <10% (10); 10–20% (5); >20% (2); missing (3)

// - **website audit**:
//   - LCP: <2.5s (10); 2.5–4s (5); >4s (1); missing (3)
//   - CLS: <0.1 (10); 0.1–0.25 (5); >0.25 (1); missing (3)
//   - FCP: <1.8s (10); 1.8–3s (5); >3s (1); missing (3)
//   - TTI: <3.8s (10); 3.8–7.8s (5); >7.8s (1); missing (3)
//   - TBT: <200ms (10); 200–500ms (5); >500ms (1); missing (3)
//   - Performance: >90 (10); 50–89 (5); <50 (1); missing (3)
//   - Optimization Oppurtunities (focus audit )

// Strictly ensure every recommendation has a \`tag\` matching a \`title\` in what_needs_fixing. If what_needs_fixing is empty, recommendations must be empty. Avoid ambiguous terms like "present" unless clearly positive or negative. Ensure ratings align with the tone and content of the explanation.reason. Never recommend using external tools or services like PageSpeed Insights, SEMrush, Lighthouse, or similar.

// Example Output:
// {
//   "whats_working": {
//     "Title Tag": {
//       "title": "Title Tag",
//       "explanation_reason": "The title tag is concise (under 60 characters) and includes primary keywords, enhancing search visibility. This improves click-through rates by approximately 20% in search results, supporting SEO goals.",
//       "rating": 8
//     },
//     "HTTPS": {
//       "title": "HTTPS",
//       "explanation_reason": "The site uses HTTPS, ensuring secure data transmission and boosting user trust. This aligns with search engine ranking signals, providing a 5-10% SEO advantage.",
//       "rating": 9
//     }
//   },
//  {
//   "what_needs_fixing": {
//     "website audit": {
//       "title": "Low LCP",
//       "explanation_reason": "Largest Contentful Paint (LCP) measures loading performance. A low LCP score means your site takes too long to show the main content, leading to poor user experience and potentially lower SEO rankings.",
//       "rating": 1
//     }
//   },
//   "recommendations": {
//     "website audit": [
//       {
//         "tag": "Low LCP",
//         "recommendation": "Optimize LCP by reducing server response time (use caching and faster hosting), compressing and preloading critical images, minimizing render-blocking CSS/JavaScript, and using a Content Delivery Network (CDN). Ensure your largest visible element (like a hero image or heading) loads quickly. Test improvements using tools like Google PageSpeed Insights or Lighthouse."
//       }
    
//     ]
//   }
// }

// Output only valid JSON.
// `;






// export const generateLLMTrafficReport = async (website_id: string, user_id: string) => {
//   if (!website_id || !user_id) {
//     return Response.json({ error: "Missing website_id or user_id" }, { status: 400 });
//   } else {
//     console.log("Report generation started for website_id:", website_id);
//   }

//   try {
//     // Check SEO audit status
//     const analysisStatus = await prisma.analysis_status.findUnique({
//       where: {
//         user_id_website_id: {
//           user_id,
//           website_id,
//         },
//       },
//       select: {
//         seo_audit: true,
//       },
//     });

//     const isSeoAuditEnabled = analysisStatus?.seo_audit != null;
//     console.log("isSeoAuditEnabled",isSeoAuditEnabled)
//     // Fetch data based on SEO audit status
//     // const [scraped, analysis, traffic] = await Promise.all([
//     //   prisma.website_scraped_data.findUnique({ where: { website_id } }),
//     //   isSeoAuditEnabled
//     //     ? prisma.brand_website_analysis.findFirst({
//     //         where: { website_id },
//     //         orderBy: { created_at: "desc" },
//     //       })
//     //     : null,
//     //   isSeoAuditEnabled // Only fetch traffic data if SEO audit is enabled
//     //     ? prisma.brand_traffic_analysis.findFirst({
//     //         where: { website_id },
//     //         orderBy: { created_at: "desc" },
//     //       })
//     //     : null,

        
//     // ]);


//     const [scraped, analysis, traffic, llm_Response] = await Promise.all([
//   prisma.website_scraped_data.findUnique({ where: { website_id } }),
  
//     prisma.brand_website_analysis.findFirst({
//         where: { website_id },
//         orderBy: { created_at: "desc" },
//       }),
    

//   isSeoAuditEnabled
//     ? prisma.brand_traffic_analysis.findFirst({
//         where: { website_id },
//         orderBy: { created_at: "desc" },
//       })
//     : null,

//   isSeoAuditEnabled
//     ? prisma.llm_responses.findFirst({
//         where: { website_id },
//         orderBy: { created_at: "desc" },
//         select: {
//         geo_llm: true,
//       },
//       })
//     : null,
// ]);

//     // Extract H1
//     let h1Text = "Not Found";
//     if (scraped?.raw_html) {
//       const $ = cheerio.load(scraped.raw_html);
//       h1Text = $("h1").first().text().trim() || "Not Found";
//     }

//     let optimization_opportunities: any = "None";
//     if (isSeoAuditEnabled && analysis?.audit_details) {
//       try {
//         const auditDetails =
//           typeof analysis.audit_details === "string"
//             ? JSON.parse(analysis.audit_details)
//             : analysis.audit_details;
//         optimization_opportunities = auditDetails?.optimization_opportunities || "None";
//       } catch (error) {
//         console.error("Error parsing audit_details:", error);
//         optimization_opportunities = "None";
//       }
//     }


//     let user_access_readiness: any = "None";
//     if (isSeoAuditEnabled && analysis?.audit_details) {
//       try {
//         const auditDetails =
//           typeof analysis.audit_details === "string"
//             ? JSON.parse(analysis.audit_details)
//             : analysis.audit_details;
//         user_access_readiness = auditDetails?.user_access_readiness || "None";
//       } catch (error) {
//         console.error("Error parsing audit_details:", error);
//         user_access_readiness = "None";
//       }
//     }

//     // Dynamically construct allData based on isSeoAuditEnabled
//     const allData: any = {
//       Analytics:{
//          revenue_loss_definition: `*Formula:*

// 1.  *Average Revenue Conversion Loss (Percentage):*
//     RevenueLoss% = ((LCP - 2.5) × 7) + (((TBT - 200) / 100) × 3) + (CLS × 10)

// *Assumptions and Metric Impacts:*

// * *LCP (Largest Contentful Paint):*
//     * *Threshold:* 2.5 seconds (s)
//     * *Impact:* For every 1 second (s) that LCP exceeds 2.5s, there is an estimated 7% drop in conversions.
// * *TBT (Total Blocking Time):*
//     * *Threshold:* 200 milliseconds (ms)
//     * *Impact:* For every 100 milliseconds (ms) that TBT exceeds 200ms, there is an estimated 3% drop in conversions.
// * *CLS (Cumulative Layout Shift):*
//     * *Threshold:* 0.1 units
//     * *Impact:* For every 1.0 unit increase in CLS, there is an estimated 10% drop in conversions.

// *Interpretation of Results:*

// * *Positive RevenueLoss%:*
//     * A positive result indicates a *projected revenue loss* due to the current performance metrics exceeding the defined thresholds. The higher the positive number, the greater the anticipated negative impact on conversion rates, and by extension, revenue.
// * *Negative RevenueLoss%:*
//     * A negative result indicates that the current performance metrics are *better than the defined thresholds*.
//     * This suggests that these specific performance aspects are not contributing to conversion loss, and may even be positively impacting user experience, leading to potentially higher conversions. In essence, a negative value signifies a "good" or "optimal" performance state relative to these thresholds, indicating no estimated revenue loss from these factors. 
//         Current value: ${analysis?.revenue_loss_percent ?? "N/A"}%`,
//        ctr_loss_percent: scraped?.ctr_loss_percent ?? "N/A",

//       },

//       website_audit:
//       {
//        lcp: analysis?.largest_contentful_paint ?? "N/A",
//         cls: analysis?.cumulative_layout_shift ?? "N/A",
//         fcp: analysis?.first_contentful_paint ?? "N/A",
//         speed_index: analysis?.speed_index ?? "N/A",
//         tti: analysis?.time_to_interactive ?? "N/A",
//         tbt: analysis?.total_blocking_time ?? "N/A",
//         performance_score: analysis?.performance_score ?? "N/A",
//         // accessibility_score: analysis?.accessibility_score ?? "N/A",
//         // best_practices_score: analysis?.best_practices_score ?? "N/A",
       
//         optimization_opportunities: optimization_opportunities,
//       }}

     

//     if (isSeoAuditEnabled && traffic) {
//     allData.traffic = {
//       avg_session_duration_in_seconds: traffic?.avg_session_duration ?? "N/A",
//       engagement_rate: traffic?.engagement_rate ?? "N/A",
//       engaged_sessions: traffic?.engaged_sessions ?? "N/A",
//       total_visitors: traffic?.total_visitors ?? "N/A",
//       unique_visitors: traffic?.unassigned ?? "N/A",
//       sources: {
//         organic: traffic?.organic_search ?? "N/A",
//         direct: traffic?.direct ?? "N/A",
//         referral: traffic?.referral ?? "N/A",
//         social: traffic?.organic_social ?? "N/A",
//       },
//       new_vs_returning: traffic?.new_vs_returning ?? "N/A",
//       top_countries: traffic?.top_countries ?? "N/A",
//       top_devices: traffic?.top_devices ?? "N/A",
      
//     };

//   allData.onpage_opptimization = {
//     title: scraped?.page_title ?? "N/A",
//     description: scraped?.meta_description ?? "N/A",
//     keywords: scraped?.meta_keywords ?? "N/A",
//     h1: h1Text,
//     og: {
//       title: scraped?.og_title ?? "N/A",
//       description: scraped?.og_description ?? "N/A",
//       image: scraped?.og_image ? "Present" : "Missing",
//     },
//     homepage_alt_text_coverage: scraped?.homepage_alt_text_coverage ?? "N/A",
//   };

//   allData.technical_seo = {
//     schema: scraped?.schema_analysis ?? "None",
//     no_of_broken_links: analysis?.total_broken_links ?? "N/A",
//     broken_links: analysis?.broken_links ?? "N/A",
//     user_access_readiness: user_access_readiness ?? "none",
//   };

//   allData.Geo = {
//     schema: scraped?.schema_analysis ?? "None",
//     AI_discovilibilty: llm_Response?.geo_llm ?? "none",
//     appears_accross_bing:traffic?.top_sources ?? "N/A",// ← You need to define this value
//   };
// }


//     // if (isSeoAuditEnabled && traffic) {
//     //   allData.traffic = {
//     //     avg_session_duration_in_seconds: traffic?.avg_session_duration ?? "N/A",
//     //     engagement_rate: traffic?.engagement_rate ?? "N/A",
//     //     engaged_sessions: traffic?.engaged_sessions ?? "N/A",
//     //     total_visitors: traffic?.total_visitors ?? "N/A",
//     //     unique_visitors: traffic?.unassigned ?? "N/A",
//     //     sources: {
//     //       organic: traffic?.organic_search ?? "N/A",
//     //       direct: traffic?.direct ?? "N/A",
//     //       referral: traffic?.referral ?? "N/A",
//     //       social: traffic?.organic_social ?? "N/A",
//     //     },
//     //     new_vs_returning: traffic?.new_vs_returning ?? "N/A",
//     //     top_countries: traffic?.top_countries ?? "N/A",
//     //     top_devices: traffic?.top_devices ?? "N/A",
//     //     top_sources: traffic?.top_sources ?? "N/A",
//     //   },
//     //    onpage_opptimization: {
//     //     title: scraped?.page_title ?? "N/A",
//     //     description: scraped?.meta_description ?? "N/A",
//     //     keywords: scraped?.meta_keywords ?? "N/A",
//     //     h1: h1Text,
//     //     og: {
//     //       title: scraped?.og_title ?? "N/A",
//     //       description: scraped?.og_description ?? "N/A",
//     //       image: scraped?.og_image ? "Present" : "Missing",
//     //     },
//     //     homepage_alt_text_coverage: scraped?.homepage_alt_text_coverage ?? "N/A",
        
//     //   },
//     //   technical_seo:{
//     //             schema: scraped?.schema_analysis ?? "None",
//     //             no_of_broken_links:analysis?.total_broken_links ?? "N/A",
//     //             broken_links:analysis?.broken_links ?? "N/A",
//     //             user_access_readiness:user_access_readiness??"none",


//     //   },
//     //   Geo:{
//     //     schema: scraped?.schema_analysis ?? "None",
//     //     AI_discovilibilty : llm_Response?.geo_llm ?? "none",
//     //     appears_accross_bing :
//     //   }
//     // };
//     // }

//     // Define prompts
//     const seoEnabledPrompt = prompt_web_and_seo; // Original prompt for SEO-enabled case
//     const seoDisabledPrompt = prompt_web_only;

//     // Generate LLM response with ratings
//     console.log("Generating LLM response...");
//     const llmResponse = await openai.chat.completions.create({
//       model,
//       temperature: 0.5,
//       response_format: { type: "json_object" },
//       messages: [
//         {
//           role: "system",
//           content: isSeoAuditEnabled ? seoEnabledPrompt : seoDisabledPrompt,
//         },
//         { role: "user", content: JSON.stringify(allData) },
//       ],
//     });

//     const llmContent = llmResponse.choices[0].message.content
//       ? JSON.parse(llmResponse.choices[0].message.content)
//       : { whats_working: {}, what_needs_fixing: {}, recommendations: [] };

//     // Validate recommendations
//     const validatedContent = validateRecommendations(llmContent);

//     // Combine output, ensuring consistent structure
//     const combinedOutput = {
//       whats_working: validatedContent.whats_working || {},
//       what_needs_fixing: validatedContent.what_needs_fixing || {},
//       recommendations: normalizeRecommendations(validatedContent.recommendations) || [],
//     };
//     if (combinedOutput) {
//       console.log("LLM response generated successfully:");
//     }

//     // Save to database
//     console.log("Saving LLM response to database...");
//     await prisma.llm_responses.upsert({
//       where: { website_id },
//       update: {
//         recommendation_by_mo_dashboard1: JSON.stringify(combinedOutput),
//       },
//       create: {
//         website_id,
//         recommendation_by_mo_dashboard1: JSON.stringify(combinedOutput),
//       },
//     });

//     // Update analysis status
//     await prisma.analysis_status.upsert({
//       where: {
//         user_id_website_id: {
//           user_id,
//           website_id,
//         },
//       },
//       update: {
//         recommendation_by_mo1: "true",
//       },
//       create: {
//         user_id,
//         website_id,
//         recommendation_by_mo1: "true",
//       },
//     });
//     console.log("LLM response saved successfully for website_id:", website_id);

//     return { success: true, data: combinedOutput };
//   } catch (err) {
//     console.error("LLM Audit Error:", err);
//     return Response.json({ error: "Internal Server Error" }, { status: 500 });
//   }
// };





import { PrismaClient } from "@prisma/client";
import { OpenAI } from "openai";
import * as cheerio from "cheerio";

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = process.env.OPENAI_MODEL || "gpt-4.1";

// Prompt for web-only audit
const prompt_web_only = `
You are a senior technical SEO expert with extensive experience in web vitals and analytics. You are generating output for a self-contained web audit tool that must provide actionable, technical solutions without relying on external tools or services (e.g., PageSpeed Insights, SEMrush, Lighthouse, or similar).
Handle all elements in the provided JSON input.

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

1. **whats_working**: A dictionary where keys are categories ("Analytics", "website audit") and each value is an array of objects. Each object must include:
   - \`tag\`: A short descriptive label (e.g., "LCP", "CLS")
   - \`explanation_reason\`: A detailed explanation (2-3 sentences) of why it works well, including technical context, impact on SEO/performance/user experience, and specific metrics or examples (e.g., "improves click-through rates by 20%"). Use positive terms like "excellent," "strong," "clear," or "robust." Do not mention external tools or services.
   - \`rating\`: A number from 7 to 10, based on the explanation_reason

2. **what_needs_fixing**: A dictionary where keys are categories ("Analytics", "website audit") and each value is an array of objects. Each object must include:
   - \`tag\`: A clear label (e.g., "TBT", "TTI")
   - \`explanation_reason\`: A detailed explanation (2-3 sentences) of why it’s underperforming or incorrect, including technical context, impact on SEO/performance/user experience, and specific metrics or examples (e.g., "reduces click-through rates by 30-40%"). Use terms like "missing," "broken," "poor," or "incomplete." Do not mention external tools or services.
   - \`rating\`: A number from 1 to 5, based on the explanation_reason

3. **recommendations**: A dictionary where keys are categories ("Analytics", "website audit") and each value is an array of objects:
   - \`tag\`: Must exactly match a \`tag\` from what_needs_fixing in the same category. Do not include recommendations for issues not listed in what_needs_fixing.
   - \`recommendation\`: A detailed, technical, actionable fix (3-4 sentences) that directly addresses the issue in the corresponding what_needs_fixing explanation_reason. Include specific details like configurations or parameters. Provide manual validation steps (e.g., "Check the HTML source for the meta tag") instead of referencing external tools or services.

**Evaluation Criteria**:
- **Analytics**:
  - CTR Loss: <5% (10); 5–10% (5); >10% (2); missing (3)
  - Revenue Loss: <10% (10); 10–20% (5); >20% (2); missing (3)
- **website audit**:
  - LCP: <2.5s (10); 2.5–4s (5); >4s (1); missing (3)
  - CLS: <0.1 (10); 0.1–0.25 (5); >0.25 (1); missing (3)
  - FCP: <1.8s (10); 1.8–3s (5); >3s (1); missing (3)
  - TTI: <3.8s (10); 3.8–7.8s (5); >7.8s (1); missing (3)
  - TBT: <200ms (10); 200–500ms (5); >500ms (1); missing (3)
  - Performance: >90 (10); 50–89 (5); <50 (1); missing (3)

Strictly ensure every recommendation has a \`tag\` matching a \`tag\` in what_needs_fixing for the same category. If what_needs_fixing is empty for a category, recommendations for that category must be empty. Avoid ambiguous terms like "present" unless clearly positive or negative. Ensure ratings align with the tone and content of the explanation_reason. Never recommend using external tools or services like PageSpeed Insights, SEMrush, Lighthouse, or similar.

Example Output:
{
  "whats_working": {
    "website audit": [
      {
        "tag": "CTR Loss",
        "explanation_reason": "The click-through rate (CTR) loss is 0%, indicating that all key pages are performing optimally in attracting clicks from search results. This strong performance suggests that metadata, snippets, and search presentation are clear and compelling, resulting in no measurable drop in organic traffic due to CTR issues.",
        "rating": 10
      },
      {
        "tag": "LCP",
        "explanation_reason": "Largest Contentful Paint (LCP) is 1.6 seconds, which is well below the 2.5-second threshold. This excellent loading speed ensures users see the main content quickly, improving user experience and positively impacting SEO rankings.",
        "rating": 10
      },
      {
        "tag": "CLS",
        "explanation_reason": "Cumulative Layout Shift (CLS) is 0.004, far below the 0.1 threshold. This outstanding stability means users experience almost no unexpected layout shifts, resulting in a seamless and frustration-free browsing experience.",
        "rating": 10
      },
      {
        "tag": "FCP",
        "explanation_reason": "First Contentful Paint (FCP) is 1.1 seconds, which is significantly faster than the 1.8-second benchmark. This strong performance ensures that users see visual feedback quickly, reducing perceived load times and supporting user retention.",
        "rating": 10
      }
    ]
  },
  "what_needs_fixing": {
    "website audit": [
      {
        "tag": "TBT",
        "explanation_reason": "Total Blocking Time (TBT) is 600ms, exceeding the 200ms threshold. This delays interactivity, causing user frustration and potentially increasing bounce rates by 15-20%.",
        "rating": 1
      },
      {
        "tag": "TTI",
        "explanation_reason": "Time to Interactive (TTI) is 8.5 seconds, far above the 3.8-second threshold. This slow interactivity leads to poor user experience, increasing the likelihood of users abandoning the site before it becomes fully interactive.",
        "rating": 1
      },
      {
        "tag": "Performance Score",
        "explanation_reason": "The overall performance score is 45, well below the 90 threshold for optimal performance. This indicates multiple bottlenecks in loading and interactivity, negatively affecting SEO and user retention.",
        "rating": 1
      }
    ]
  },
  "recommendations": {
    "website audit": [
      {
        "tag": "TBT",
        "recommendation": "Lower Total Blocking Time by identifying and optimizing heavy JavaScript tasks. Split large scripts into smaller, asynchronous chunks, and defer non-essential JS until after the main content loads. Limit the use of synchronous third-party scripts and remove unnecessary polyfills. Use your browser's Performance panel to manually inspect long tasks and verify that main-thread blocking is minimized."
      },
      {
        "tag": "TTI",
        "recommendation": "Improve Time to Interactive by streamlining critical rendering paths and reducing JavaScript execution during page load. Prioritize loading essential resources, and delay non-interactive scripts until after the page becomes interactive. Regularly audit your code for unnecessary dependencies and optimize event handling to ensure a faster interactive state. Manually test page responsiveness by interacting with elements immediately after load to confirm improvements."
      },
      {
        "tag": "Performance Score",
        "recommendation": "Increase the overall performance score by addressing the most impactful bottlenecks, especially TBT and TTI. Audit your resource loading order, minimize render-blocking assets, and leverage efficient caching strategies. Regularly review your HTML, CSS, and JavaScript for redundant or inefficient code, and optimize image delivery. Validate improvements by monitoring load and interactivity times directly in the browser's network and performance panels."
      }
    ]
  }
}

Output only valid JSON.
`;

const prompt_web_and_seo = `
You are a senior technical SEO expert with extensive experience in metadata, accessibility, structured data, web vitals, and analytics. You are generating output for a self-contained SEO audit and web audit tool that must provide actionable, technical solutions without relying on external tools or services (e.g., PageSpeed Insights, SEMrush, Lighthouse, or similar).
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

1. **whats_working**: A dictionary where keys are categories ("Analytics", "website audit") and each value is an array of objects. Each object must include:
   - \`tag\`: A short descriptive label (e.g., "LCP", "CLS")
   - \`explanation_reason\`: A detailed explanation (2-3 sentences) of why it works well, including technical context, impact on SEO/performance/user experience, and specific metrics or examples (e.g., "improves click-through rates by 20%"). Use positive terms like "excellent," "strong," "clear," or "robust." Do not mention external tools or services.
   - \`rating\`: A number from 7 to 10, based on the explanation_reason

2. **what_needs_fixing**: A dictionary where keys are categories ("Analytics", "website audit") and each value is an array of objects. Each object must include:
   - \`tag\`: A clear label (e.g., "TBT", "TTI")
   - \`explanation_reason\`: A detailed explanation (2-3 sentences) of why it’s underperforming or incorrect, including technical context, impact on SEO/performance/user experience, and specific metrics or examples (e.g., "reduces click-through rates by 30-40%"). Use terms like "missing," "broken," "poor," or "incomplete." Do not mention external tools or services.
   - \`rating\`: A number from 1 to 5, based on the explanation_reason

3. **recommendations**: A dictionary where keys are categories ("Analytics", "website audit") and each value is an array of objects:
   - \`tag\`: Must exactly match a \`tag\` from what_needs_fixing in the same category. Do not include recommendations for issues not listed in what_needs_fixing.
   - \`recommendation\`: A detailed, technical, actionable fix (3-4 sentences) that directly addresses the issue in the corresponding what_needs_fixing explanation_reason. Include specific details like configurations or parameters. Provide manual validation steps (e.g., "Check the HTML source for the meta tag") instead of referencing external tools or services.

**Evaluation Criteria**:
- **Analytics**:
  - CTR Loss: <5% (10); 5–10% (5); >10% (2); missing (3)
  - Revenue Loss: <10% (10); 10–20% (5); >20% (2); missing (3)


- **website audit**:
  - LCP: <2.5s (10); 2.5–4s (5); >4s (1); missing (3)
  - CLS: <0.1 (10); 0.1–0.25 (5); >0.25 (1); missing (3)
  - FCP: <1.8s (10); 1.8–3s (5); >3s (1); missing (3)
  - TTI: <3.8s (10); 3.8–7.8s (5); >7.8s (1); missing (3)
  - TBT: <200ms (10); 200–500ms (5); >500ms (1); missing (3)
  - Performance: >90 (10); 50–89 (5); <50 (1); missing (3)

  
- **Traffic Anaylsis**:
- Avg Session Duration: >3 min (10); 1–3 min (7); <1 min (3); missing (3)
  - Engagement Rate: >50% (10); 30–50% (5); <30% (2); missing (3)
  - Organic Traffic: >50% of total (10); 20–50% (5); <20% (2); missing (3)
  - Total Visitors: >10,000 monthly (10); 1,000–10,000 (5–7); <1,000 (3); missing (3)
  - New vs. Returning: Balanced (40–60%) (10); skewed (>80% new) (5); missing (3)
  - bounce rate 
  


- **OnPage Optimization**  
  - Title: <60 chars, keyword-rich (8–10); 60–70 chars (5–7); >70 or missing (1–3)
  - Description: 150–160 chars, compelling (8–10); <120 or >160 (5–7); missing (1–4)
  - H1: Present, unique, keyword-aligned (7–9); missing (0–4)
  - Alt Text Coverage: >90% (10); 70–90% (7); <70% (3); missing (3)
  - og: {
            title: scraped?.og_title ?? "N/A",
            description: scraped?.og_description ?? "N/A",
            image: scraped?.og_image ? "Present" : "Missing",
          },


- **Technical SEO**:
  - Schema: Valid JSON-LD (10); invalid (3); missing (1)-(refer this as chatbot crawlability
  
  - Broken Links: None (10); 1–3 (5); >3 (1); missing (5)

- **GEO**:
  - Schema: Valid JSON-LD (10); invalid (3); missing (1)
  - AI_Discoverability (visibility on openai search)

  

Strictly ensure every recommendation has a \`tag\` matching a \`tag\` in what_needs_fixing for the same category. If what_needs_fixing is empty for a category, recommendations for that category must be empty. Avoid ambiguous terms like "present" unless clearly positive or negative. Ensure ratings align with the tone and content of the explanation_reason. Never recommend using external tools or services like PageSpeed Insights, SEMrush, Lighthouse, or similar.

Example Output:
{
  "whats_working": {
    "website audit": [
      {
        "tag": "CTR Loss",
        "explanation_reason": "The click-through rate (CTR) loss is 0%, indicating that all key pages are performing optimally in attracting clicks from search results. This strong performance suggests that metadata, snippets, and search presentation are clear and compelling, resulting in no measurable drop in organic traffic due to CTR issues.",
        "rating": 10
      },
      {
        "tag": "LCP",
        "explanation_reason": "Largest Contentful Paint (LCP) is 1.6 seconds, which is well below the 2.5-second threshold. This excellent loading speed ensures users see the main content quickly, improving user experience and positively impacting SEO rankings.",
        "rating": 10
      },
      {
        "tag": "CLS",
        "explanation_reason": "Cumulative Layout Shift (CLS) is 0.004, far below the 0.1 threshold. This outstanding stability means users experience almost no unexpected layout shifts, resulting in a seamless and frustration-free browsing experience.",
        "rating": 10
      },
      {
        "tag": "FCP",
        "explanation_reason": "First Contentful Paint (FCP) is 1.1 seconds, which is significantly faster than the 1.8-second benchmark. This strong performance ensures that users see visual feedback quickly, reducing perceived load times and supporting user retention.",
        "rating": 10
      }
    ]
  },
  "what_needs_fixing": {
    "website audit": [
      {
        "tag": "TBT",
        "explanation_reason": "Total Blocking Time (TBT) is 600ms, exceeding the 200ms threshold. This delays interactivity, causing user frustration and potentially increasing bounce rates by 15-20%.",
        "rating": 1
      },
      {
        "tag": "TTI",
        "explanation_reason": "Time to Interactive (TTI) is 8.5 seconds, far above the 3.8-second threshold. This slow interactivity leads to poor user experience, increasing the likelihood of users abandoning the site before it becomes fully interactive.",
        "rating": 1
      },
      {
        "tag": "Performance Score",
        "explanation_reason": "The overall performance score is 45, well below the 90 threshold for optimal performance. This indicates multiple bottlenecks in loading and interactivity, negatively affecting SEO and user retention.",
        "rating": 1
      }
    ]
  },
  "recommendations": {
    "website audit": [
      {
        "tag": "TBT",
        "recommendation": "Lower Total Blocking Time by identifying and optimizing heavy JavaScript tasks. Split large scripts into smaller, asynchronous chunks, and defer non-essential JS until after the main content loads. Limit the use of synchronous third-party scripts and remove unnecessary polyfills. Use your browser's Performance panel to manually inspect long tasks and verify that main-thread blocking is minimized."
      },
      {
        "tag": "TTI",
        "recommendation": "Improve Time to Interactive by streamlining critical rendering paths and reducing JavaScript execution during page load. Prioritize loading essential resources, and delay non-interactive scripts until after the page becomes interactive. Regularly audit your code for unnecessary dependencies and optimize event handling to ensure a faster interactive state. Manually test page responsiveness by interacting with elements immediately after load to confirm improvements."
      },
      {
        "tag": "Performance Score",
        "recommendation": "Increase the overall performance score by addressing the most impactful bottlenecks, especially TBT and TTI. Audit your resource loading order, minimize render-blocking assets, and leverage efficient caching strategies. Regularly review your HTML, CSS, and JavaScript for redundant or inefficient code, and optimize image delivery. Validate improvements by monitoring load and interactivity times directly in the browser's network and performance panels."
      }
    ]
  }
}


Output only valid JSON.
`;


// Normalize audit output (whats_working, what_needs_fixing, recommendations)
const normalizeAuditOutput = (input: any): {
  whats_working: Record<string, { tag: string; explanation_reason: string; rating: number }[]>;
  what_needs_fixing: Record<string, { tag: string; explanation_reason: string; rating: number }[]>;
  recommendations: Record<string, { tag: string; recommendation: string }[]>;
} => {
  const result: {
    whats_working: Record<string, { tag: string; explanation_reason: string; rating: number }[]>;
    what_needs_fixing: Record<string, { tag: string; explanation_reason: string; rating: number }[]>;
    recommendations: Record<string, { tag: string; recommendation: string }[]>;
  } = {
    whats_working: {},
    what_needs_fixing: {},
    recommendations: {},
  };

  // Normalize whats_working
  for (const [category, items] of Object.entries(input.whats_working || {})) {
    result.whats_working[category] = [];
    if (Array.isArray(items)) {
      for (const item of items) {
        result.whats_working[category].push({
          tag: item.tag || item.title || "Untitled",
          explanation_reason: typeof item.explanation_reason === "string" ? item.explanation_reason.trim() : JSON.stringify(item.explanation_reason),
          rating: Number(item.rating) || 7,
        });
      }
    } else {
      if (typeof items === "object" && items !== null) {
        result.whats_working[category].push({
          tag: (items as any).tag || (items as any).title || "Untitled",
          explanation_reason: typeof (items as any).explanation_reason === "string" ? (items as any).explanation_reason.trim() : JSON.stringify((items as any).explanation_reason),
          rating: Number((items as any).rating) || 7,
        });
      }
    }
  }

  // Normalize what_needs_fixing
  for (const [category, items] of Object.entries(input.what_needs_fixing || {})) {
    result.what_needs_fixing[category] = [];
    if (Array.isArray(items)) {
      for (const item of items) {
        result.what_needs_fixing[category].push({
          tag: item.tag || item.title || "Untitled",
          explanation_reason: typeof item.explanation_reason === "string" ? item.explanation_reason.trim() : JSON.stringify(item.explanation_reason),
          rating: Number(item.rating) || 3,
        });
      }
    } else {
      if (typeof items === "object" && items !== null) {
        result.what_needs_fixing[category].push({
          tag: (items as any).tag || (items as any).title || "Untitled",
          explanation_reason: typeof (items as any).explanation_reason === "string" ? (items as any).explanation_reason.trim() : JSON.stringify((items as any).explanation_reason),
          rating: Number((items as any).rating) || 3,
        });
      }
    }
  }

  // Normalize recommendationss
  for (const [category, items] of Object.entries(input.recommendations || {})) {
    result.recommendations[category] = [];
    for (const item of items as any[]) {
      result.recommendations[category].push({
        tag: item.tag || "Untitled",
        recommendation: typeof item.recommendation === "string" ? item.recommendation.trim() : JSON.stringify(item.recommendation),
      });
    }
  }

  return result;
};

// Validate recommendations to ensure they match what_needs_fixing
const validateRecommendations = (output: any) => {
  const result = { ...output, recommendations: { ...output.recommendations } };

  // Collect all tags from what_needs_fixing by category
  const issuesByCategory: Record<string, Set<string>> = {};
  for (const [category, items] of Object.entries(output.what_needs_fixing || {})) {
    issuesByCategory[category] = new Set((items as any[]).map(item => item.tag));
  }

  // Validate recommendations
  for (const [category, recs] of Object.entries(output.recommendations || {})) {
    if (!issuesByCategory[category] || issuesByCategory[category].size === 0) {
      console.warn(`No issues found in what_needs_fixing for category "${category}". Clearing recommendations.`);
      result.recommendations[category] = [];
      continue;
    }

    result.recommendations[category] = (recs as any[]).filter(rec => {
      if (!issuesByCategory[category].has(rec.tag)) {
        console.warn(`Recommendation tag "${rec.tag}" in category "${category}" does not match any issue in what_needs_fixing`);
        return false;
      }
      return true;
    });

    if (result.recommendations[category].length === 0) {
      delete result.recommendations[category];
    }
  }

  return result;
};

export const generateLLMTrafficReport = async (website_id: string, user_id: string) => {
  if (!website_id || !user_id) {
    return Response.json({ error: "Missing website_id or user_id" }, { status: 400 });
  } else {
    console.log("Report generation started for website_id:", website_id);
  }

  try {
    // Check SEO audit status
    const analysisStatus = await prisma.analysis_status.findUnique({
      where: {
        user_id_website_id: {
          user_id,
          website_id,
        },
      },
      select: {
        seo_audit: true,
      },
    });

    const isSeoAuditEnabled = analysisStatus?.seo_audit != null;
    console.log("isSeoAuditEnabled", isSeoAuditEnabled);

    // Fetch data
    const [scraped, analysis, traffic, llm_Response] = await Promise.all([
      prisma.website_scraped_data.findUnique({ where: { website_id } }),
      prisma.brand_website_analysis.findFirst({
        where: { website_id },
        orderBy: { created_at: "desc" },
      }),
      isSeoAuditEnabled
        ? prisma.brand_traffic_analysis.findFirst({
            where: { website_id },
            orderBy: { created_at: "desc" },
          })
        : null,
      isSeoAuditEnabled
        ? prisma.llm_responses.findFirst({
            where: { website_id },
            orderBy: { created_at: "desc" },
            select: {
              geo_llm: true,
            },
          })
        : null,
    ]);

    // Extract H1
    let h1Text = "Not Found";
    if (scraped?.raw_html) {
      const $ = cheerio.load(scraped.raw_html);
      h1Text = $("h1").first().text().trim() || "Not Found";
    }

    // Extract optimization opportunities
    let optimization_opportunities: any = "None";
    if (isSeoAuditEnabled && analysis?.audit_details) {
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

    // Extract user access readiness
    let user_access_readiness: any = "None";
    if (isSeoAuditEnabled && analysis?.audit_details) {
      try {
        const auditDetails =
          typeof analysis.audit_details === "string"
            ? JSON.parse(analysis.audit_details)
            : analysis.audit_details;
        user_access_readiness = auditDetails?.user_access_readiness || "None";
      } catch (error) {
        console.error("Error parsing audit_details:", error);
        user_access_readiness = "None";
      }
    }

    // Construct allData
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
        lcp: analysis?.largest_contentful_paint ?? "N/A",
        cls: analysis?.cumulative_layout_shift ?? "N/A",
        fcp: analysis?.first_contentful_paint ?? "N/A",
        speed_index: analysis?.speed_index ?? "N/A",
        tti: analysis?.time_to_interactive ?? "N/A",
        tbt: analysis?.total_blocking_time ?? "N/A",
        performance_score: analysis?.performance_score ?? "N/A",
        // optimization_opportunities: optimization_opportunities,
      },
    };

    if (isSeoAuditEnabled && traffic) {
      allData.traffic = {
        avg_session_duration_in_seconds: traffic?.avg_session_duration ?? "N/A",
        engagement_rate: traffic?.engagement_rate ?? "N/A",
        engaged_sessions: traffic?.engaged_sessions ?? "N/A",
        total_visitors: traffic?.total_visitors ?? "N/A",
        unique_visitors: traffic?.unassigned ?? "N/A",
        // sources: {
        //   organic: traffic?.organic_search ?? "N/A",
        //   direct: traffic?.direct ?? "N/A",
        //   referral: traffic?.referral ?? "N/A",
        //   // social: traffic?.organic_social ?? "N/A",
        // },
        new_vs_returning: traffic?.new_vs_returning ?? "N/A",
        top_countries: traffic?.top_countries ?? "N/A",
        top_devices: traffic?.top_devices ?? "N/A",
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
        // user_access_readiness: user_access_readiness ?? "None",
      };

      allData.Geo = {
        schema: scraped?.schema_analysis ?? "None",
        AI_discovilibilty: llm_Response?.geo_llm ?? "None",
        appears_accross_bing: traffic?.top_sources ?? "N/A",
      };
    }

    // Define prompts
    const seoEnabledPrompt = prompt_web_and_seo; // Use updated prompt for both cases; update prompt_web_and_seo if needed
    const seoDisabledPrompt = prompt_web_only;

    // Generate LLM response with ratings
    console.log("Generating LLM response...");
    const llmResponse = await openai.chat.completions.create({
      model: model,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: isSeoAuditEnabled ? seoEnabledPrompt : seoDisabledPrompt,
        },
        { role: "user", content: JSON.stringify(allData) },
      ],
    });

    const llmContent = llmResponse.choices[0].message.content
      ? JSON.parse(llmResponse.choices[0].message.content)
      : { whats_working: {}, what_needs_fixing: {}, recommendations: {} };

    // Validate recommendations
    const validatedContent = validateRecommendations(llmContent);

    // Normalize output
    const combinedOutput = normalizeAuditOutput(validatedContent);
    if (combinedOutput) {
      console.log("LLM response generated successfully:");
    }

    // Save to database
    console.log("Saving LLM response to database...");
    await prisma.llm_responses.upsert({
      where: { website_id },
      update: {
        recommendation_by_mo_dashboard1: JSON.stringify(combinedOutput),
      },
      create: {
        website_id,
        recommendation_by_mo_dashboard1: JSON.stringify(combinedOutput),
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
        recommendation_by_mo1: "true",
      },
      create: {
        user_id,
        website_id,
        recommendation_by_mo1: "true",
      },
    });
    console.log("LLM response saved successfully for website_id:", website_id);

    return { success: true, data: combinedOutput };
  } catch (err) {
    console.error("LLM Audit Error:", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
};