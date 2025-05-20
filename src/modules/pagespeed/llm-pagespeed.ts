// import { Request, Response } from "express";
// import { PrismaClient } from "@prisma/client";
// import { OpenAI } from "openai";

// const prisma = new PrismaClient();
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// export const generateLLMAuditReport = async (req: Request, res: Response) => {
//   const { website_id, analysis_id } = req.body;

//   if (!website_id) {
//     return res.status(400).json({
//       success: false,
//       error: "'website_id' and 'analysis_id' are required.",
//     });
//   }

//   try {
//     // 1. Fetch audit details
//     const auditDetails = await prisma.pagespeed_audit.findMany({
//       where: { website_analysis_id: analysis_id },
//       select: {
//         audit_key: true,
//         title: true,
//         description: true,
//         score: true,
//         display_value: true,
//       },
//     });

//     // 2. Fetch main summary scores from brand_website_analysis
//     const analysis = await prisma.brand_website_analysis.findUnique({
//       where: { website_analysis_id: analysis_id },
//       select: {
//         performance_score: true,
//         seo_score: true,
//         accessibility_score: true,
//         best_practices_score: true,
//         pwa_score: true,
//         first_contentful_paint: true,
//         largest_contentful_paint: true,
//         total_blocking_time: true,
//         speed_index: true,
//         cumulative_layout_shift: true,
//         time_to_interactive: true,
//         // total_broken_links: true,
//         missing_image_alts: true,
//       },
//     });

//     if (!analysis || auditDetails.length === 0) {
//       return res.status(404).json({
//         success: false,
//         error: "Analysis data not found for the given ID.",
//       });
//     }

//     // 3. Format category scores
//     const categoryScores = {
//       performance: analysis.performance_score ?? "N/A",
//       seo: analysis.seo_score ?? "N/A",
//       accessibility: analysis.accessibility_score ?? "N/A",
//       bestPractices: analysis.best_practices_score ?? "N/A",
//       pwa: analysis.pwa_score ?? "N/A",
//     };



//     const prompt = `
//             You are a senior web performance expert writing detailed, technical audit reports for developers and stakeholders.

//             A PageSpeed audit was conducted for a website with the following scores:
//             - Performance: ${categoryScores.performance}
//             - SEO: ${categoryScores.seo}
//             - Accessibility: ${categoryScores.accessibility}
//             - Best Practices: ${categoryScores.bestPractices}
//             - PWA: ${categoryScores.pwa}

//             Core Web Vitals:
//             - First Contentful Paint: ${analysis.first_contentful_paint}
//             - Largest Contentful Paint: ${analysis.largest_contentful_paint}
//             - Total Blocking Time: ${analysis.total_blocking_time}
//             - Speed Index: ${analysis.speed_index}
//             - Cumulative Layout Shift: ${analysis.cumulative_layout_shift}
//             - Time to Interactive: ${analysis.time_to_interactive}

//             Additional Findings:
            
//             - Missing Image Alts: ${analysis.missing_image_alts}

//             Detailed audit results:
//             ${auditDetails
//             .map(
//                 (a) =>
//                 `• ${a.title} (${a.audit_key}): Score ${a.score}, Value: ${a.display_value} — ${a.description}`
//             )
//             .join("\n")}

//             Write a human-readable and technical audit report that includes:

//             1. A brief introduction explaining what this audit is and its purpose.
//             2. Clear explanation of what each score represents and how it was derived.
//             3. For each category (Performance, SEO, Accessibility, Best Practices):
//             - List **specific issues** detected in this website's audit.
//             - Provide **precise, technically actionable recommendations** based on the actual findings, not generic advice.
//             - Mention **exact metrics or thresholds** where applicable.
//             - Prioritize high-impact optimizations.
//             4. Explain the impact of each Core Web Vital (e.g., what does a CLS of ${analysis.cumulative_layout_shift} imply for user experience?).
//             5. Comment on missing image alts and how to resolve them.
//             6. Conclude with a **summary recommendation**, prioritizing the most critical improvements and their expected benefit.

//             Keep the language professional and instructive, and avoid vague or generic suggestions.
//             `;

//     // 5. Generate the report using OpenAI
//     const response = await openai.chat.completions.create({
//       model: "gpt-4o", // or "gpt-3.5-turbo"
//       messages: [{ role: "user", content: prompt }],
//       temperature: 0.7,
//     });

//     const llmOutput = response.choices?.[0]?.message?.content;

//     return res.status(200).json({
//       success: true,
//       website_id,
//       analysis_id,
//       report: llmOutput,
//     });
//   } catch (err: any) {
//     console.error("❌ LLM Audit Error:", err);
//     return res.status(500).json({
//       success: false,
//       error: "Failed to generate LLM audit report.",
//       detail: err?.message || "Internal server error",
//     });
//   }
// };



import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { OpenAI } from "openai";

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const generateLLMAuditReportforpagespeed = async (req: Request, res: Response) => {
  const { website_id } = req.body;

  if (!website_id) {
    return res.status(400).json({
      success: false,
      error: "'website_id' is required.",
    });
  }

  console.log("Request website_id:", website_id);

  try {
    // 1. Find the analysis ID by website_id
    const analysisRecord = await prisma.brand_website_analysis.findFirst({
      where: { website_id },
      select: { website_analysis_id: true },
    });

    console.log("Analysis Record:", analysisRecord);

    if (!analysisRecord) {
      return res.status(404).json({
        success: false,
        error: "No analysis found for the provided website_id.",
      });
    }

    const analysis_id = analysisRecord.website_analysis_id;

    // 2. Fetch audit details for this analysis
    const auditDetails = await prisma.pagespeed_audit.findMany({
      where: { website_analysis_id: analysis_id },
      select: {
        audit_key: true,
        title: true,
        description: true,
        score: true,
        display_value: true,
      },
    });

    // 3. Fetch main summary scores from brand_website_analysis
    const analysis = await prisma.brand_website_analysis.findUnique({
      where: { website_analysis_id: analysis_id },
      select: {
        performance_score: true,
        seo_score: true,
        accessibility_score: true,
        best_practices_score: true,
        pwa_score: true,
        first_contentful_paint: true,
        largest_contentful_paint: true,
        total_blocking_time: true,
        speed_index: true,
        cumulative_layout_shift: true,
        time_to_interactive: true,
        missing_image_alts: true,
      },
    });

    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: "Analysis data not found for the given analysis_id.",
      });
    }
    
    // 4. Format category scores
    const categoryScores = {
      performance: analysis.performance_score ?? "N/A",
      seo: analysis.seo_score ?? "N/A",
      accessibility: analysis.accessibility_score ?? "N/A",
      bestPractices: analysis.best_practices_score ?? "N/A",
      pwa: analysis.pwa_score ?? "N/A",
    };


    
    // 5. Build the prompt
//     const prompt = `
// You are a senior web performance expert writing detailed, technical audit reports for developers and stakeholders.

// A audit was conducted for website with the following scores:
// - Performance: ${categoryScores.performance}
// - SEO: ${categoryScores.seo}
// - Accessibility: ${categoryScores.accessibility}
// - Best Practices: ${categoryScores.bestPractices}
// - PWA: ${categoryScores.pwa}

// Core Web Vitals:
// - First Contentful Paint: ${analysis.first_contentful_paint}
// - Largest Contentful Paint: ${analysis.largest_contentful_paint}
// - Total Blocking Time: ${analysis.total_blocking_time}
// - Speed Index: ${analysis.speed_index}
// - Cumulative Layout Shift: ${analysis.cumulative_layout_shift}
// - Time to Interactive: ${analysis.time_to_interactive}

// Additional Findings:
// - Missing Image Alts: ${analysis.missing_image_alts}

// Detailed audit results:
// ${auditDetails
//   .map(
//     (a) =>
//       `• ${a.title} (${a.audit_key}): Score ${a.score}, Value: ${a.display_value} — ${a.description}`
//   )
//   .join("\n")}

// Write a human-readable and technical audit report that includes:
// 1. A brief introduction explaining what this audit is and its purpose.
// 2. Clear explanation of what each score represents and how it was derived.
// 3. For each category (Performance, SEO, Accessibility, Best Practices):
// - List **specific issues** detected in this website's audit.
// - Provide **precise, technically actionable recommendations** based on the actual findings, not generic advice.
// - Mention **exact metrics or thresholds** where applicable.
// - Prioritize high-impact optimizations.
// 4. Explain the impact of each Core Web Vital (e.g., what does a CLS of ${analysis.cumulative_layout_shift} imply for user experience?).
// 5. Comment on missing image alts and how to resolve them.
// 6. Conclude with a **summary recommendation**, prioritizing the most critical improvements and their expected benefit.

// Keep the language professional and instructive, and avoid vague or generic suggestions.
//     `;
   const prompt = `
You are a senior web performance expert responsible for creating detailed, technical audit reports for developers, SEO teams, and non-technical stakeholders.

A technical audit was conducted for the website with the following scores:

- **Performance**: ${categoryScores.performance}
- **SEO**: ${categoryScores.seo}
- **Accessibility**: ${categoryScores.accessibility}
- **Best Practices**: ${categoryScores.bestPractices}
- **PWA**: ${categoryScores.pwa}

Core Web Vitals:

- First Contentful Paint: ${analysis.first_contentful_paint}
- Largest Contentful Paint: ${analysis.largest_contentful_paint}
- Total Blocking Time: ${analysis.total_blocking_time}
- Speed Index: ${analysis.speed_index}
- Cumulative Layout Shift: ${analysis.cumulative_layout_shift}
- Time to Interactive: ${analysis.time_to_interactive}

Additional Findings:

- Missing Image Alts: ${analysis.missing_image_alts}

Detailed audit results:
${auditDetails
  .map(
    (a) =>
      `• ${a.title} (${a.audit_key}): Score ${a.score}, Value: ${a.display_value} — ${a.description}`
  )
  .join("\n")}

---

### 📄 Instructions for the Report

Please write a **professional, human-readable, and technically grounded** audit report that includes:

1. **Introduction**  
   - Explain what this audit covers and its relevance for performance, SEO, and user experience.

2. **Score Overview and Interpretation**  
   - Describe what each category score represents.  
   - Explain how it is derived, referencing underlying metrics where useful.

3. **Detailed Category Analysis and Recommendations**  
   For each category (Performance, SEO, Accessibility, Best Practices):
   - Identify and describe **specific issues** found.
   - Provide **precise, actionable** technical recommendations based on the real findings.
   - Where relevant, cite exact metrics or best practice thresholds (e.g., "CLS should be <0.1").
   - For each issue and recommendation, clearly state:
     - 📈 **Impact on SEO** — e.g., how it affects indexing, ranking, crawlability, or Core Web Vitals signals.
     - 🚨 **Technical Importance** — is it critical, moderate, or low in terms of fixing urgency?
     - 🎯 **Suggested Fix** — the technical solution or approach.

4. **Core Web Vitals Analysis**  
   - Explain the meaning and user experience implications of each metric.
   - Suggest fixes and SEO implications (e.g., poor LCP slows perceived load, affecting rankings).

5. **Accessibility and Missing Alts**  
   - Analyze missing alt text and other accessibility gaps.
   - Emphasize SEO effects (e.g., image search performance, semantic value loss).
   - Offer precise recommendations (e.g., using descriptive alt attributes aligned with context).

6. **Prioritized Summary**  
   - Present a table or list of:
     - 🔥 High-Priority Fixes — crucial for SEO ranking and performance.
     - 🟡 Medium Impact — valuable but not immediately critical.
     - ⚪ Low Priority — optional improvements or polish.
   - For each item, mention **expected outcome or benefit**.

---

Use clear, technical language and keep recommendations highly specific to the audit results. Avoid generic suggestions. Mention SEO importance wherever applicable, especially in relation to Google's ranking signals.
`;

    // 6. Call OpenAI to generate the report
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const llmOutput = response.choices?.[0]?.message?.content;
    await prisma.llm_audit_reports.upsert({
            where: { website_id },
            update: {
                pagespeed_report: llmOutput,
            },
            create: {
                website_id,
                pagespeed_report: llmOutput,
            },
            });
    return res.status(200).json({
      success: true,
      website_id,
      analysis_id,
      report: llmOutput,
    });
  } catch (err: any) {
    console.error("❌ LLM Audit Error:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to generate LLM audit report.",
      detail: err?.message || "Internal server error",
    });
  }
};

