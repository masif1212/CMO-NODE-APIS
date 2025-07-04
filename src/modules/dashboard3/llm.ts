
import OpenAI from 'openai';
import 'dotenv/config';
import axios from 'axios';
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export const openai = new OpenAI({
     apiKey: process.env.OPENAI_API_KEY
});



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
    // console.log(`LLM raw response for website_id: ${site.website_id}: ${output}`);

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

export async function createComparisonPrompt(website_id: string) {
 let recommendation = null;
      recommendation = await prisma.llm_responses.findUnique({
        where: { website_id: website_id }, // Updated to use website_id
        select: {
          id: true,
          website_id: true,
          dashboard3_competi_camparison:true,
         
        },
      });


    function safeParse(jsonStr: any) {
  try {
    return typeof jsonStr === "string" ? JSON.parse(jsonStr) : jsonStr;
  } catch (e) {
    console.error("JSON parse failed:", e);
    return jsonStr; // fallback to raw string
  }
}

// return `
// You are a digital strategy expert tasked with analyzing a website’s performance, SEO, and accessibility metrics compared to industry competitors. Your goal is to identify *specific, high-impact, and cross-functional recommendations* that a moderately technical client can execute. Each recommendation must reference a *specific competitor* that performs better in that area and explain how the client can match or outperform them.

// ### Input Data
// - ${(recommendation && recommendation.dashboard3_competi_camparison) ? recommendation.dashboard3_competi_camparison : 'No competitor comparison data available.'}

// ### Task
// Generate a JSON response with a single key, "recommendations", containing an array of objects. Each object should identify one underperforming area of the main website, using **competitor benchmarks** or **industry best practices** (e.g., Core Web Vitals, accessibility standards).

// For each recommendation:
// - **tag**: The exact field name from the data (e.g., website_audit.website_health_matrix.largest_contentful_paint).
// - **how_to_close_the_gap**: A specific and actionable plan (3–5 sentences) that includes:
//   - The competitor performing better (e.g., “LegalZoom’s LCP is 1.2s compared to 3.8s on your site”).
//   - Technical recommendation (e.g., “compress hero images to <100KB using WebP”).
//   - Measurable goal (e.g., “reduce LCP to under 1.2s”).
//   - Validation step (e.g., “use browser Performance tab to confirm”).
//   - Business impact (e.g., “Improves page speed, reducing bounce rates and boosting conversions”).

// ### Additional Instructions:
// - Use cross-functional reasoning where applicable (e.g., how performance + accessibility + SEO affect conversions).
// - If multiple competitors outperform the site, mention the best-performing one as the benchmark.
// - If competitor data is missing, use industry standards (e.g., LCP < 2.5s, CLS < 0.1, Accessibility Score > 90).
// - Avoid vague language like “enhance UX” or “improve SEO.”
// - Define any technical terms briefly (e.g., “CLS, or Cumulative Layout Shift, measures visual stability”).
// - Only reference free tools (e.g., browser dev tools), no paid tools.
// - Ensure suggestions are practical for a small dev/design team.

// ### Output Format
// {
//   "recommendations": [
//     {
//       "tag": "string",
//       "how_to_close_the_gap": "string"
//     },
//     ...
//   ]
// }

// ### Example Output
// {
//   "recommendations": [
//     {
//       "tag": "website_audit.website_health_matrix.largest_contentful_paint",
//       "how_to_close_the_gap": "LegalZoom achieves a Largest Contentful Paint (LCP) of 1.2s, while your site loads the main content in 3.6s. To close this gap, compress above-the-fold images to under 100KB using WebP and defer non-critical JavaScript. Aim to reduce LCP to under 1.5s. Validate improvements using the browser's Performance tab. A faster LCP lowers bounce rates by 10–15%, improving user engagement and conversions."
//     },
//     {
//       "tag": "website_audit.performance_insight.accessibility",
//       "how_to_close_the_gap": "Rocket Lawyer has an accessibility score of 98 compared to your current score of 82. Improve this by adding ARIA labels to form inputs, ensuring buttons are keyboard-navigable, and increasing color contrast for text elements. Aim for a score above 95. Test using keyboard-only navigation and contrast-checking browser extensions. Improved accessibility broadens your reach and reduces legal risk while improving trust with users."
//     },
//     {
//       "tag": "seo_audit.meta_title",
//       "how_to_close_the_gap": "Your meta title is 72 characters and gets truncated in search results, while Rocket Lawyer keeps titles under 60 characters with strong keywords like 'Affordable Legal Help Online'. Revise your meta title to stay within 50–60 characters, incorporate relevant keywords (e.g., 'Instant Legal Help'), and place your brand at the end. Preview it in search result simulations to validate. A cleaner meta title boosts SEO rankings and click-through rates."
//     }
//   ]
// }
// `;


return `
You are a digital strategy expert tasked with analyzing a website’s performance, SEO, and accessibility metrics compared to industry competitors. Your goal is to identify *specific, high-impact, and cross-functional recommendations* that a moderately technical client can execute. Each recommendation must reference a *specific competitor* that performs better in that area and explain how the client can match or outperform them.

### Input Data
- ${(recommendation && recommendation.dashboard3_competi_camparison) ? recommendation.dashboard3_competi_camparison : 'No competitor comparison data available.'}

### Task
Generate a JSON response with a single key, "recommendations", containing an array of objects. Each object should identify one underperforming area of the main website, using **competitor benchmarks** or **industry best practices** (e.g., Core Web Vitals, accessibility standards).

For each recommendation:
- **tag**: The exact field name from the data (e.g., website_audit.website_health_matrix.largest_contentful_paint).
- **how_to_close_the_gap**: A specific and actionable plan (3–5 sentences) that includes:
  - The competitor performing better (e.g., “LegalZoom’s LCP is 1.2s compared to 3.8s on your site”).
  - Technical recommendation (e.g., “compress hero images to <100KB using WebP”).
  - Measurable goal (e.g., “reduce LCP to under 1.2s”).
  - Validation step using only built-in browser features (e.g., “open your site in a private browser window and observe image load timing or layout shifts”).
  - Business impact (e.g., “Improves page speed, reducing bounce rates and boosting conversions”).

### Additional Instructions:
- Use cross-functional reasoning where applicable (e.g., how performance + accessibility + SEO affect conversions).
- If multiple competitors outperform the site, mention the best-performing one as the benchmark.
- If competitor data is missing, use industry standards (e.g., LCP < 2.5s, CLS < 0.1, Accessibility Score > 90).
- Avoid vague language like “enhance UX” or “improve SEO.”
- Briefly define any technical terms you use (e.g., “CLS, or Cumulative Layout Shift, measures visual stability”).
- **Do NOT mention any external APIs, platforms, or tools** (e.g., Lighthouse, PageSpeed Insights, Axe, Google Search Console).
- Assume the user only has access to free browser developer tools and manual testing.
- Ensure suggestions are practical and executable by a small dev/design team.

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
      "tag": "website_audit.website_health_matrix.largest_contentful_paint",
      "how_to_close_the_gap": "LegalZoom achieves a Largest Contentful Paint (LCP) of 1.2s, while your site loads the main content in 3.6s. To close this gap, compress above-the-fold images to under 100KB using WebP format and defer any non-essential JavaScript that delays rendering. Aim to reduce LCP to under 1.5s. Check this by loading the page in a private browser window and observing when the main visual content appears. A lower LCP improves perceived load time, keeping users engaged and improving conversions."
    },
    {
      "tag": "website_audit.performance_insight.accessibility",
      "how_to_close_the_gap": "Rocket Lawyer has an accessibility score of 98, while your site currently sits at 82. Improve this by labeling all form fields with ARIA tags, ensuring all buttons can be operated by keyboard, and using colors with high contrast ratios (at least 4.5:1 for body text). Try navigating the site using only a keyboard to verify no critical elements are missed. Accessibility boosts your SEO ranking and ensures a wider range of users can engage with your site, including those with disabilities."
    },
    {
      "tag": "seo_audit.meta_title",
      "how_to_close_the_gap": "Your meta title is currently 72 characters long and appears truncated in search results, while Rocket Lawyer keeps titles under 60 characters and includes phrases like 'Affordable Legal Help Online'. Rewrite your title to fit within 50–60 characters, use primary keywords at the front (e.g., 'Instant Legal Help'), and end with your brand name. To validate, hover over the browser tab and confirm that the full title is visible. A shorter, keyword-focused title increases click-through rates and search visibility."
    }
  ]
}
`;


}



