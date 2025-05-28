
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { OpenAI } from "openai";
import * as cheerio from "cheerio"; // for H1 extraction
const model = process.env.OPENAI_MODEL || "gpt-4.1";
const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const max_tokens = Number(process.env.MAX_TOKENS) || 1000; 


export const generateLLMAuditReportforpagespeed = async (req: Request, res: Response) => {
  const { website_id,user_id } = req.body;

  if (!website_id) {
    return res.status(400).json({
      success: false,
      error: "'website_id' is required.",
    });
  }

  try {
    // 1. Fetch metadata from scraped data
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
      return res.status(404).json({
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

    // 2. Find the analysis ID by website_id
    const analysisRecord = await prisma.brand_website_analysis.findFirst({
      where: { website_id },
      select: { website_analysis_id: true },
    });

    if (!analysisRecord) {
      return res.status(404).json({
        success: false,
        error: "No analysis found for the provided website_id.",
      });
    }

    const analysis_id = analysisRecord.website_analysis_id;

    // 3. Fetch audit details


    // 4. Fetch summary scores
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
        total_broken_links:true,
        broken_links: true,
      
      },
    });

    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: "Analysis data not found for the given analysis_id.",
      });
    }

    const categoryScores = {
      performance: analysis.performance_score ?? "N/A",
      seo: analysis.seo_score ?? "N/A",
      accessibility: analysis.accessibility_score ?? "N/A",
      bestPractices: analysis.best_practices_score ?? "N/A",
      
    };

    // 5. Compose the prompt
    const prompt = `
You are a senior web performance expert responsible for creating detailed, technical audit reports for developers, SEO teams, and non-technical stakeholders.

### Website Metadata Overview:
- Page Title: ${scrapedData.page_title || "N/A"}
- Meta Description: ${scrapedData.meta_description || "N/A"}
- Meta Keywords: ${scrapedData.meta_keywords || "N/A"}
- Open Graph Title: ${scrapedData.og_title || "N/A"}
- Open Graph Description: ${scrapedData.og_description || "N/A"}
- First H1 Tag: ${h1Text}

### Audit Scores:
- Performance: ${categoryScores.performance}
- SEO: ${categoryScores.seo}
- Accessibility: ${categoryScores.accessibility}
- Best Practices: ${categoryScores.bestPractices}


### Core Web Vitals:
- First Contentful Paint: ${analysis.first_contentful_paint}
- Largest Contentful Paint: ${analysis.largest_contentful_paint}
- Total Blocking Time: ${analysis.total_blocking_time}
- Speed Index: ${analysis.speed_index}
- Cumulative Layout Shift: ${analysis.cumulative_layout_shift}
- Time to Interactive: ${analysis.time_to_interactive}

### Additional Findings:
- Missing Image Alts: ${analysis.missing_image_alts}
- Number of broken links: ${analysis.total_broken_links}
- broken link detail :${analysis.broken_links}



---

Follow these instructions to generate a complete, human-readable, SEO-aware audit report:
### 📄 Instructions for the Report

Write a **professional, human-readable, and technically grounded** audit report tailored for this specific brand. Your report should follow the structure below:

---

1. **Introduction**  
   - Briefly introduce the brand/website and summarize the purpose of brand.  

2. **Website Metadata Evaluation**  
   - Explain the **importance of meta information** such as title, description, keywords, and Open Graph tags for both SEO and social sharing.  
   - Analyze the quality of the provided metadata:
     - Is the title tag concise, keyword-optimized, and unique?
     - Does the meta description effectively summarize the content and include key terms?
     - Are Open Graph tags informative and likely to improve social visibility?
     - Is the first H1 tag appropriate, relevant, and consistent with the title?
   - Point out any missing, duplicated, or poorly optimized metadata fields.
   - Provide concrete SEO-focused recommendations for improving metadata quality.

3. **Score Overview and Interpretation**  
   - Describe what each category score (Performance, SEO, Accessibility, etc.) represents and how it's calculated.  
   - Link category scores to their impact on user experience and discoverability.

4. **Detailed Category Analysis and Recommendations**  
   For each category (Performance, SEO, Accessibility, Best Practices):
   - Identify and explain key issues using real data from the audit.
   - Provide **precise, actionable technical fixes**.
   - Include:
     - 📈 **SEO Impact**
     - 🚨 **Technical Urgency**
     - 🎯 **Suggested Fix**

5. **Core Web Vitals Analysis**  
   - Explain each metric’s role in UX and Google's ranking systems.
   - Offer fixes and improvements for slow or unstable metrics.

6. **Accessibility & Alt Text Analysis**  
   - Evaluate alt text coverage.
   - Highlight impact on SEO and usability for screen readers.
   - Recommend concrete fixes.

7. **Prioritized Fix Summary**  
   - List:
     - 🔥 High-Priority Fixes (urgent, SEO-critical)
     - 🟡 Medium Priority Fixes
     - ⚪ Low Priority Fixes (optional)
   - Mention the expected benefit of each.

---

Use specific numbers and insights from the audit data. Avoid generic statements. Keep the tone technically authoritative yet accessible for both devs and business stakeholders.

`;

    // 6. Generate report
    const response = await openai.chat.completions.create({
      model: model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: max_tokens,
    });
    // console.log("LLM Response:", response);
    const llmOutput = response.choices?.[0]?.message?.content;

    // 7. Store report
    await prisma.llm_audit_reports.upsert({
      where: { website_id },
      update: { pagespeed_report: llmOutput },
      create: { website_id, pagespeed_report: llmOutput },
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
