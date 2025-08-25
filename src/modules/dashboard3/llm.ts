
import OpenAI from 'openai';
import 'dotenv/config';

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export const openai = new OpenAI({
     apiKey: process.env.OPENAI_API_KEY
});

export async function fetchCompetitorsFromLLM(

  scrapedMain: any,
  userRequirement: any,
  existingUrls: string[] = [],
  existingNames: string[] = []
): Promise<string>




 {
//   const prompt = `
// You are an expert market research assistant specializing in competitor analysis. Your task is to identify **a maximum of 6 unique, direct competitors** for the given main website. These competitors must operate in the **same market, offer similar services, and target similar business sizes and niches**.

// ---

// ### STRICT Selection Rules:

// 1. Competitors MUST:
//    - Be in the **same industry** and offer services similar to the main website.
//    - Target a similar audience: ${userRequirement.target_audience}.
//    - Have an **active presence or serve clients in ${userRequirement.target_location}**.

// 2. Evidence of regional presence MUST be clear on their website. Acceptable proofs include:
//    - Physical office address in ${userRequirement.target_location}.
//    - Contact page with local phone numbers.
//    - Client case studies/testimonials from ${userRequirement.target_location}.
//    - Service descriptions explicitly mentioning ${userRequirement.target_location}.

// 3. If NO evidence of regional presence → EXCLUDE the competitor (even if global).

// 4. If fewer than 3 local/regional competitors exist, then:
//    - Include global agencies ONLY if their website clearly states they serve clients in ${userRequirement.target_location} or have a branch there.

// 5. Exclude any companies already listed in:
//    - URLs: ${existingUrls.join(', ') || 'none'}
//    - Names: ${existingNames.join(', ') || 'none'}

// 6. Only include **real, active, well-known businesses with websites returning HTTP 200**.

// ---

// ### Ranking Logic:
// - Rank from **most established and recognized in ${userRequirement.target_location}** to least.

// ---

// ### Output Fields for Each Competitor:
// - "name": Official company name
// - "website_url": Homepage URL
// - "industry": Broad industry classification
// - "primary_offering": Main service offering relevant to the main website’s business
// - "usp": Unique selling point or differentiator (short)
// - "regional_presence_proof": Exact text/evidence from their site showing presence in ${userRequirement.target_location}

// ---

// **Main Website Info**:
// - URL: ${scrapedMain.website_url ?? 'Unknown'}
// - Title: ${scrapedMain.page_title ?? 'Unknown'}
// - Meta Description: ${scrapedMain.meta_description ?? 'Unknown'}
// - Meta Keywords: ${scrapedMain.meta_keywords ?? 'Unknown'}

// ---

// ### Output Format:
// Return as a valid **JSON array of up to 6 objects**, ordered by prominence (most relevant and established first). 
// Do NOT include explanations, text, or markdown. No extra commentary.

// ---

// **Example Output**:
// [
//   {
//     "name": "Prism Digital",
//     "website_url": "https://example.com",
//     "industry": "Digital Marketing",
//     "primary_offering": "SEO, PPC, and content marketing for SMEs and B2B clients",
//     "usp": "Full-service digital marketing with bilingual capability",
//     "regional_presence_proof": "Contact page lists Dubai office address"
//   },
//   {
//     "name": "Synergy Advertising",
//     "website_url": "https://www.example.com",
//     "industry": "Advertising and Digital Marketing",
//     "primary_offering": "Integrated marketing campaigns for brands and startups",
//     "usp": "Strong PR integration and brand storytelling",
//     "regional_presence_proof": "Case studies highlight Pakistani clients"
//   }
// ]


// ---


// Return the result strictly as raw JSON. Do **not** wrap it in code blocks or markdown. Do **not** explain anything. Just output the JSON object.
// `;

const prompt =`You are an expert market research assistant specializing in competitor analysis. Your task is to identify *a maximum of 6 unique, direct competitors* for the given main website. These competitors must operate in the *same market, offer similar services, and target similar business sizes and niches*.

---

### INPUT DATA:
- *User Inputs*:
   - Target Location: ${userRequirement.target_location}
   - Target Audience: ${userRequirement.target_audience}
   - Claimed Industry: ${userRequirement.industry}
   -  primary offering ${userRequirement.brand_offering}


- *Scraped Website Data*:
   - URL: ${scrapedMain.website_url ?? 'Unknown'}
   - Meta Title: ${scrapedMain.page_title ?? 'Not available'}
   - Meta Description: ${scrapedMain.meta_description ?? 'Not available'}
   - Meta Keywords: ${scrapedMain.meta_keywords ?? 'Not available'}
   - Primary H1: ${scrapedMain.h1 ?? 'Not available'}

---

### BALANCING RULE:
- If user input about industry or niche seems *vague or inconsistent*, use scraped meta data and H1 to infer or validate the industry and services.
- When determining competitors:
   - Prioritize *scraped website info first*, then use user input as secondary context.
   - If both are available and aligned, proceed as usual.
   - If there is conflict, assume scraped data is more reliable.

---

### STRICT SELECTION RULES:
1. Competitors MUST:
   - Be in the same industry and offer services similar to the main website (validated using both user input and scraped meta/H1 data).
   - Target a similar audience: ${userRequirement.target_audience} (or inferred audience from scraped description).
   - Have an active presence or serve clients in ${userRequirement.target_location}.

2. Evidence of regional presence MUST be clear on their website. Acceptable proofs include:
   - Physical office address in ${userRequirement.target_location}.
   - Contact page with local phone numbers.
   - Client case studies/testimonials from ${userRequirement.target_location}.
   - Service descriptions explicitly mentioning ${userRequirement.target_location}.

3. If NO evidence of regional presence → EXCLUDE the competitor (even if global).

4. If fewer than 3 local/regional competitors exist, include global agencies ONLY if their site clearly states they serve ${userRequirement.target_location}.

5. Exclude any companies already listed in:
   - URLs: ${existingUrls.join(', ') || 'none'}
   - Names: ${existingNames.join(', ') || 'none'}

6. Only include real, active, well-known businesses with websites returning HTTP 200.

---

### RANKING LOGIC:
- Rank from *most established and recognized in ${userRequirement.target_location}* to least.

---

### OUTPUT FIELDS FOR EACH COMPETITOR:
- "name": Official company name
- "website_url": Homepage URL
- "industry": Broad industry classification (validated against scraped + user input)
- "primary_offering": Main service offering relevant to the main website’s business
- "usp": Unique selling point or differentiator (short)
- "regional_presence_proof": Exact text/evidence from their site showing presence in ${userRequirement.target_location}

---

### OUTPUT FORMAT:
Return as a valid *JSON array of up to 6 objects*, ordered by prominence (most relevant and established first). 
Do NOT include explanations, text, or markdown.

---

### Example Output:
[
  {
    "name": "Prism Digital",
    "website_url": "https://www.prism-me.com",
    "industry": "Digital Marketing",
    "primary_offering": "SEO, PPC, and content marketing for SMEs and B2B clients",
    "usp": "Full-service digital marketing with bilingual capability",
    "regional_presence_proof": "Contact page lists Dubai office address"
  },
  {
    "name": "Synergy Advertising",
    "website_url": "https://www.synergyadvertising.com.pk",
    "industry": "Advertising and Digital Marketing",
    "primary_offering": "Integrated marketing campaigns for brands and startups",
    "usp": "Strong PR integration and brand storytelling",
    "regional_presence_proof": "Case studies highlight Pakistani clients"
  }
]'`

// const prompt = `Role: Expert market research assistant for competitor discovery.

// Objective:
// Identify up to six (6) *in-region* competitors for the Main Website. "In-region" means headquartered in, physically operating in, or explicitly serving customers in *${userRequirement.target_location || 'the specified location'}* (ISO country code: ${userRequirement.target_country_code || 'N/A'})—*not* generic global brands with no regional presence.

// Selection policy (apply in order):
// 1) *Local/Regional First* — Prefer competitors that clearly operate in ${userRequirement.target_location || 'the region'} and serve ${userRequirement.target_audience || 'the same audience'}.
// 2) *Global Only If Locally Active* — Include a global brand *only* if you find explicit evidence that it operates in or ships/services to ${userRequirement.target_location || 'the region'} (e.g., local office/store page, service areas page, country selector set to ${userRequirement.target_country_code || 'the country'}, local currency checkout, localized legal pages, local phone/address, verified Google Business Profile).
// 3) *Exclusions* — Exclude the Main Website, its sub-brands, directories/aggregators unless they directly compete, and anything already in:
//    • URLs: ${Array.isArray(existingUrls) && existingUrls.length ? existingUrls.join(', ') : 'none'}
//    • Names: ${Array.isArray(existingNames) && existingNames.length ? existingNames.join(', ') : 'none'}

// Hard constraints (must all hold):
// - Real, active, well-known businesses in the *same industry* as the Main Website, with an operational homepage expected to return HTTP 200 (https preferred).
// - *In-region presence is mandatory* for inclusion. If in doubt, *exclude*.
// - No duplicates by name or domain (case-insensitive; normalize domains by removing leading "www." before comparing).
// - If fewer than six valid in-region competitors exist, return only those. Do *not* fabricate.

// Evidence to consider for in-region validation (cite in output):
// - A local address/branches page or footer address for ${userRequirement.target_location || 'the region'} (e.g., "Contact/Stores/Locations").
// - Country or region-specific site/ccTLD (e.g., .pk), locale subpath/subdomain (e.g., /pk/, pk.example.com), or a country selector where ${userRequirement.target_country_code || 'the country code'} is available.
// - Local currency (e.g., PKR), local language content, region-specific legal/policy pages, support phone numbers with local dialing code.
// - Google Business Profile (if applicable), or reputable directory profile explicitly tied to the region.

// Main Website context:
// - URL: ${scrapedMain?.website_url ?? 'Unknown'}
// - Title: ${scrapedMain?.page_title ?? 'Unknown'}
// - Meta description: ${scrapedMain?.meta_description ?? 'Unknown'}
// - Meta keywords: ${scrapedMain?.meta_keywords ?? 'Unknown'}

// Output format (strict JSON only; no markdown, no explanations):
// Return a JSON *array* (max 6) ordered by prominence (most renowned first). Each object MUST be exactly:

// {
//   "name": "Brand name",
//   "website_url": "https://example.com",
//   "industry": "Concise industry label",
//   "primary_offering": "One-line description of what they sell/do",
//   "usp": "Strongest differentiator in this region",
//   "region_scope": "${userRequirement.target_location || 'Region'}",
//   "operates_in_region": true,
//   "presence_evidence": [
//     "Brief bullet(s) of concrete, verifiable evidence of local presence (e.g., 'Stores in Lahore – /stores', 'PK country selector', 'PKR pricing', 'Google Business Profile: <brand name>')"
//   ]
// }

// Rules:
// - Only include entries with "operates_in_region": true and at least one item in "presence_evidence".
// - Use absolute homepage URLs with scheme (https:// preferred).
// - Use *valid JSON*: double quotes, no comments, no trailing commas.
// - If no suitable competitors are found, output [].
// `;








console.log("prompt",prompt)
 
    try {
    const response = await openai.responses.create({
      model: "gpt-4.1",
      input: prompt,
      tools: [
        {
          type: 'web_search_preview',
          search_context_size: 'high',
         
          user_location: {
            type: 'approximate',
            region: userRequirement.target_location  || 'Unknown',
          },
        },
        
      ],
    });
    const output = response.output_text?.trim();

    if (!output) {
      console.warn(`LLM returned empty response`);
      return '[]';
    }
    console.log(`LLM response generated:`, output);
    


      
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
      console.error(`LLM returned invalid JSON for website_id: ${scrapedMain.website_id}: ${errMsg}`);
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

    return JSON.stringify(validCompetitors.slice(0,6));
  } catch (err: any) {
    console.error(`Error fetching competitors from LLM for website_id: ${scrapedMain.website_id}: ${err.message}`);
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

export async function createComparisonPrompt(report_id: string,) {
 


const competitor_data = await prisma.report.findUnique({
      where: { report_id },
      select: {
        
        dashboard3_data: true,
      
      },
    });


 return `
You are a digital strategy expert tasked with analyzing a website’s performance, SEO, and content strategy compared to industry competitors. Your goal is to generate a list of **high-impact, cross-functional recommendations**, each tied to a clear technical or marketing deficiency. The client is moderately technical and expects **actionable insights**, ideally supported by competitor benchmarks. If no competitor data is available, use best-practice standards.

### Input Data
- ${competitor_data?.dashboard3_data || 'No competitor comparison data available.'}
Note if website REVENUE LOSS IS IN NEGATVE it means that it is good and all the website keypoints  (lcp/fcp etc) are better than the threshold value.
If seo revenue loss is zero its good , and if its positive it means it is bad 
### Task
Generate a JSON object with a single key, "recommendations", which is an array of recommendation objects.

Each object must contain:
- **tag**: One of the following tags:
  - 'Content and Keyword Gap'  
    (Use metrics like 'Length of meta description', 'Presence of tags', 'Missing keywords', or vague messaging)
  - 'SEO and Website Revenue Loss'  
    (Tie search ranking issues to traffic/conversion loss. Use bounce rate, click-through rate, high-exit pages, etc.)
  - 'Big Idea'  
    (Evaluate clarity and strength of homepage messaging vs competitors. Does the site clearly differentiate itself?)
  - 'Performance Comparison'  
    (Use metrics like Core Web Vitals, Largest Contentful Paint, Accessibility, Mobile Experience, etc.)
- **how_to_close_the_gap**: A detailed plan (5-6 sentences) that includes:
  - Which **competitor** is performing better and **how**
  - A **technical or strategic fix**
  - A **measurable goal or threshold**
  - A **manual validation step** using browser tools (e.g., incognito load time, keyboard navigation)
  - The **business impact** of closing this gap (e.g., more traffic, better UX, higher conversions)

### Notes:
- The following 4 tags are **mandatory** but not limited and must be included **exactly once** each in the final JSON array. Each tag should have its own unique, non-overlapping recommendation:
- If other meaningful gaps are identified based on the input data, you may include additional recommendations with **new, unique tags** that reflect those issues. However, the 4 tags above are **required** and must appear in the output exactly once, each addressing a distinct gap.
- Mention the **best-performing competitor** when available. If not, fallback to industry best practices (e.g., LCP < 2.5s, meta description ≤ 160 characters, alt text on all homepage images).
- Do **not** mention external tools or APIs (e.g., Lighthouse, Google Search Console).
- Be specific: avoid vague language like “improve SEO” or “enhance user experience.”
- Use **simple definitions** for any technical terms introduced (e.g., “LCP measures how long the largest visible content takes to load”).

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
`;


// return `
// You are a digital strategy expert tasked with analyzing a website’s performance, SEO, and accessibility metrics compared to industry competitors. Your goal is to identify( as many as you can)  high-impact, and cross-functional recommendations* that a moderately technical client can execute. Each recommendation must reference a *specific competitor* that performs better in that area and explain how the client can match or outperform them.

// ### Input Data
// - ${(analysisStatus && analysisStatus.competitor_details) ? analysisStatus.competitor_details : 'No competitor comparison data available.'}

// ### Task
// Generate a JSON response with a single key, "recommendations", containing an array of objects. Each object should identify one underperforming area of the main website, using **competitor benchmarks** or **industry best practices** (e.g., Core Web Vitals, accessibility standards).

// For each recommendation:
// - **tag**: The exact field name from the data (e.g., website_audit.website_health_matrix.largest_contentful_paint).
// - **how_to_close_the_gap**: A specific and actionable plan (3–5 sentences) that includes:
//   - The competitor performing better (e.g., “LegalZoom’s LCP is 1.2s compared to 3.8s on your site”).
//   - Technical recommendation (e.g., “compress hero images to <100KB using WebP”).
//   - Measurable goal (e.g., “reduce LCP to under 1.2s”).
//   - Validation step using only built-in browser features (e.g., “open your site in a private browser window and observe image load timing or layout shifts”).
//   - Business impact (e.g., “Improves page speed, reducing bounce rates and boosting conversions”).

// ### Additional Instructions:
// - Use cross-functional reasoning where applicable (e.g., how performance + accessibility + SEO affect conversions).
// - If multiple competitors outperform the site, mention the best-performing one as the benchmark.
// - If competitor data is missing, use industry standards (e.g., LCP < 2.5s, CLS < 0.1, Accessibility Score > 90).
// - Avoid vague language like “enhance UX” or “improve SEO.”
// - Briefly define any technical terms you use (e.g., “CLS, or Cumulative Layout Shift, measures visual stability”).
// - **Do NOT mention any external APIs, platforms, or tools** (e.g., Lighthouse, PageSpeed Insights, Axe, Google Search Console).
// - Ensure suggestions are practical and executable by a small dev/design team.

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
//       "how_to_close_the_gap": "LegalZoom achieves a Largest Contentful Paint (LCP) of 1.2s, while your site loads the main content in 3.6s. To close this gap, compress above-the-fold images to under 100KB using WebP format and defer any non-essential JavaScript that delays rendering. Aim to reduce LCP to under 1.5s. Check this by loading the page in a private browser window and observing when the main visual content appears. A lower LCP improves perceived load time, keeping users engaged and improving conversions."
//     },
//     {
//       "tag": "website_audit.performance_insight.accessibility",
//       "how_to_close_the_gap": "Rocket Lawyer has an accessibility score of 98, while your site currently sits at 82. Improve this by labeling all form fields with ARIA tags, ensuring all buttons can be operated by keyboard, and using colors with high contrast ratios (at least 4.5:1 for body text). Try navigating the site using only a keyboard to verify no critical elements are missed. Accessibility boosts your SEO ranking and ensures a wider range of users can engage with your site, including those with disabilities."
//     },
//     {
//       "tag": "seo_audit.meta_title",
//       "how_to_close_the_gap": "Your meta title is currently 72 characters long and appears truncated in search results, while Rocket Lawyer keeps titles under 60 characters and includes phrases like 'Affordable Legal Help Online'. Rewrite your title to fit within 50–60 characters, use primary keywords at the front (e.g., 'Instant Legal Help'), and end with your brand name. To validate, hover over the browser tab and confirm that the full title is visible. A shorter, keyword-focused title increases click-through rates and search visibility."
//     }
//   ]
// }
// `;


}