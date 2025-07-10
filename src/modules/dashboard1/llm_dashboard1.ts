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
      }
      
    ]
  },
  "what_needs_fixing": {
    "website audit": [
      {
        "tag": "TBT",
        "explanation_reason": "Total Blocking Time (TBT) is 600ms, exceeding the 200ms threshold. This delays interactivity, causing user frustration and potentially increasing bounce rates by 15-20%.",
        "rating": 1
      }
     
    ]
  },
  "recommendations": {
    "website audit": [
      {
        "tag": "TBT",
        "recommendation": "Lower Total Blocking Time by identifying and optimizing heavy JavaScript tasks. Split large scripts into smaller, asynchronous chunks, and defer non-essential JS until after the main content loads. Limit the use of synchronous third-party scripts and remove unnecessary polyfills. Use your browser's Performance panel to manually inspect long tasks and verify that main-thread blocking is minimized."
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
**Every element in the input must be evaluated and categorized into either "whats_working" or "what_needs_fixing". No element should be omitted or left unclassified.**

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
      }
    ]
  },
  "what_needs_fixing": {
    "website audit": [
      {
        "tag": "TBT",
        "explanation_reason": "Total Blocking Time (TBT) is 600ms, exceeding the 200ms threshold. This delays interactivity, causing user frustration and potentially increasing bounce rates by 15-20%.",
        "rating": 1
      }
      
    ]
  },
  "recommendations": {
    "website audit": [
      {
        "tag": "TBT",
        "recommendation": "Lower Total Blocking Time by identifying and optimizing heavy JavaScript tasks. Split large scripts into smaller, asynchronous chunks, and defer non-essential JS until after the main content loads. Limit the use of synchronous third-party scripts and remove unnecessary polyfills. Use your browser's Performance panel to manually inspect long tasks and verify that main-thread blocking is minimized."
      }
     
    ]
  }
}


Output only valid JSON .
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

    // const isSeoAuditEnabled = analysisStatus?.seo_audit != null;
    // console.log("isSeoAuditEnabled", isSeoAuditEnabled);

    // Fetch data
    const [scraped, analysis, traffic, llm_Response] = await Promise.all([
      prisma.website_scraped_data.findUnique({ where: { website_id } }),
      prisma.brand_website_analysis.findFirst({
        where: { website_id },
        orderBy: { created_at: "desc" },
      }),
         prisma.brand_traffic_analysis.findFirst({
            where: { website_id },
            orderBy: { created_at: "desc" },
          }),
        
         prisma.llm_responses.findFirst({
            where: { website_id },
            orderBy: { created_at: "desc" },
            select: {
              geo_llm: true,
            },
          })
      
    ]);

    // Extract H1
    let h1Text = "Not Found";
    if (scraped?.raw_html) {
      const $ = cheerio.load(scraped.raw_html);
      h1Text = $("h1").first().text().trim() || "Not Found";
    }

    // Extract optimization opportunities
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

    // Extract user access readiness
    let user_access_readiness: any = "None";
    if (analysis?.audit_details) {
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
      },
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
    // const seoDisabledPrompt = prompt_web_only;

    // Generate LLM response with ratings
    console.log("Generating LLM response (recommendation by mo1)...");
    const llmResponse = await openai.chat.completions.create({
      model: model,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: seoEnabledPrompt ,
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
        recommendation_by_mo_dashboard1: JSON.stringify(llmResponse),
      },
      create: {
        website_id,
        recommendation_by_mo_dashboard1: JSON.stringify(llmResponse),
      },
    });
   
    await prisma.analysis_status.upsert({
      where: {
        user_id_website_id: {
          user_id,
          website_id,
        },
      },
      update: {
        recommendation_by_mo1: JSON.stringify(combinedOutput),
      },
      create: {
        user_id,
        website_id,
        recommendation_by_mo1: JSON.stringify(combinedOutput),
      },
    });
    console.log("LLM response saved successfully for website_id:", website_id);

    return { recommendation_by_mo_dashboard1: combinedOutput };
  } catch (err) {
    console.error("LLM Audit Error:", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
};

