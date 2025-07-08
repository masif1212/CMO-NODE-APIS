
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
You are an expert market research assistant specializing in competitor analysis. Your task is to identify **exactly 5 unique, famous, market-leading competitors** for the given main website, ranked in order of prominence (most renowned and established first). The competitors must be:

- **Real, active, well-known businesses** with operational websites that return an HTTP 200 status.
- **Market leaders or top-tier** in the same industry.
- Highly relevant to the main website's industry and region.
- Targeting a similar audience.
- Offering distinct but related products/services with a clear USP.
- Not included in: ${existingUrls.join(', ') || 'none'} (URLs), ${existingNames.join(', ') || 'none'} (names).
- Not social media, generic platforms, or marketplaces.
- Diverse in offerings or regional focus.
- Each must include a valid, accessible **homepage URL** (e.g., https://example.com).

**Main Website Metadata**:
- Website URL: ${site.website_url ?? 'Unknown'}
- Title: ${site.page_title ?? 'None'}
- Description: ${site.meta_description ?? 'None'}
- Keywords: ${site.meta_keywords ?? 'None'}

**User Requirements**:
- Industry: ${userRequirement.industry ?? 'Unknown'}
- Region of Operation: ${userRequirement.region_of_operation ?? 'Unknown'}
- Target Location: ${userRequirement.target_location ?? 'Unknown'}
- Target Audience: ${userRequirement.target_audience ?? 'Unknown'}
- Primary Offering: ${userRequirement.primary_offering ?? 'Unknown'}
- USP: ${userRequirement.USP ?? 'Unknown'}

**Output Format**:
Return a valid **JSON array** of exactly 5 competitors, ordered by prominence (most famous first). Each must contain:

- "name": Company name (e.g., "Nike")
- "website_url": Homepage URL (e.g., "https://www.nike.com")
- "industry": Specific industry (e.g., "Athletic Apparel")
- "primary_offering": Main product/service (e.g., "Sportswear and footwear")
- "usp": Unique selling proposition (e.g., "High-performance athletic gear worn by top athletes")
- "logo_url": Favicon or logo URL (e.g., "https://www.nike.com/favicon.ico")

Do **not** wrap the JSON in markdown code blocks.
If no valid competitors are found, return an empty array: [].

---

**Example Output for Apple Inc.**:
[
  {
    "name": "Samsung",
    "website_url": "https://www.samsung.com",
    "industry": "Consumer Electronics",
    "primary_offering": "Smartphones, tablets, and electronics",
    "usp": "Innovative Android devices with diverse price points",
  },
  {
    "name": "Google",
    "website_url": "https://store.google.com",
    "industry": "Consumer Electronics",
    "primary_offering": "Pixel phones and smart devices",
    "usp": "Android-powered devices with Google ecosystem integration",
  },
  {
    "name": "Microsoft",
    "website_url": "https://www.microsoft.com",
    "industry": "Technology",
    "primary_offering": "Surface laptops and tablets",
    "usp": "Productivity-focused devices for business and personal use",
  
  },
  {
    "name": "Dell",
    "website_url": "https://www.dell.com",
    "industry": "Computer Hardware",
    "primary_offering": "Laptops and desktops",
    "usp": "Customizable PCs for personal and business users",
  },
  {
    "name": "Lenovo",
    "website_url": "https://www.lenovo.com",
    "industry": "Computer Hardware",
    "primary_offering": "Laptops, desktops, tablets",
    "usp": "Wide range of devices with competitive pricing",
  }
]

---

Please generate competitors now based on the actual website and metadata provided above.
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 2000,
    });

    const output = response.choices[0]?.message?.content?.trim();
    if (!output) {
      console.warn(`LLM returned empty response for website_id: ${site.website_id}`);
      return '[]';
    }

    let fixedOutput = output
      .replace(/```json\n|\n```|```/g, '')
      .replace(/,\s*([\]}])/g, '$1')
      .trim();

    if (!fixedOutput.startsWith('[') || !fixedOutput.endsWith(']')) {
      fixedOutput = `[${fixedOutput}]`;
    }

    let competitors: any[];
    try {
      competitors = JSON.parse(fixedOutput);
    } catch (parseErr) {
      const errMsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      console.error(`LLM returned invalid JSON for website_id: ${site.website_id}: ${errMsg}`);
      console.error(`Raw output: ${output}`);
      return '[]';
    }

    const validCompetitors = competitors.filter(comp =>
      comp.name &&
      comp.website_url &&
      comp.website_url.startsWith('http') &&
      !existingUrls.includes(comp.website_url) &&
      !existingNames.includes(comp.name)
    );

    return JSON.stringify(validCompetitors.slice(0, competitorsToGenerate));
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

Return a JSON object like:
{
  "name": "Business Name",
  "industry": "Relevant industry",
  "region": "Region of operation",
  "target_audience": "Target audience",
  "primary_offering": "Primary product/service",
  "usp": "Unique Selling Proposition"
}
If data is insufficient, return null without wrapping in code blocks or backticks.
`;

  try {
    const res = await openai.responses.create({ model: 'gpt-4o', input: prompt });
    let output = res.output_text.trim();
    
    // Remove markdown code blocks and backticks
    output = output.replace(/```json\n|\n```|```/g, '').trim();
    
    // Parse the cleaned output
    return output && output !== 'null' ? JSON.parse(output) : null;
  } catch (err) {
    console.error(`LLM parse error for ${scrapedData.website_url}: ${err instanceof Error ? err.message : err}`);
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


//     function safeParse(jsonStr: any) {
//   try {
//     return typeof jsonStr === "string" ? JSON.parse(jsonStr) : jsonStr;
//   } catch (e) {
//     console.error("JSON parse failed:", e);
//     return jsonStr; // fallback to raw string
//   }
// }



return `
You are a digital strategy expert tasked with analyzing a website’s performance, SEO, and accessibility metrics compared to industry competitors. Your goal is to identify( as many as you can)  high-impact, and cross-functional recommendations* that a moderately technical client can execute. Each recommendation must reference a *specific competitor* that performs better in that area and explain how the client can match or outperform them.

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



