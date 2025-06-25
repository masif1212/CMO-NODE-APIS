
import OpenAI from 'openai';
import 'dotenv/config';

export const openai = new OpenAI({
     apiKey: process.env.OPENAI_API_KEY
});

export async function fetchCompetitorsFromLLM(site: any, userRequirement:any, competitorsToGenerate: number = 4): Promise<string> {
      const prompt = `
You are a market research assistant.

Given the following website metadata and details:
- Website URL: ${site.website_url}
- Title: ${site.page_title ?? 'None'}
- Description: ${site.meta_description ?? 'None'}
- Keywords: ${site.meta_keywords ?? 'None'}


- Industry: ${userRequirement.industry ?? 'Unknown'}
- Region of Operation: ${userRequirement.region_of_operation ?? 'Unknown'}
 Region of Operation: ${userRequirement.region_of_operation ?? 'Unknown'}
- Target Location: ${userRequirement.target_location ?? 'Unknown'}
- Target Audience: ${userRequirement.target_audience ?? 'Unknown'}
- Primary Offering: ${userRequirement.primary_offering ?? 'Unknown'}
- USP: ${userRequirement.USP ?? 'Unknown'}

Return a **JSON array** with the **top ${competitorsToGenerate} regional competitors** based on:
- Target audience (demographics, interests, intent)
- Region of operation (must be in the same or relevant local region)

Each competitor must:
- Be a real, active business with a valid, accessible HTTP(S) website (verified to return HTTP 200 status).
- Have a website URL of the primary landing page (e.g., https://example.com/home), not a blog post, article, or subpage.
- Not be a hypothetical or non-existent entity.
- Have a clear unique selling proposition (USP) and primary offering relevant to the website's industry.

Output format:

\`\`\`json
[
  {
    "name": "Competitor Name",
    "website_url": "https://example.com",
    "industry": "Industry/Niche",
    "region": "Region of Operation",
    "target_audience": "Target Audience",
    "primary_offering": "Primary Offering",
    "usp": "Unique Selling Proposition"
  }
]
\`\`\`

If no competitors are found, return an empty array.
`; // keep your current prompt as-is
  const res = await openai.responses.create({
    model: 'gpt-4o',
    input: prompt,
    tools: [
      { 
        type: 'web_search_preview', 
        search_context_size: 'medium',
        user_location: {
          type: 'approximate',
          region: userRequirement.region_of_operation?.country || 'Unknown',
          }
      }
    ],
  });
  return res.output_text.trim() || '';
}

export async function extractCompetitorDataFromLLM(scrapedData: any): Promise<any | null> {
      const prompt = `
You are a market research assistant. Given the following scraped website data, identify and return the Unique Selling Proposition (USP) and other relevant details of the competitor. If no clear details are identifiable, return a concise inferred set of details based on the data provided.

Scraped Data:
- Website URL: ${scrapedData.website_url}
- Page Title: ${scrapedData.page_title ?? 'None'}
- Meta Description: ${scrapedData.meta_description ?? 'None'}
- Meta Keywords: ${scrapedData.meta_keywords ?? 'None'}
- OG Title: ${scrapedData.og_title ?? 'None'}
- OG Description: ${scrapedData.og_description ?? 'None'}

Identify and return a JSON object like:
\`\`\`json
{
  "name": "Business Name",
  "industry": "Relevant industry",
  "region": "Region of operation",
  "target_audience": "Target audience",
  "primary_offering": "Primary product/service",
  "usp": "Unique Selling Proposition"
}
\`\`\`
If data is insufficient, return null.
`; // keep existing extraction prompt
  try {
    const res = await openai.responses.create({ model: 'gpt-4o', input: prompt });
    const output = res.output_text.trim();
    return output && output !== 'null' ? JSON.parse(output) : null;
  } catch (err) {
    console.error('LLM parse error:', err);
    return null;
  }
}


// export function createComparisonPrompt(main: any, competitors: any[]) {
//   const mainDesc = `
// **Main Website**
// - **URL:** ${main.website_url}
// - **Title:** ${main.meta.title}
// - **Meta Keywords:** ${main.meta.meta_keywords}
// - **Meta Description:** ${main.meta.meta_description}
// - **OG Description:** ${main.meta.og_description}
// - **Performance Score:** ${main.page_speed?.performance_score}
// - **SEO Score:** ${main.page_speed?.seo_score}
// - **Accessibility Score:** ${main.page_speed?.accessibility_score}
// - **Best Practices Score:** ${main.page_speed?.best_practices_score}
// - **Time to Interactive:** ${main.page_speed?.time_to_interactive}
// - **Speed Index:** ${main.page_speed?.speed_index}
// - **Largest Contentful Paint:** ${main.page_speed?.largest_contentful_paint}
// - **Total Blocking Time:** ${main.page_speed?.total_blocking_time}
// - **Cumulative Layout Shift:** ${main.page_speed?.cumulative_layout_shift}
// `;

//   const compDesc = competitors.map(comp => `
// **Competitor: ${comp.name}**
// - **URL:** ${comp.website_url}
// - **Title:** ${comp.meta.title}
// - **Meta Keywords:** ${comp.meta.meta_keywords}
// - **Meta Description:** ${comp.meta.meta_description}
// - **OG Description:** ${comp.meta.og_description}
// - **Performance Score:** ${comp.page_speed?.performance_score}
// - **SEO Score:** ${comp.page_speed?.seo_score}
// - **Accessibility Score:** ${comp.page_speed?.accessibility_score}
// - **Best Practices Score:** ${comp.page_speed?.best_practices_score}
// - **Time to Interactive:** ${comp.page_speed?.time_to_interactive}
// - **Speed Index:** ${comp.page_speed?.speed_index}
// - **Largest Contentful Paint:** ${comp.page_speed?.largest_contentful_paint}
// - **Total Blocking Time:** ${comp.page_speed?.total_blocking_time}
// - **Cumulative Layout Shift:** ${comp.page_speed?.cumulative_layout_shift}
// `).join("\n");

//   return `
// You are a **senior digital strategist** using internal tools and performance data to analyze a main website and its direct competitors.

// ---

// ### 📊 WEBSITE COMPARISON DATA

// ${mainDesc}

// ${compDesc}

// ---

// ###  TASK OVERVIEW

// Provide a **detailed comparative analysis** between the main website and its competitors using the provided metrics and metadata.

// #### Focus Areas:

// 1. **Performance Metrics**
//    - Time to Interactive (TTI)
//    - Speed Index
//    - Largest Contentful Paint (LCP)
//    - Total Blocking Time (TBT)
//    - Cumulative Layout Shift (CLS)

// 2. **SEO Quality**
//    - SEO score
//    - Title and meta tag effectiveness
//    - Keyword relevance and clarity
//    - Meta description optimization

// 3. **Accessibility & Best Practices**
//    - Accessibility compliance
//    - Technical best practices from internal analysis

// 4. **Messaging & Visual Presentation**
//    - Unique Selling Proposition (USP) clarity
//    - Meta descriptions' appeal and audience targeting
//    - Open Graph (OG) content quality for social sharing

// ---

// ### ⚠️ UNDERPERFORMANCE ANALYSIS

// For each area where the main website **falls behind competitors**, identify:
// - The likely root causes
// - The negative impact on user experience, SEO, or brand perception

// Use **real competitor names** in all comparisons.

// ---

// ###  HOW TO CLOSE THE COMPETITORS' GAP

// Provide a clear, categorized recommendation set based on internal analysis:

// #### 1. 🔧 Technical Improvements
// - Specific performance optimizations (e.g., LCP, CLS, script handling)
// - Front-end enhancements (e.g., image strategy, lazy loading)
// - Accessibility fixes based on internal benchmarks

// #### 2.  SEO Enhancements
// - Keyword and metadata improvements
// - Title/description adjustments (clarity, uniqueness)
// - Schema/structured markup if applicable (within internal standards)

// #### 3.  Strategic Content Improvements
// - Clearer and more relevant USP messaging
// - Stronger visual assets for social previews
// - Content formats to improve engagement and conversion (e.g., comparison tables, trust elements)


// ---

// ###  FORMAT YOUR RESPONSE AS:


// - **Recommendations to Close the Competitors' Gap**

// >  **Important:** Use only the provided data and assume all tools and metrics are internal. Do not suggest or reference any third-party tools, platforms, or services.
// `;
// }



// export function createComparisonPrompt(main: any, competitors: any[]) {
//   const mainDesc = `
// **Main Website**
// - **URL:** ${main.website_url}
// - **Title:** ${main.meta.title}
// - **Meta Keywords:** ${main.meta.meta_keywords}
// - **Meta Description:** ${main.meta.meta_description}
// - **OG Description:** ${main.meta.og_description}
// - **Performance Score:** ${main.page_speed?.performance_score}
// - **SEO Score:** ${main.page_speed?.seo_score}
// - **Accessibility Score:** ${main.page_speed?.accessibility_score}
// - **Best Practices Score:** ${main.page_speed?.best_practices_score}
// - **Time to Interactive:** ${main.page_speed?.time_to_interactive}
// - **Speed Index:** ${main.page_speed?.speed_index}
// - **Largest Contentful Paint:** ${main.page_speed?.largest_contentful_paint}
// - **Total Blocking Time:** ${main.page_speed?.total_blocking_time}
// - **Cumulative Layout Shift:** ${main.page_speed?.cumulative_layout_shift}
// `;

//   const compDesc = competitors.map(comp => `
// **Competitor: ${comp.name}**
// - **URL:** ${comp.website_url}
// - **Title:** ${comp.meta.title}
// - **Meta Keywords:** ${comp.meta.meta_keywords}
// - **Meta Description:** ${comp.meta.meta_description}
// - **OG Description:** ${comp.meta.og_description}
// - **Performance Score:** ${comp.page_speed?.performance_score}
// - **SEO Score:** ${comp.page_speed?.seo_score}
// - **Accessibility Score:** ${comp.page_speed?.accessibility_score}
// - **Best Practices Score:** ${comp.page_speed?.best_practices_score}
// - **Time to Interactive:** ${comp.page_speed?.time_to_interactive}
// - **Speed Index:** ${comp.page_speed?.speed_index}
// - **Largest Contentful Paint:** ${comp.page_speed?.largest_contentful_paint}
// - **Total Blocking Time:** ${comp.page_speed?.total_blocking_time}
// - **Cumulative Layout Shift:** ${comp.page_speed?.cumulative_layout_shift}
// `).join("\n");

//   return `
// You are a **senior digital strategist** using internal tools and performance data to analyze a main website and its direct competitors. The client operates in a competitive industry, and the goal is to provide actionable recommendations to close the gap with competitors in **user experience**, **SEO**, and **content visibility**.

// ---

// ### 📊 WEBSITE COMPARISON DATA

// ${mainDesc}

// ${compDesc}

// ---

// ### TASK OVERVIEW

// Provide a **detailed comparative analysis** between the main website and its competitors using the provided metrics and metadata. The goal is to help the main website outperform competitors by addressing performance, SEO, and content gaps.

// #### Focus Areas:

// 1. **Performance Metrics**
//    - Time to Interactive (TTI)
//    - Speed Index
//    - Largest Contentful Paint (LCP)
//    - Total Blocking Time (TBT)
//    - Cumulative Layout Shift (CLS)

// 2. **SEO Quality**
//    - SEO score
//    - Title and meta tag effectiveness
//    - Keyword relevance and clarity
//    - Meta description optimization

// 3. **Accessibility & Best Practices**
//    - Accessibility compliance
//    - Technical best practices from internal analysis

// 4. **Messaging & Visual Presentation**
//    - Unique Selling Proposition (USP) clarity
//    - Meta descriptions' appeal and audience targeting
//    - Open Graph (OG) content quality for social sharing

// ---

// ### ⚠️ UNDERPERFORMANCE ANALYSIS

// For each area where the main website **falls behind competitors**, identify:
// - The likely root causes (e.g., “LCP is high due to unoptimized images and render-blocking JavaScript”).
// - The negative impact on user experience, SEO, or brand perception (e.g., “CLS above 0.1 increases bounce rate by ~15%”).
// Use **real competitor names** in all comparisons.

// ---

// ### HOW TO CLOSE THE COMPETITORS' GAP

// Provide a clear, categorized recommendation set based on internal analysis, avoiding generic suggestions like “optimize title tags” or “improve content.” Recommendations must be specific, actionable, and measurable, tailored to the provided data.

// #### 1. 🔧 Technical Improvements
// - Specific performance optimizations (e.g., “Compress hero image to under 100KB using WebP to reduce LCP”).
// - Front-end enhancements (e.g., “Implement lazy loading for below-the-fold images to lower TTI”).
// - Accessibility fixes (e.g., “Add descriptive alt text to all images to improve accessibility score to 85+”).
// - Include measurable goals (e.g., “Reduce LCP to under 2.5s to align with top competitors”).

// #### 2. 📈 SEO Enhancements
// - Recommend specific keywords inferred from competitor metadata (e.g., identify high-intent terms from their title tags and meta descriptions, such as “[industry-specific term] + [location/service]”).
// - Provide rewritten title tags and meta descriptions (e.g., “Change title to ‘[Specific Service] for [Target Audience]’ with 50–60 characters”).
// - Suggest schema/structured markup (e.g., “Implement FAQ schema on service pages to enhance rich snippets”).
// - Ensure metadata is clear, unique, and aligned with competitor strengths.

// #### 3. 📝 Strategic Content Improvements
// - Propose specific content topics and structures (e.g., “Create a 1,200-word guide on ‘[Industry-Specific Topic Relevant to Audience]’ with structured sections and schema markup”).
// - Refine USP messaging (e.g., “Highlight ‘[Unique Benefit from Competitor Analysis]’ in meta descriptions and headlines”).
// - Enhance engagement with content formats (e.g., “Add comparison tables or interactive tools to increase time on page by 20%”).
// - Strengthen visual assets for social previews (e.g., “Optimize OG images to 1200x630px with clear text overlays reflecting the USP”).

// ---

// ### IMPLEMENTATION PLAN
// - Prioritize actions by impact and feasibility (e.g., “Week 1: Compress images and minify scripts; Week 2: Update metadata with targeted keywords”).
// - Suggest monitoring metrics (e.g., “Track LCP and SEO score weekly via internal analytics dashboard”).
// - Provide a timeline for short-term (1–2 weeks), medium-term (3–4 weeks), and long-term (2–3 months) actions.

// ---

// ### FORMAT YOUR RESPONSE AS:

// - **Introduction**: Summarize key gaps and the goal to outperform competitors.
// - **Competitive Analysis**:
//   - Compare metrics (e.g., LCP, SEO score).
//   - Highlight competitor strengths (e.g., effective use of schema markup).
// - **Underperformance Analysis**:
//   - List weaknesses with root causes and impacts.
// - **Recommendations to Close the Gap**:
//   - Technical Fixes
//   - SEO Enhancements
//   - Content Strategies
// - **Implementation Plan**:
//   - Timeline and monitoring strategy.

// ---

// ### ADDITIONAL NOTES
// - **Keyword Specificity**: Derive keywords from competitor title tags and meta descriptions (e.g., if a competitor uses ‘[service] for [audience]’ in their title, suggest similar high-intent terms relevant to the industry).
// - **Avoid Generic Suggestions**: Instead of “improve meta descriptions,” provide exact rewrites (e.g., “Change meta description to: ‘[Specific Service] for [Target Audience]. [Unique Benefit].’ within 140–160 characters”).
// - **Tone**: Write for a client with moderate technical knowledge, explaining jargon (e.g., “LCP measures how fast the main content loads, affecting user retention”).
// - **Metrics Focus**: Prioritize high-impact metrics (e.g., LCP, SEO score) but address accessibility and content depth to match competitor strengths.
// - **Data Usage**: Use only the provided data. Infer competitor keyword strategies from their title tags, meta keywords, and descriptions. Do not rely on external tools; assume internal analytics provide sufficient insights.

// > **Important**: Use only the provided data and assume all tools and metrics are internal. Do not suggest or reference any third-party tools, platforms, or services.
// `;
// }



export function createComparisonPrompt(main: any, competitors: any[]) {
  return `
You are a digital strategy expert tasked with analyzing the website ${main.website_url} against its competitors to identify underperformance and provide actionable recommendations for improvement. The client may be from any industry (e.g., e-commerce, healthcare, government, services), so tailor recommendations to align with the provided data and general best practices. Use the competitor data to derive insights and benchmarks. Avoid generic suggestions like "improve SEO" or "enhance design." Instead, provide specific, measurable, and prioritized recommendations with clear examples, as if presenting to a client with moderate technical knowledge. Explain technical terms briefly to ensure clarity (e.g., "LCP, or Largest Contentful Paint, measures how fast the main content loads").

### Input Data
- **Main Website**: 
  - URL: ${main.website_url}
  - Meta Title: ${main.meta_title || 'N/A'}
  - Meta Description: ${main.meta_description || 'N/A'}
  - Meta Keywords: ${main.meta_keywords || 'N/A'}
  - Performance Metrics: 
    - LCP: ${main.lcp || 'N/A'} (Largest Contentful Paint, time to load main content)
    - CLS: ${main.cls || 'N/A'} (Cumulative Layout Shift, measures visual stability)
    - TTFB: ${main.ttfb || 'N/A'} (Time to First Byte, server response time)
    - SEO Score: ${main.seo_score || 'N/A'} (out of 100)
    - Accessibility Score: ${main.accessibility_score || 'N/A'} (out of 100)
  - Unique Selling Proposition (USP): ${main.usp || 'N/A'}

- **Competitors**:
  ${competitors.map((comp, index) => `
  - Competitor ${index + 1}:
    - URL: ${comp.website_url}
    - Meta Title: ${comp.meta_title || 'N/A'}
    - Meta Description: ${comp.meta_description || 'N/A'}
    - Meta Keywords: ${comp.meta_keywords || 'N/A'}
    - Performance Metrics:
      - LCP: ${comp.lcp || 'N/A'}
      - CLS: ${comp.cls || 'N/A'}
      - TTFB: ${comp.ttfb || 'N/A'}
      - SEO Score: ${comp.seo_score || 'N/A'}
      - Accessibility Score: ${comp.accessibility_score || 'N/A'}
    - USP: ${comp.usp || 'N/A'}
  `).join('\n')}

### Task
Generate a detailed report with the following sections. Use competitor data to set benchmarks and derive insights (e.g., keywords, messaging, performance standards). Provide exact rewrites, code snippets, or file size targets where applicable. If data is missing (e.g., 'N/A'), suggest industry-standard improvements based on best practices (e.g., Google’s Core Web Vitals: LCP < 2.5s, CLS < 0.1, TTFB < 600ms).

1. **Introduction (100-150 words)**:
   - Summarize the purpose: to analyze ${main.website_url} against competitors and recommend improvements.
   - Highlight the main website’s strengths (e.g., strong USP, high accessibility score) and key areas for improvement based on provided metrics.
   - Mention competitors’ strengths (e.g., faster LCP, better SEO) to set context for recommendations.
   - Example: “Your website, ${main.website_url}, has a compelling USP but lags in LCP (${main.lcp || 'N/A'}) compared to competitors like ${competitors[0]?.website_url} (${competitors[0]?.lcp || 'N/A'}).”

2. **Competitive Analysis (200-250 words)**:
   - Compare performance metrics (LCP, CLS, TTFB), SEO scores, accessibility scores, and messaging (meta title, description, keywords, USP).
   - Identify where ${main.website_url} underperforms or outperforms competitors. Use specific metrics (e.g., “${main.website_url}’s LCP of ${main.lcp || 'N/A'} is slower than ${competitors[0]?.website_url}’s ${competitors[0]?.lcp || 'N/A'}”).
   - Highlight competitor strategies to emulate, such as strong keywords or concise meta descriptions.
   - Example: “${competitors[0]?.website_url} uses keywords like '${competitors[0]?.meta_keywords || 'N/A'}' to target [audience], improving SEO. ${main.website_url}’s keywords (${main.meta_keywords || 'N/A'}) are less focused.”

3. **Underperformance Analysis (150-200 words)**:
   - Pinpoint specific issues causing underperformance (e.g., large image sizes, unoptimized scripts, weak meta tags, accessibility barriers).
   - Explain impacts in client-friendly terms (e.g., “A high LCP increases bounce rates, meaning users leave before engaging”).
   - Prioritize issues based on severity (e.g., LCP > 2.5s is critical per Google’s standards).
   - Example: “Your LCP of ${main.lcp || 'N/A'} exceeds Google’s recommended 2.5s, likely due to a ${main.hero_image_size || 'large'} hero image, causing 10-15% higher bounce rates.”

4. **Recommendations (300-350 words, bullet points)**:
   - Provide 5-7 specific, prioritized recommendations to address underperformance in performance, SEO, accessibility, and messaging.
   - Include exact actions, measurable goals, and competitor-inspired strategies. For example:
     - **Performance**: “Compress hero image to <100KB using WebP to reduce LCP to <2.5s, matching ${competitors[0]?.website_url} (${competitors[0]?.lcp || 'N/A'}).”
     - **SEO**: "Rewrite meta description to '[${main.usp || 'Your Service'}] for [target audience]' to align with ${competitors[0]?.meta_description || 'competitor messaging'}."
     - **Accessibility**: “Add alt text to ${main.image_count || 'all'} images to improve accessibility score to >90/100, like ${competitors[1]?.website_url}.”
     - **Messaging**: “Incorporate keywords like '${competitors[0]?.meta_keywords || 'relevant terms'}' into homepage content to boost SEO.”
   - Suggest adding schema markup (e.g., FAQ or Product schema) to enhance search visibility, inspired by competitors if applicable.

5. **Implementation Plan (150-200 words)**:
   - Outline a prioritized timeline for applying recommendations (e.g., “Week 1: Compress images; Week 2: Update meta tags”).
   - Specify tools or services (e.g., TinyPNG for image compression, Lighthouse for performance audits).
   - Highlight quick wins (e.g., “Reducing LCP can improve user retention in 1-2 weeks”).
   - Example: “Start by compressing images using TinyPNG to cut LCP to <2.5s in Week 1, matching ${competitors[0]?.website_url}. Update meta tags in Week 2 to boost SEO.”

### Output Format
- Use markdown with clear headings (##, ###) and bullet points for recommendations.
- Ensure recommendations are concise, actionable, and measurable (e.g., “Reduce LCP to <2.5s” instead of “improve speed”).
- Include at least one code snippet or exact rewrite per section where relevant (e.g., \`<img src="hero.webp" alt="Service description" loading="lazy">\`).
- If data is incomplete, use industry standards (e.g., aim for SEO score >80/100, accessibility score >90/100).

### Constraints
- Do not invent data beyond what’s provided or implied by best practices.
- Avoid technical jargon without explanation (e.g., define CLS as “visual stability”).
- Ensure recommendations are practical for a small team with limited resources.
- Do not suggest paid tools unless free alternatives exist (e.g., Lighthouse over SEMrush).

Generate the report now, ensuring it’s professional, client-ready, and inspired by competitor benchmarks.
`;
}



