
import OpenAI from 'openai';
import 'dotenv/config';
import {sanitizeAndStringify,} from "../../utils/clean_text"
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


 {const prompt =`You are an expert market research assistant specializing in competitor analysis. Your task is to identify *a maximum of 6 unique, direct competitors* for the given main website. These competitors must operate in the *same market, offer similar services, and target similar business sizes and niches*.

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

// console.log("prompt",prompt)
 
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
        dashboard3_socialmedia:true
      
      },
    });

  const mergedData = {
  dashboard3_data:competitor_data?.dashboard3_data || null,
  socialmedia: competitor_data?.dashboard3_socialmedia || null,
};

const clean_data =sanitizeAndStringify (mergedData);
// console.log("clean_data",clean_data)
 return `
You are a digital strategy expert tasked with analyzing a website’s performance, SEO, and content strategy compared to industry competitors. Your goal is to generate a list of **high-impact, cross-functional recommendations**, each tied to a clear technical or marketing deficiency. The client is moderately technical and expects **actionable insights**, ideally supported by competitor benchmarks. If no competitor data is available, use best-practice standards.

### Input Data
- ${clean_data || 'No competitor comparison data available.'}
Note if website REVENUE LOSS IS IN NEGATVE it means that it is good and all the website keypoints  (lcp/fcp etc) are better than the threshold value.
If seo revenue loss is zero its good , and if its positive it means it is bad 
### Task
Generate a JSON object with a single key, "recommendations", which is an array of recommendation objects.

Each object must contain:
- **tag**: One of the following tags:
  - 'Content and Keyword Gap '  
    (Use metrics like 'Length of meta description', 'Presence of tags', 'Missing keywords', or vague messaging)
  - 'SEO and Website Revenue Loss '  
    (Tie search ranking issues to traffic/conversion loss. Use bounce rate, click-through rate, high-exit pages, etc.)
  - 'Big Idea'  
    (Evaluate clarity and strength of homepage messaging vs competitors. Does the site clearly differentiate itself?)
  -  'Social Media Analysis'
    (what platforms competitors are using and what should main website use to improve our productivity, add a brief summary of evalution)
  - 'Paid Ads '  
    (Do competitor have paid ads? What types of ad can we use )
  - 'Emerging Channels '
    (Look at whether competitors are leveraging TikTok, podcasts, newsletters, or niche communities — and whether the brand should.)  
  - 'Performance Comparison '  
    (Use metrics like Core Web Vitals, Largest Contentful Paint, Accessibility, Mobile Experience, etc.)

    
- **how_to_close_the_gap**: A detailed plan (5-6 sentences) that includes:
  - Which **competitor** is performing better and **how**
  - A **technical or strategic fix**
  - A **measurable goal or threshold**
  - A **manual validation step** using browser tools (e.g., incognito load time, keyboard navigation)
  - The **business impact** of closing this gap (e.g., more traffic, better UX, higher conversions)

### Notes:
- The following 6 tags are **mandatory if data is available for each one ** but not limited and must be included **exactly once** each in the final JSON array. Each tag should have its own unique, non-overlapping recommendation:

- If other meaningful gaps are identified based on the input data, you may include additional recommendations with **new, unique tags** that reflect those issues. However, the include  6 tags(minimun) and must appear in the output exactly once, each addressing a distinct gap.
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



}