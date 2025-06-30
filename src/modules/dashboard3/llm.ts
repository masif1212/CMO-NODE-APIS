
import OpenAI from 'openai';
import 'dotenv/config';

export const openai = new OpenAI({
     apiKey: process.env.OPENAI_API_KEY
});


import axios from 'axios';

export async function fetchCompetitorsFromLLM(
  site: any,
  userRequirement: any,
  competitorsToGenerate: number = 5,
  existingUrls: string[] = [],
  existingNames: string[] = []
): Promise<string> {
  const prompt = `
You are a market research assistant specializing in competitor analysis.

Given the following website metadata and details for the main website:
- Website URL: ${site.website_url ?? 'Unknown'}
- Title: ${site.page_title ?? 'None'}
- Description: ${site.meta_description ?? 'None'}
- Keywords: ${site.meta_keywords ?? 'None'}

User requirements:
- Industry: ${userRequirement.industry ?? 'Unknown'}
- Region of Operation: ${userRequirement.region_of_operation ?? 'Unknown'}
- Target Location: ${userRequirement.target_location ?? 'Unknown'}
- Target Audience: ${userRequirement.target_audience ?? 'Unknown'}
- Primary Offering: ${userRequirement.primary_offering ?? 'Unknown'}
- USP: ${userRequirement.USP ?? 'Unknown'}

Return a **valid JSON array** containing exactly **${competitorsToGenerate} unique regional competitors** that:
- Are real, active businesses with operational websites that return an HTTP 200 status.
- Have a website URL pointing to the primary landing page (e.g., https://example.com, not a blog post or subpage).
- Are relevant to the main website's industry and region of operation.
- Match the target audience (demographics, interests, intent).
- Have a clear unique selling proposition (USP) and primary offering.
- Are not hypothetical or non-existent entities.
- Are not social media platforms, generic sites (e.g., Facebook, Google), or marketplaces (e.g., Amazon).
- Are not included in the following URLs: ${existingUrls.join(', ') || 'none'}.
- Are not included in the following names: ${existingNames.join(', ') || 'none'}.
- Are diverse in their offerings or regional focus to avoid redundancy.
- **Must have a valid, accessible website; exclude any competitors without an operational website.**

Output format (ensure valid JSON):
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

If fewer than ${competitorsToGenerate} valid competitors are found, return as many as possible in a valid JSON array.
If no valid competitors are found, return an empty array: [].
Ensure the response is strictly a valid JSON string with proper syntax.
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const output = response.choices[0]?.message?.content?.trim();
    if (!output) {
      console.warn(`LLM returned empty response for website_id: ${site.website_id}`);
      return '[]';
    }

    // Log raw response for debugging
    console.log(`LLM raw response for website_id: ${site.website_id}: ${output}`);

    // Attempt to fix common JSON issues
    let fixedOutput = output
      .replace(/^```json\n|\n```$/g, '') // Remove code block markers
      .replace(/,\s*([\]}])/g, '$1'); // Fix trailing commas

    // Ensure array brackets
    if (!fixedOutput.startsWith('[') || !fixedOutput.endsWith(']')) {
      fixedOutput = `[${fixedOutput}]`;
    }

    // Parse JSON
    let competitors: any[];
    try {
      competitors = JSON.parse(fixedOutput);
    } catch (parseErr) {
      const errMsg = (parseErr instanceof Error) ? parseErr.message : String(parseErr);
      console.error(`LLM returned invalid JSON for website_id: ${site.website_id}: ${errMsg}`);
      console.error(`Raw output: ${output}`);
      return '[]';
    }

    // Validate URLs and filter competitors
    const validCompetitors = [];
    for (const competitor of competitors) {
      try {
        const url = competitor.website_url;
        if (!url || !url.startsWith('http')) {
          console.warn(`Invalid URL for competitor ${competitor.name}: ${url}`);
          continue;
        }

        // Check if URL returns HTTP 200
        const response = await axios.head(url, {
          timeout: 5000, // 5-second timeout
          validateStatus: (status) => status === 200,
        });

        if (response.status === 200) {
          validCompetitors.push(competitor);
        } else {
          console.warn(`Non-200 status for competitor ${competitor.name}: ${url} (Status: ${response.status})`);
        }
      } catch (err) {
        console.warn(`Error validating URL for competitor ${competitor.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Select top 3 competitors (or fewer if not enough valid ones)
    const selectedCompetitors = validCompetitors.slice(0, 3);

    // Log results
    console.log(`Found ${validCompetitors.length} valid competitors, selected ${selectedCompetitors.length} for website_id: ${site.website_id}`);

    // Return as JSON string
    return JSON.stringify(selectedCompetitors);
  } catch (err: any) {
    console.error(`Error fetching competitors from LLM for website_id: ${site.website_id}: ${err.message}`);
    return '[]';
  }
}



// export async function fetchCompetitorsFromLLM(site: any, userRequirement: any, competitorsToGenerate: number = 4, existingUrls: string[], existingNames: string[]): Promise<string> {
//       const prompt = `
// You are a market research assistant.

// Given the following website metadata and details:
// - Website URL: ${site.website_url}
// - Title: ${site.page_title ?? 'None'}
// - Description: ${site.meta_description ?? 'None'}
// - Keywords: ${site.meta_keywords ?? 'None'}


// - Industry: ${userRequirement.industry ?? 'Unknown'}
// - Region of Operation: ${userRequirement.region_of_operation ?? 'Unknown'}
//  Region of Operation: ${userRequirement.region_of_operation ?? 'Unknown'}
// - Target Location: ${userRequirement.target_location ?? 'Unknown'}
// - Target Audience: ${userRequirement.target_audience ?? 'Unknown'}
// - Primary Offering: ${userRequirement.primary_offering ?? 'Unknown'}
// - USP: ${userRequirement.USP ?? 'Unknown'}

// Return a **JSON array** with the **top ${competitorsToGenerate} regional competitors** based on:
// - Target audience (demographics, interests, intent)
// - Region of operation (must be in the same or relevant local region)

// Each competitor must:
// - Be a real, active business with a valid, accessible HTTP(S) website (verified to return HTTP 200 status).
// - Have a website URL of the primary landing page (e.g., https://example.com/home), not a blog post, article, or subpage.
// - Not be a hypothetical or non-existent entity.
// - Have a clear unique selling proposition (USP) and primary offering relevant to the website's industry.

// Output format:

// \`\`\`json
// [
//   {
//     "name": "Competitor Name",
//     "website_url": "https://example.com",
//     "industry": "Industry/Niche",
//     "region": "Region of Operation",
//     "target_audience": "Target Audience",
//     "primary_offering": "Primary Offering",
//     "usp": "Unique Selling Proposition"
//   }
// ]
// \`\`\`

// If no competitors are found, return an empty array.
// `; // keep your current prompt as-is
//   const res = await openai.responses.create({
//     model: 'gpt-4o',
//     input: prompt,
//     tools: [
//       { 
//         type: 'web_search_preview', 
//         search_context_size: 'medium',
//         user_location: {
//           type: 'approximate',
//           region: userRequirement.region_of_operation?.country || 'Unknown',
//           }
//       }
//     ],
//   });
//   return res.output_text.trim() || '';
// }




// export async function fetchCompetitorsFromLLM(
//   site: any,
//   userRequirement: any,
//   competitorsToGenerate: number = 4,
//   existingUrls: string[] = [],
//   existingNames: string[] = []
// ): Promise<string> {
//   const prompt = `
// You are a market research assistant.

// Given the following website metadata and details:
// - Website URL: ${site.website_url ?? 'Unknown'}
// - Title: ${site.page_title ?? 'None'}
// - Description: ${site.meta_description ?? 'None'}
// - Keywords: ${site.meta_keywords ?? 'None'}

// User requirements:
// - Industry: ${userRequirement.industry ?? 'Unknown'}
// - Region of Operation: ${userRequirement.region_of_operation ?? 'Unknown'}
// - Target Location: ${userRequirement.target_location ?? 'Unknown'}
// - Target Audience: ${userRequirement.target_audience ?? 'Unknown'}
// - Primary Offering: ${userRequirement.primary_offering ?? 'Unknown'}
// - USP: ${userRequirement.USP ?? 'Unknown'}

// Return a **JSON array** with the **top ${competitorsToGenerate} unique regional competitors** based on:
// - Target audience (demographics, interests, intent)
// - Region of operation (must be in the same or relevant local region)

// Each competitor must:
// - Be a real, active business with a valid, accessible HTTP(S) website that returns an HTTP 200 status.
// - Have a website URL of the primary landing page (e.g., https://example.com, not a blog post or subpage).
// - Not be a hypothetical or non-existent entity.
// - Have a clear unique selling proposition (USP) and primary offering relevant to the website's industry.
// - Not have a website URL in: ${existingUrls.join(', ') || 'none'}.
// - Not have a name in: ${existingNames.join(', ') || 'none'}.
// - Not be a social media platform, generic site (e.g., Facebook, Google), or marketplace (e.g., Amazon).
// - Be diverse in their offerings or regions to avoid redundancy.
// - Have an existing, operational website; exclude competitors without a website.

// Output format:
// \`\`\`json
// [
//   {
//     "name": "Competitor Name",
//     "website_url": "https://example.com",
//     "industry": "Industry/Niche",
//     "region": "Region of Operation",
//     "target_audience": "Target Audience",
//     "primary_offering": "Primary Offering",
//     "usp": "Unique Selling Proposition"
//   }
// ]
// \`\`\`

// If no valid competitors with websites are found, return an empty array: [].
// Ensure the response is a valid JSON string.
// `;

//   try {
//     const response = await openai.chat.completions.create({
//       model: 'gpt-4o',
//       messages: [{ role: 'user', content: prompt }],
//       temperature: 0.7,
//       max_tokens: 2000,
//     });

//     const output = response.choices[0]?.message?.content?.trim();
//     if (!output) {
//       console.warn('LLM returned empty response');
//       return '[]';
//     }

//     // Validate JSON
//     try {
//       JSON.parse(output);
//       return output;
//     } catch {
//       console.error('LLM returned invalid JSON, falling back to empty array');
//       return '[]';
//     }
//   } catch (err: any) {
//     console.error(`Error fetching competitors from LLM: ${err.message}`);
//     return '[]';
//   }
// }
// export async function fetchCompetitorsFromLLM(
//   site: any,
//   userRequirement: any,
//   competitorsToGenerate: number = 6,
//   existingUrls: string[] = [],
//   existingNames: string[] = []
// ): Promise<string> {
//   const prompt = `
// You are a market research assistant specializing in competitor analysis.

// Given the following website metadata and details for the main website:
// - Website URL: ${site.website_url ?? 'Unknown'}
// - Title: ${site.page_title ?? 'None'}
// - Description: ${site.meta_description ?? 'None'}
// - Keywords: ${site.meta_keywords ?? 'None'}

// User requirements:
// - Industry: ${userRequirement.industry ?? 'Unknown'}
// - Region of Operation: ${userRequirement.region_of_operation ?? 'Unknown'}
// - Target Location: ${userRequirement.target_location ?? 'Unknown'}
// - Target Audience: ${userRequirement.target_audience ?? 'Unknown'}
// - Primary Offering: ${userRequirement.primary_offering ?? 'Unknown'}
// - USP: ${userRequirement.USP ?? 'Unknown'}

// Return a **valid JSON array** containing exactly **${competitorsToGenerate} unique regional competitors** that:
// - Are real, active businesses with operational websites that return an HTTP 200 status.
// - Have a website URL pointing to the primary landing page (e.g., https://example.com, not a blog post or subpage).
// - Are relevant to the main website's industry and region of operation.
// - Match the target audience (demographics, interests, intent).
// - Have a clear unique selling proposition (USP) and primary offering.
// - Are not hypothetical or non-existent entities.
// - Are not social media platforms, generic sites (e.g., Facebook, Google), or marketplaces (e.g., Amazon).
// - Are not included in the following URLs: ${existingUrls.join(', ') || 'none'}.
// - Are not included in the following names: ${existingNames.join(', ') || 'none'}.
// - Are diverse in their offerings or regional focus to avoid redundancy.
// - **Must have a valid, accessible website; exclude any competitors without an operational website.**

// Output format (ensure valid JSON):
// \`\`\`json
// [
//   {
//     "name": "Competitor Name",
//     "website_url": "https://example.com",
//     "industry": "Industry/Niche",
//     "region": "Region of Operation",
//     "target_audience": "Target Audience",
//     "primary_offering": "Primary Offering",
//     "usp": "Unique Selling Proposition"
//   }
// ]
// \`\`\`

// If fewer than ${competitorsToGenerate} valid competitors are found, return as many as possible in a valid JSON array.
// If no valid competitors are found, return an empty array: [].
// Ensure the response is strictly a valid JSON string with proper syntax.
// `;

//   try {
//     const response = await openai.chat.completions.create({
//       model: 'gpt-4o',
//       messages: [{ role: 'user', content: prompt }],
//       temperature: 0.7,
//       max_tokens: 2000,
//     });

//     const output = response.choices[0]?.message?.content?.trim();
//     if (!output) {
//       console.warn('LLM returned empty response for website_id: ${site.website_id}');
//       return '[]';
//     }

//     // Log raw response for debugging
//     console.log(`LLM raw response for website_id: ${site.website_id}: ${output}`);

//     // Attempt to fix common JSON issues
//     let fixedOutput = output;
//     // Remove code block markers if present
//     fixedOutput = fixedOutput.replace(/^```json\n|\n```$/g, '');
//     // Fix trailing commas
//     fixedOutput = fixedOutput.replace(/,\s*([\]}])/g, '$1');
//     // Ensure array brackets
//     if (!fixedOutput.startsWith('[') || !fixedOutput.endsWith(']')) {
//       fixedOutput = `[${fixedOutput}]`;
//     }

//     // Validate JSON
//     try {
//       JSON.parse(fixedOutput);
//       return fixedOutput;
//     } catch (parseErr) {
//       const errMsg = (parseErr instanceof Error) ? parseErr.message : String(parseErr);
//       console.error(`LLM returned invalid JSON for website_id: ${site.website_id}: ${errMsg}`);
//       console.error(`Raw output: ${output}`);
//       return '[]';
//     }
//   } catch (err: any) {
//     console.error(`Error fetching competitors from LLM for website_id: ${site.website_id}: ${err.message}`);
//     return '[]';
//   }
// }


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







// export function createComparisonPrompt(main: any, competitors: any[],userRequirementRaw: any) {

//   return `
// You are a digital strategy expert tasked with analyzing the website ${main.website_url} against its competitors to identify underperformance and provide actionable recommendations for improvement. The client may be from any industry (e.g., e-commerce, healthcare, government, services), so tailor recommendations to align with the provided data and general best practices. Use the competitor data to derive insights and benchmarks. Avoid generic suggestions like "improve SEO" or "enhance design." Instead, provide specific, measurable, and prioritized recommendations with clear examples, as if presenting to a client with moderate technical knowledge. Explain technical terms briefly to ensure clarity (e.g., "LCP, or Largest Contentful Paint, measures how fast the main content loads").

// ### Input Data
// - **Main Website**: 
//   - URL: ${main.website_url}
//   - Meta Title: ${main.meta?.title || 'N/A'}
//   - Meta Description: ${main.meta?.meta_description || 'N/A'}
//   - Meta Keywords: ${main.meta?.meta_keywords || 'N/A'}
//   - Performance Metrics: 
//     - LCP: ${main.page_speed?.largest_contentful_paint || 'N/A'} (Largest Contentful Paint, time to load main content)
//     - CLS: ${main.page_speed?.cumulative_layout_shift || 'N/A'} (Cumulative Layout Shift, measures visual stability)
//     - TTFB: ${main.page_speed?.time_to_interactive || 'N/A'} (Time to First Byte, server response time)
//     -Speed Index: ${main.page_speed?.speed_index || 'N/A'} (how quickly content is visually populated)
//     - First Contentful Paint: ${main.page_speed?.first_contentful_paint || 'N/A'} (time to first text or image)
//     - Time to Interactive: ${main.page_speed?.time_to_interactive || 'N/A '} (time until the page is fully interactive)
//     - Total Blocking Time: ${main.page_speed?.total_blocking_time || 'N/A'} (time the main thread is blocked)
//     - SEO Score: ${main.page_speed?.seo_score || 'N/A'} (out of 100)
//     - Accessibility Score: ${main.page_speed?.accessibility_score || 'N/A'} (out of 100)
//   - Unique Selling Proposition (USP): ${userRequirementRaw.usp || 'N/A'}
// - **Industry**: ${userRequirementRaw.industry || 'Unknown'}
// - **Region of Operation**: ${userRequirementRaw.region_of_operation || 'Unknown'}
// - **Target Location**: ${userRequirementRaw.target_location || 'Unknown'}
// - **Target Audience**: ${userRequirementRaw.target_audience || 'Unknown'}
// - **Primary Offering**: ${userRequirementRaw.primary_offering || 'Unknown'}


// - **Competitors**:
//   ${competitors.map((comp, index) => `
//   - Competitor ${index + 1}:
//     - URL: ${comp.website_url}
//     - Meta Title: ${comp.meta?.title || 'N/A'}
//     - Meta Description: ${comp.meta?.meta_description || 'N/A'}
//     - Meta Keywords: ${comp.meta?.meta_keywords || 'N/A'}
//     - Performance Metrics:
//       - LCP: ${comp.page_speed?.largest_contentful_paint || 'N/A'}
//       - CLS: ${comp.page_speed?.cumulative_layout_shift || 'N/A'}
//       - TTFB: ${comp.page_speed?.time_to_first_byte || 'N/A'}
//       - SEO Score: ${comp.page_speed?.seo_score || 'N/A'}
//       - Accessibility Score: ${comp.page_speed?.accessibility_score || 'N/A'}
//     - USP: ${comp.usp || 'N/A'}
//   `).join('\n')}

// ### Task
// Generate a detailed report with the following sections. Use competitor data to set benchmarks and derive insights (e.g., keywords, messaging, performance standards). Provide exact rewrites, code snippets, or file size targets where applicable. If data is missing (e.g., 'N/A'), suggest industry-standard improvements based on best practices (e.g., Google’s Core Web Vitals: LCP < 2.5s, CLS < 0.1, TTFB < 600ms).

// ur website, ${main.website_url}, has a compelling USP but lags in LCP (${main.page_speed?.largest_contentful_paint || 'N/A'}) compared to competitors like ${competitors[0]?.website_url} (${competitors[0]?.page_speed?.largest_contentful_paint || 'N/A'}).”

// 2. **Competitive Analysis (200-250 words)**:
//    - Compare performance metrics (LCP, CLS, TTFB), SEO scores, accessibility scores, and messaging (meta title, description, keywords, USP).
//    - Identify where ${main.website_url} underperforms or outperforms competitors. Use specific metrics (e.g., “${main.website_url}’s LCP of ${main.page_speed?.largest_contentful_paint || 'N/A'} is slower than ${competitors[0]?.website_url}’s ${competitors[0]?.page_speed?.largest_contentful_paint || 'N/A'}”).
//    - Highlight competitor strategies to emulate, such as strong keywords or concise meta descriptions.
//    - Example: “${competitors[0]?.website_url} uses keywords like '${competitors[0]?.meta?.meta_keywords || 'N/A'}' to target [audience], improving SEO. ${main.website_url}’s keywords (${main.meta?.meta_keywords || 'N/A'}) are less focused.”

// 3. **Underperformance Analysis (150-200 words)**:
//    - Pinpoint specific issues causing underperformance (e.g., large image sizes, unoptimized scripts, weak meta tags, accessibility barriers).
//    - Explain impacts in client-friendly terms (e.g., “A high LCP increases bounce rates, meaning users leave before engaging”).
//    - Prioritize issues based on severity (e.g., LCP > 2.5s is critical per Google’s standards).
//    - Example: “Your LCP of ${main.page_speed?.largest_contentful_paint || 'N/A'} exceeds Google’s recommended 2.5s, likely due to a ${main.hero_image_size || 'large'} hero image, causing 10-15% higher bounce rates.”

// 4. **Recommendations (300-350 words, bullet points)**:
//    - Provide 5-7 specific, prioritized recommendations to address underperformance in performance, SEO, accessibility, and messaging.
//    - Include exact actions, measurable goals, and competitor-inspired strategies. For example:
//      - **Performance**: “Compress hero image to <100KB using WebP to reduce LCP to <2.5s, matching ${competitors[0]?.website_url} (${competitors[0]?.page_speed?.largest_contentful_paint || 'N/A'}).”
//      - **SEO**: “Rewrite meta description to '[${main.usp || 'Your Service'}] for [target audience]' to align with ${competitors[0]?.meta?.meta_description || 'competitor messaging'}.”
//      - **Accessibility**: “Add alt text to ${main.image_count || 'all'} images to improve accessibility score to >90/100, like ${competitors[1]?.website_url}.”
//      - **Messaging**: “Incorporate keywords like '${competitors[0]?.meta?.meta_keywords || 'relevant terms'}' into homepage content to boost SEO.”
//    - Suggest adding schema markup (e.g., FAQ or Product schema) to enhance search visibility, inspired by competitors if applicable.

// 5. **Implementation Plan (150-200 words)**:
//    - Outline a prioritized timeline for applying recommendations (e.g., “Week 1: Compress images; Week 2: Update meta tags”).
//    - Specify tools or services (e.g., TinyPNG for image compression, Lighthouse for performance audits).
//    - Highlight quick wins (e.g., “Reducing LCP can improve user retention in 1-2 weeks”).
//    - Example: “Start by compressing images using TinyPNG to cut LCP to <2.5s in Week 1, matching ${competitors[0]?.website_url}. Update meta tags in Week 2 to boost SEO.”

// ### Output Format


// ## Section Title

// ### Recommendation
// - Point 1
// - Point 2
// - ...

// ## Next Section Title

// ### Recommendation
// - Point 1
// - ...

// ### Constraints
// - Do not invent data beyond what’s provided or implied by best practices.
// - Avoid technical jargon without explanation (e.g., define CLS as “visual stability”).
// - Ensure recommendations are practical for a small team with limited resources.
// - Do not suggest paid tools unless free alternatives exist (e.g., Lighthouse over SEMrush).

// Generate the report now, ensuring it’s professional, client-ready, and inspired by competitor benchmarks.
// `;
// }

export function createComparisonPrompt(main: any = {}, competitors: any[] = [], userRequirementRaw: any = {}) {
  main = main || {};
  competitors = Array.isArray(competitors) ? competitors : [];
  userRequirementRaw = userRequirementRaw || {};
  return `
You are a digital strategy expert tasked with analyzing the website ${main.website_url} against its competitors to identify underperformance and provide actionable recommendations to close the performance gap. The client may be from any industry (e.g., e-commerce, healthcare, government, services), so tailor recommendations to align with the provided data and general best practices. Use competitor data to set benchmarks and derive insights (e.g., keywords, messaging, performance standards). Avoid generic suggestions like "improve SEO" or "enhance design." Instead, provide specific, measurable, and prioritized recommendations with clear examples, as if presenting to a client with moderate technical knowledge. Explain technical terms briefly to ensure clarity (e.g., "LCP, or Largest Contentful Paint, measures how fast the main content loads").

### Input Data
- **Main Website**: 
  - URL: ${main.website_url}
  - Meta Title: ${main.meta?.title || 'N/A'}
  - Meta Description: ${main.meta?.meta_description || 'N/A'}
  - Meta Keywords: ${main.meta?.meta_keywords || 'N/A'}
  - Performance Metrics: 
    - LCP: ${main.page_speed?.largest_contentful_paint || 'N/A'} (Largest Contentful Paint, time to load main content)
    - CLS: ${main.page_speed?.cumulative_layout_shift || 'N/A'} (Cumulative Layout Shift, measures visual stability)
    - TTFB: ${main.page_speed?.time_to_first_byte || 'N/A'} (Time to First Byte, server response time)
    - Speed Index: ${main.page_speed?.speed_index || 'N/A'} (how quickly content is visually populated)
    - FCP: ${main.page_speed?.first_contentful_paint || 'N/A'} (First Contentful Paint, time to first text or image)
    - TTI: ${main.page_speed?.time_to_interactive || 'N/A'} (Time to Interactive, time until the page is fully interactive)
    - TBT: ${main.page_speed?.total_blocking_time || 'N/A'} (Total Blocking Time, time the main thread is blocked)
    - SEO Score: ${main.page_speed?.seo_score || 'N/A'} (out of 100)
    - Accessibility Score: ${main.page_speed?.accessibility_score || 'N/A'} (out of 100)
  - Unique Selling Proposition (USP): ${userRequirementRaw.usp || 'N/A'}
- **Industry**: ${userRequirementRaw.industry || 'Unknown'}
- **Region of Operation**: ${userRequirementRaw.region_of_operation || 'Unknown'}
- **Target Location**: ${userRequirementRaw.target_location || 'Unknown'}
- **Target Audience**: ${userRequirementRaw.target_audience || 'Unknown'}
- **Primary Offering**: ${userRequirementRaw.primary_offering || 'Unknown'}

- **Competitors**:
  ${competitors.map((comp, index) => `
  - Competitor ${index + 1}:
    - URL: ${comp.website_url}
    - Meta Title: ${comp.meta?.title || 'N/A'}
    - Meta Description: ${comp.meta?.meta_description || 'N/A'}
    - Meta Keywords: ${comp.meta?.meta_keywords || 'N/A'}
    - Performance Metrics:
      - LCP: ${comp.page_speed?.largest_contentful_paint || 'N/A'}
      - CLS: ${comp.page_speed?.cumulative_layout_shift || 'N/A'}
      - TTFB: ${comp.page_speed?.time_to_first_byte || 'N/A'}
      - SEO Score: ${comp.page_speed?.seo_score || 'N/A'}
      - Accessibility Score: ${comp.page_speed?.accessibility_score || 'N/A'}
    - Unique Selling Proposition (USP): ${userRequirementRaw?.usp || 'N/A'}
  `).join('\n')}

### Task
Generate a JSON response with a single key, \`recommendations\`, containing an array of objects. Each object represents an underperforming area for ${main.website_url} compared to competitors, with specific actions to close the performance gap. Use competitor data to set benchmarks and derive insights (e.g., faster LCP, stronger keywords). If data is missing (e.g., 'N/A'), suggest industry-standard improvements based on best practices (e.g., Google’s Core Web Vitals: LCP < 2.5s, CLS < 0.1, TTFB < 600ms).

Each recommendation object must include:
- **tag**: A concise label identifying the issue (e.g., "LCP", "Meta Description", "Accessibility Score").
- **how_to_close_the_gap**: A detailed, actionable plan (3-4 sentences) to address the issue, inspired by competitor performance or best practices. Include specific actions (e.g., code snippets, file size targets), measurable goals (e.g., "reduce LCP to <2.5s"), and manual validation steps (e.g., "check server response time in browser developer tools"). Explain impacts in client-friendly terms (e.g., "A high LCP increases bounce rates, meaning users leave before engaging").

### Output Format
{
  "recommendations": [
    {
      "tag": "string",
      "how_to_close_the_gap": "string"
    },
    ...
  ]
}

### Example Output
{
  "recommendations": [
    {
      "tag": "LCP",
      "how_to_close_the_gap": "Compress the hero image to <100KB using WebP format to reduce LCP to <2.5s, matching ${competitors[0]?.website_url}'s LCP of ${competitors[0]?.page_speed?.largest_contentful_paint || 'N/A'}. Optimize server response by enabling caching and using a CDN to lower TTFB. This will decrease bounce rates by 10-15% as users see content faster. Verify improvements by checking LCP in browser developer tools."
    },

    {
      "tag": "Meta Keywords",
      "how_to_close_the_gap": "Update meta keywords to include targeted terms like '${competitors[0]?.website_url}'s (${competitors[0]?.meta?.meta_keywords || 'N/A'}) to better align with ${userRequirementRaw.target_audience || 'target audience'}. This improves search engine relevance and click-through rates. Add meta keywords."
    }
  ]
}

### Constraints
- Do not invent data beyond what’s provided or implied by best practices.
- Avoid technical jargon without explanation (e.g., define CLS as “visual stability”).
- Ensure recommendations are practical for a small team with limited resources.
- Do not suggest paid tools unless free alternatives exist (e.g., Lighthouse over SEMrush).
- Prioritize recommendations based on severity (e.g., LCP > 2.5s is critical).
- Never mention any external tool like light house or axe DevTools etc.

Output only valid JSON.
`;
}

