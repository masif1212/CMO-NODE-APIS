
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { OpenAI } from "openai";
import * as cheerio from "cheerio";

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = process.env.OPENAI_MODEL || "gpt-4.1";

// export async function POST(req: Request) {
export const generateLLMTrafficReport = async (websiteid: string, user_id: string) => {
const urlObj = new URL(websiteid);
const website_id = urlObj.searchParams.get("website_id");

if (!website_id) {
  return Response.json({ error: "Missing website_id" }, { status: 400 });
}

if (!user_id) {
  return Response.json({ error: "Missing user_id" }, { status: 400 });
}

try {
  // Step 1: Find latest website_id associated with this user
  const userWebsite = await prisma.user_websites.findFirst({
    where: { user_id },
    orderBy: { created_at: "desc" }, // or by updated_at
  });

  if (!userWebsite) {
    return Response.json({ error: "No website found for this user." }, { status: 404 });
  }

  const website_id = userWebsite.website_id;

  // Step 2: Fetch related data
  const [scraped, analysis, traffic] = await Promise.all([
    prisma.website_scraped_data.findUnique({ where: { website_id } }),
    prisma.brand_website_analysis.findFirst({ where: { website_id } }),
    prisma.brand_traffic_analysis.findFirst({ where: { website_id } }),
  ]);
  // try {
  //   const [scraped, analysis, traffic] = await Promise.all([
  //     prisma.website_scraped_data.findUnique({ where: { website_id } }),
  //     prisma.brand_website_analysis.findFirst({ where: { website_id } }),
  //     prisma.brand_traffic_analysis.findFirst({ where: { website_id } }),
  //   ]);

    if (!scraped || !analysis || !traffic) {
      return Response.json(
        { error: "Missing required data for website analysis." },
        { status: 404 }
      );
    }

    let h1Text = "Not Found";
    if (scraped.raw_html) {
      const $ = cheerio.load(scraped.raw_html);
      h1Text = $("h1").first().text().trim() || "Not Found";
    }

    // -------------------
    // PROMPT 1 - WHAT'S WORKING & WHAT NEEDS FIXING
    // -------------------
    const workingFixPrompt = `
You are a professional SEO and website auditor. Based on the data provided, categorize key website features into two sections: 

**1. What’s Working Well**  
**2. What Needs Fixing**

For each item, include:
- **Importance**: High, Medium, Low
- **Rating**: Score out of 10
- **Justification**: Why it's important, especially in terms of SEO, performance, and marketing

Also, explain **why** fixing issues like keywords, broken links, page titles, etc. matters — especially for SEO visibility, CTR, traffic, and brand trust.

## Website Metadata
- Title: ${scraped.page_title}
- Meta Description: ${scraped.meta_description}
- Meta Keywords: ${scraped.meta_keywords}
- H1: ${h1Text}
- CTR Loss: ${scraped.ctr_loss_percent}%

## OG Tags
- OG Title: ${scraped.og_title}
- OG Description: ${scraped.og_description}
- OG Image: ${scraped.og_image ? "Present" : "Missing"}

## Performance
- LCP: ${analysis.largest_contentful_paint}
- CLS: ${analysis.cumulative_layout_shift}
- FCP: ${analysis.first_contentful_paint}
- Speed Index: ${analysis.speed_index}
- TTI: ${analysis.time_to_interactive}
- TBT: ${analysis.total_blocking_time}
- Perf Score: ${analysis.performance_score}

## SEO
- SEO Score: ${analysis.seo_score}
- Broken Links: ${Array.isArray(analysis.broken_links) ? analysis.broken_links.join(", ") : analysis.broken_links || "None"}
- Schema: ${analysis.schema_analysis ? JSON.stringify(analysis.schema_analysis) : "None"}

## UX/Behavior
- Session Duration: ${traffic.avg_session_duration}
- Engagement Rate: ${traffic.engagement_rate}
- Engaged Sessions: ${traffic.engaged_sessions}

Return only these 2 sections:
1. **What’s Working**
2. **What Needs Fixing**

Use markdown formatting with bold titles and bullet points. Add brief explanations and scores.`;

// (rest of the function remains unchanged)


    // -------------------
    // PROMPT 2 - RECOMMENDATIONS
    // -------------------
//     const recommendationPrompt = `
// You are a senior SEO and web marketing consultant. Based on the following website analysis data, provide smart, actionable **Recommendations & Suggestions**.

// ## Metadata
// - Title: ${scraped.page_title}
// - Meta Description: ${scraped.meta_description}
// - Meta Keywords: ${scraped.meta_keywords}
// - H1: ${h1Text}
// - CTR Loss: ${scraped.ctr_loss_percent}%

// ## OG Tags
// - OG Title: ${scraped.og_title}
// - OG Description: ${scraped.og_description}
// - OG Image: ${scraped.og_image ? "Present" : "Missing"}

// ## Web Performance
// - LCP: ${analysis.largest_contentful_paint}
// - CLS: ${analysis.cumulative_layout_shift}
// - FCP: ${analysis.first_contentful_paint}
// - Speed Index: ${analysis.speed_index}
// - TTI: ${analysis.time_to_interactive}
// - TBT: ${analysis.total_blocking_time}
// - Performance Score: ${analysis.performance_score}

// ## Accessibility & SEO
// - Accessibility Score: ${analysis.accessibility_score}
// - Best Practices Score: ${analysis.best_practices_score}
// - SEO Score: ${analysis.seo_score}
// - Broken Links: ${Array.isArray(analysis.broken_links) ? analysis.broken_links.join(", ") : analysis.broken_links || "None"}
// - Schema: ${analysis.schema_analysis ? JSON.stringify(analysis.schema_analysis) : "None"}

// ## Traffic & Behavior
// - Avg Session Duration: ${traffic.avg_session_duration}
// - Engagement Rate: ${traffic.engagement_rate}
// - Engaged Sessions: ${traffic.engaged_sessions}
// - Total Visitors: ${traffic.total_visitors}
// - Organic Search: ${traffic.organic_search}
// - Direct: ${traffic.direct}
// - Social: ${traffic.organic_social}
// - Referral: ${traffic.referral}

// ## Instruction
// Return:
// 1. **Top 5 Recommendations** (high-impact)
// 2. **SEO Suggestions**
// 3. **Technical Fixes**
// 4. **Marketing & Content Strategy**

// Be very specific and avoid general advice. Use bullet points. Each point should explain the benefit for traffic, SEO, UX, or conversion.`;

// (rest of the function remains unchanged)
    // Call LLM for "What’s Working & Needs Fixing"
    const workingFixRes = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: "You are an expert web auditor focused on diagnosing issues and highlighting strengths.",
        },
        {
          role: "user",
          content: workingFixPrompt,
        },
      ],
      temperature: 0.7,
    });

    const workingFixContent = workingFixRes.choices[0].message.content || "";

    // Define recommendationPrompt inside try block
//     const recommendationPrompt = `
// You are a senior SEO and web marketing consultant. Based on the following website analysis data, provide smart, actionable **Recommendations & Suggestions**.

// ## Metadata
// - Title: ${scraped.page_title}
// - Meta Description: ${scraped.meta_description}
// - Meta Keywords: ${scraped.meta_keywords}
// - H1: ${h1Text}
// - CTR Loss: ${scraped.ctr_loss_percent}%

// ## OG Tags
// - OG Title: ${scraped.og_title}
// - OG Description: ${scraped.og_description}
// - OG Image: ${scraped.og_image ? "Present" : "Missing"}

// ## Web Performance
// - LCP: ${analysis.largest_contentful_paint}
// - CLS: ${analysis.cumulative_layout_shift}
// - FCP: ${analysis.first_contentful_paint}
// - Speed Index: ${analysis.speed_index}
// - TTI: ${analysis.time_to_interactive}
// - TBT: ${analysis.total_blocking_time}
// - Performance Score: ${analysis.performance_score}

// ## Accessibility & SEO
// - Accessibility Score: ${analysis.accessibility_score}
// - Best Practices Score: ${analysis.best_practices_score}
// - SEO Score: ${analysis.seo_score}
// - Broken Links: ${Array.isArray(analysis.broken_links) ? analysis.broken_links.join(", ") : analysis.broken_links || "None"}
// - Schema: ${analysis.schema_analysis ? JSON.stringify(analysis.schema_analysis) : "None"}

// ## Traffic & Behavior
// - Avg Session Duration: ${traffic.avg_session_duration}
// - Engagement Rate: ${traffic.engagement_rate}
// - Engaged Sessions: ${traffic.engaged_sessions}
// - Total Visitors: ${traffic.total_visitors}
// - Organic Search: ${traffic.organic_search}
// - Direct: ${traffic.direct}
// - Social: ${traffic.organic_social}
// - Referral: ${traffic.referral}

// ## Instruction
// Return:
// 1. **Top 5 Recommendations** (high-impact)
// 2. **SEO Suggestions**
// 3. **Technical Fixes**
// 4. **Marketing & Content Strategy**

// Be very specific and avoid general advice. Use bullet points. Each point should explain the benefit for traffic, SEO, UX, or conversion.`;



const recommendationPrompt = `
You are a senior SEO and web performance analyst. Using the data below, conduct a comprehensive technical SEO audit and provide actionable, detailed suggestions.

## Scraped Website Metadata
- **Title**: ${scraped.page_title}
    → Is this title tag appropriate?
    → Analyze structure, length, keyword usage, clarity, and uniqueness.
    → Say if it's too long, too short, missing important keywords, or duplicates others.
    → Suggest an improved version, even if it's already good.

- **Meta Description**: ${scraped.meta_description}
    → Is this meta description compelling and optimized?
    → Check for length, inclusion of primary keywords, readability, and CTA (call to action).
    → Suggest improvements, even if it’s decent.

- **Meta Keywords**: ${scraped.meta_keywords}
    → Are these keywords relevant, overused, outdated, or missing?
    → Should this tag be kept or removed?

- **H1 Heading**: "${h1Text}"
    → Is this H1 heading appropriate?
    → Analyze structure, length, keyword usage, clarity, and uniqueness.
    → Say if it's good, too short, too generic, keyword-stuffed, or missing key terms.
    → Suggest improvements even if it's already good.

- **CTR Loss Percent (estimated)**: ${scraped.ctr_loss_percent}%
    → Based on metadata and above-the-fold content, could the CTR be improved?
    → Suggest specific metadata or headline changes to reduce loss.

## Open Graph (OG) Tags
- **OG Title**: ${scraped.og_title}
    → Is the OG title optimized for social sharing?
    → Does it align with the page title and include value or intrigue?
    → Suggest improvements.

- **OG Description**: ${scraped.og_description}
    → Is this concise, relevant, and click-worthy for platforms like Facebook and LinkedIn?
    → Suggest improvements even if good.

- **OG Image**: ${scraped.og_image ? "Present" : "Missing"}
    → Is an image present?
    → If not, recommend ideal dimensions, format, and content type.
    → If present, describe what kind of OG image would maximize CTR.

## Website Performance Analysis
- **Largest Contentful Paint (LCP)**: ${analysis.largest_contentful_paint}
- **Cumulative Layout Shift (CLS)**: ${analysis.cumulative_layout_shift}
- **First Contentful Paint (FCP)**: ${analysis.first_contentful_paint}
- **Speed Index**: ${analysis.speed_index}
- **Time to Interactive (TTI)**: ${analysis.time_to_interactive}
- **Total Blocking Time (TBT)**: ${analysis.total_blocking_time}
- **Performance Score**: ${analysis.performance_score}

→ Are any metrics out of Core Web Vitals thresholds?
→ Suggest specific technical optimizations (code splitting, lazy loading, font loading, etc.)

## Accessibility and Best Practices
- **Accessibility Score**: ${analysis.accessibility_score}
- **Best Practices Score**: ${analysis.best_practices_score}
→ What common accessibility issues are likely?
→ Suggest fixes and audit tools.

## SEO Specific Audit
- **SEO Score**: ${analysis.seo_score}
- **Broken Links** (${analysis.total_broken_links}): ${Array.isArray(analysis.broken_links) ? analysis.broken_links.join(", ") : (typeof analysis.broken_links === "string" ? analysis.broken_links : "None")}
→ List impact of broken links and suggest a prioritization plan to fix.

- **Schema Markup**: ${analysis.schema_analysis ? JSON.stringify(analysis.schema_analysis) : "None"}
→ Is structured data present and valid?
→ Are rich results supported (e.g., product, article, local business)?
→ Suggest schema types and fixes for maximum visibility.

- **Estimated Revenue Loss Due to Performance**: ${analysis.revenue_loss_percent}%

## Website Traffic and Behavior Analysis
- **Avg Session Duration**: ${traffic.avg_session_duration}
- **Engagement Rate**: ${traffic.engagement_rate}
- **Engaged Sessions**: ${traffic.engaged_sessions}
- **Bounce Rate**: (if available or inferred)

→ Is user engagement healthy?
→ Based on metrics, suggest UX or content changes to boost session length and lower bounce.

## Traffic Source Breakdown
- **Total Visitors**: ${traffic.total_visitors}
- **Unique Visitors**: ${traffic.unassigned}
- **Organic Search**: ${traffic.organic_search}
- **Direct Traffic**: ${traffic.direct}
- **Referral Traffic**: ${traffic.referral}
- **Social Traffic**: ${traffic.organic_social}
- **New vs Returning Visitors**: ${traffic.new_vs_returning}
- **Top Countries**: ${Array.isArray(traffic.top_countries) ? traffic.top_countries.join(", ") : traffic.top_countries}
- **Top Devices**: ${traffic.top_devices}
- **Top Sources**: ${traffic.top_sources}

→ Are traffic sources balanced or skewed?
→ Suggest strategies to improve underperforming channels (e.g., content for SEO, paid traffic, better social CTAs).

## Output Format Instructions

Please return your response in **structured sections** with the following:

1. **Executive Summary**
   - Overview of current SEO, UX, and technical status

2. **Tag-by-Tag Analysis**
   - Bullet point feedback on each tag (title, description, H1, OG, schema) with "good/bad" rating and improvement suggestions.

3. **Technical SEO & Performance Fixes**
   - Review CWV metrics, accessibility, best practices

4. **User Behavior & Engagement**
   - Interpret session and bounce data and offer retention strategies

5. **Marketing & Content Strategy**
   - What to change in content, landing pages, or UX to boost conversion

6. **Top 5 Recommended Actions**
   - Prioritized high-impact changes in order

Use **clear bullet points**, **section headers**, and avoid vague language. Include suggestions even for areas that seem fine.
`;

    // Call LLM for Recommendations
    const recommendationRes = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: "You are a senior SEO and web marketing strategist.",
        },
        {
          role: "user",
          content: recommendationPrompt,
        },
      ],
      temperature: 0.7,
    });

    const recommendationContent = recommendationRes.choices[0].message.content || "";

    // Save both outputs in DB
    await prisma.llm_responses.upsert({
      where: { website_id },
      update: {
        dashboard1_what_working: workingFixContent,
        recommendation_by_mo_dashboard1: recommendationContent,
      },
      create: {
        website_id,
        dashboard1_what_working: workingFixContent,
        recommendation_by_mo_dashboard1: recommendationContent,
      },
    });

    return Response.json({
      success: true,
      message: "Audit generated",
      data: {
        what_working: workingFixContent,
        recommendation: recommendationContent,
      },
    });
  } catch (err) {
    console.error("LLM Audit Error:", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
