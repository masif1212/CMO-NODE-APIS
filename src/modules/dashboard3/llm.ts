
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


export function createComparisonPrompt(main: any, competitors: any[]) {
  const mainDesc = `
Main Website:
- URL: ${main.website_url}
- Title: ${main.meta.title}
- Meta Description: ${main.meta.meta_description}
- OG Description: ${main.meta.og_description}
- Performance Score: ${main.page_speed?.performance_score}
- SEO Score: ${main.page_speed?.seo_score}
- Accessibility Score: ${main.page_speed?.accessibility_score}
- Best Practices Score: ${main.page_speed?.best_practices_score}
- Time to Interactive: ${main.page_speed?.time_to_interactive}
- Speed Index: ${main.page_speed?.speed_index}
- Largest Contentful Paint: ${main.page_speed?.largest_contentful_paint}
- Total Blocking Time: ${main.page_speed?.total_blocking_time}
- Cumulative Layout Shift: ${main.page_speed?.cumulative_layout_shift}
`;

  const compDesc = competitors.map(comp => `
Competitor: ${comp.name}
- URL: ${comp.website_url}
- Title: ${comp.meta.title}
- Meta Description: ${comp.meta.meta_description}
- OG Description: ${comp.meta.og_description}
- Performance Score: ${comp.page_speed?.performance_score}
- SEO Score: ${comp.page_speed?.seo_score}
- Accessibility Score: ${comp.page_speed?.accessibility_score}
- Best Practices Score: ${comp.page_speed?.best_practices_score}
- Time to Interactive: ${comp.page_speed?.time_to_interactive}
- Speed Index: ${comp.page_speed?.speed_index}
- Largest Contentful Paint: ${comp.page_speed?.largest_contentful_paint}
- Total Blocking Time: ${comp.page_speed?.total_blocking_time}
- Cumulative Layout Shift: ${comp.page_speed?.cumulative_layout_shift}
`).join("\n");

  return `
You are a senior digital strategist analyzing detailed metadata and website performance metrics for one main website and its competitors.

==============================
📊 WEBSITE COMPARISON DATA
==============================

${mainDesc}

${compDesc}

==============================
🔍 TASK
==============================

1. Provide a **detailed comparative analysis** of the main website versus its competitors, focusing on, these key aspects:

- ⚡ Performance metrics (Speed Index, Largest Contentful Paint, Time to Interactive, Cumulative Layout Shift, Total Blocking Time)
- 🔍 SEO quality (SEO score, meta/title tag quality, keyword usage, meta description clarity and length)
- 🧑‍💻 Accessibility and Best Practices scores
- 🎯 Messaging (USP clarity, meta descriptions, target audience alignment)
- 📣 Visual Content (OG tags and metadata consistency)

2. For each area where the main website **underperforms compared to competitors**, explain:

- The likely reasons or root causes for this underperformance
- How these issues impact user experience, SEO, or brand perception

3. Provide **specific, actionable recommendations** tailored to addressing the weaknesses of the main website, including technical, content, and strategic improvements.

4. Use the actual competitor names in your analysis and recommendations — avoid generic labels like “Competitor 1.”

5. Format your output clearly with two main sections:
   - **Comparison Analysis**
   - **Recommendations & Suggestions**

Write in a professional tone and use bullet points for clarity.
`;
}


