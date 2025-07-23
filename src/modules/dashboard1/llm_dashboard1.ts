import { PrismaClient } from "@prisma/client";
import { OpenAI } from "openai";
import * as cheerio from "cheerio";

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = process.env.OPENAI_MODEL || "gpt-4.1";


const prompt_web_and_seo = `
You are a **senior technical SEO and web performance expert**.

Your task:
Based on the structured input JSON (audit metrics and metadata), return a valid JSON object that performs:

1. Classification into top-level categories:
   - \`web_audit\`
   - \`seo_audit\`

2. Subclassification into predefined subcategories.

3. Separation into:
   - \`whats_working\`: rating 7–10
   - \`what_needs_fixing\`: rating 1–6


---

## Subcategories

 \`web_audit\`:
- "Site Speed & Core Web Vitals"
- "Mobile Experience"
- "Lead Capture Optimization"
- "Homepage Clarity"

 \`seo_audit\`:
- "Meta Tags & Schema Fixes"
- "Keyword Gaps & Lost Rankings"
- "Content Gap Suggestions"
- "Traffic & Audience Analysis"

 Include **all subcategories**, even if their arrays are empty.

---

## Rating Rules

| Score | Meaning               | Classification       |
|-------|------------------------|----------------------|
| 9–10  | Excellent / Strong     | whats_working        |
| 7–8   | Good / Adequate        | whats_working        |
| 5–6   | Borderline / Fixable   | what_needs_fixing    |
| 3–4   | Poor                   | what_needs_fixing    |
| 1–2   | Broken / Missing       | what_needs_fixing    |

Avoid 5–6 unless a clear, actionable fix is provided.

---

## Output JSON Format

\`\`\`json
{
  "whats_working": {
    "web_audit": {
      "Lead Capture Optimization": [
        {
          "tag": "bounce_rate",
          "rating": 9,
          "explanation_reason": "Bounce rate is below 0.4, indicating strong engagement and effective lead capture. This reduces ad waste, increases lead quality, and signals high content relevance, improving SEO rankings and conversion rates."
        }
      ],
      ...
    },
    "seo_audit": {
      ...
    }
  },
  "what_needs_fixing": {
    "web_audit": {
      "Lead Capture Optimization": [
        {
          "tag": "bounce_rate",
          "rating": 2,
          "explanation_reason": "Bounce rate is above 0.7, signaling poor user engagement and weak lead funnel effectiveness. This negatively impacts marketing ROI, increases acquisition costs, and can lower SEO ranking due to high pogo-sticking behavior."
        }
      ],
      ...
    },
    "seo_audit": {
      ...
    }
  }
  
}
\`\`\`

Recommendations must link the issue to measurable SEO or marketing improvements (rankings, clicks, conversions),
and include suggestions for H1, meta tags, or keyword relevance where mismatches are found.
 Each tag in recommendations **must exactly match** a tag in \`what_needs_fixing\`.

---

## Evaluation Criteria

### Site Speed & Core Web Vitals
- LCP: <2.5s = 10, 2.5–4s = 5, >4s = 1, missing = 3  
- CLS: <0.1 = 10, 0.1–0.25 = 5, >0.25 = 1, missing = 3  
- FCP: <1.8s = 10, 1.8–3s = 5, >3s = 1, missing = 3  
- TTI: <3.8s = 10, 3.8–7.8s = 5, >7.8s = 1, missing = 3  
- TBT: <200ms = 10, 200–500ms = 5, >500ms = 1, missing = 3  
- Scores (performance, SEO, accessibility, best-practices): >90 = 10, 50–89 = 5, <50 = 1, missing = 3  

### Mobile Experience
- Is the site mobile-friendly?
Why it matters: Mobile-first indexing is Google’s default.
A poor mobile experience drives drop-off in ad traffic and weakens engagement from most organic users. It also leads to inflated bounce rates and poor session depth


### Lead Capture Optimization
- Bounce rate <0.4 = 10  
- Bounce rate 0.4–0.7 = 5  
- Bounce rate >0.7 = 1  
- High bounce reduces conversions, wastes paid ad spend, harms engagement  
- Low bounce increases session depth, trust, and search engine confidence

### Homepage Clarity
- meta tags/ present  
- heading hierarchy clear
- homepage alt text coverage
- Good structure increases user trust, reduces bounce rate, and improves SEO
- Link Integrity Issues: Broken or outdated links on the homepage damage user trust, disrupt navigation,
 and signal poor maintenance to search engines. This can reduce crawl efficiency and contribute to SEO ranking losses.  


### Meta Tags & Schema Fixes
- Title: <60 chars & keyword-rich = 10, 60–70 = 7, >70 = 3, missing = 1  
- Description: 150–160 chars & compelling = 10, 120–149 or >160 = 5–7, <120 = 3, missing = 1  
- H1: Unique = 8, generic/duplicate = 4, missing = 1  
- Schema: Valid JSON-LD = 10, invalid = 1, missing = 0  
- OG tags: all present = 10, partial = 5, missing = 3  


### Content Gap Suggestions
- Title covers high-intent keyword?  
- Description includes keyword + CTA?  
- H1 distinct from title, matches user search intent?  
- Meta tags consistent with page content? 
- 

### Traffic & Audience Analysis
- Total visitors, unique visitors, engagement rate  
- Top traffic sources, devices, country share  
- High engagement = strong content/audience fit  
- Low traffic = content misalignment, technical issue, weak outreach  

---

🛑 Avoid:
- Vague terms ("might help", "could improve")
- External tools (Lighthouse, SEMrush, etc.)
- Inferences not based on the provided input

Respond with **strictly valid JSON**, no prose or commentary.
`;


type AuditItem = {
  tag: string;
  explanation_reason: string;
  rating: number;
};

type RecommendationItem = {
  tag: string;
  recommendation: string;
};

type NormalizedAuditOutput = {
  whats_working: {
    web_audit: Record<string, AuditItem[]>;
    seo_audit: Record<string, AuditItem[]>;
  };
  what_needs_fixing: {
    web_audit: Record<string, AuditItem[]>;
    seo_audit: Record<string, AuditItem[]>;
  };
  recommendations: {
    web_audit: Record<string, RecommendationItem[]>;
    seo_audit: Record<string, RecommendationItem[]>;
  };
};

type AuditEntry = {
  tag: string;
  explanation_reason: string;
  rating: number;
};

type RecommendationEntry = {
  tag: string;
  recommendation: string;
};

type AuditType = "web_audit" | "seo_audit";
type AuditGroup = "whats_working" | "what_needs_fixing";


const normalizeAuditOutput = (raw: any): NormalizedAuditOutput => {
  const clampRating = (val: any, fallback: number) => {
    const num = Number(val);
    return isNaN(num) ? fallback : Math.min(10, Math.max(1, num));
  };

  const normalizeAuditGroup = (
    input: any,
    fallbackRating: number
  ): Record<AuditType, Record<string, AuditEntry[]>> => {
    const result = { web_audit: {}, seo_audit: {} } as Record<AuditType, Record<string, AuditEntry[]>>;

    for (const type of ["web_audit", "seo_audit"] as AuditType[]) {
      const section = input?.[type];
      if (!section || typeof section !== "object") continue;

      for (const [subcategory, entries] of Object.entries(section)) {
        if (!Array.isArray(entries)) continue;

        result[type][subcategory] = entries.map((item) => ({
          tag: item.tag || item.title || "untitled",
          explanation_reason:
            typeof item.explanation_reason === "string"
              ? item.explanation_reason.trim()
              : JSON.stringify(item.explanation_reason),
          rating: clampRating(item.rating, fallbackRating),
        }));
      }
    }

    return result;
  };
  
  const normalizeRecommendations = (input: any): Record<AuditType, Record<string, RecommendationEntry[]>> => {
    const result = { web_audit: {}, seo_audit: {} } as Record<AuditType, Record<string, RecommendationEntry[]>>;

    for (const type of ["web_audit", "seo_audit"] as AuditType[]) {
      const section = input?.[type];
      if (!section || typeof section !== "object") continue;

      for (const [subcategory, entries] of Object.entries(section)) {
        if (!Array.isArray(entries)) continue;

        result[type][subcategory] = entries.map((item) => ({
          tag: item.tag || "untitled",
          recommendation:
            typeof item.recommendation === "string"
              ? item.recommendation.trim()
              : JSON.stringify(item.recommendation),
        }));
      }
    }

    return result;
  };

  return {
    whats_working: normalizeAuditGroup(raw?.whats_working, 8),
    what_needs_fixing: normalizeAuditGroup(raw?.what_needs_fixing, 3),
    recommendations: normalizeRecommendations(raw?.recommendations),
  };
};


const funnelRecommendationPrompt = `
You are a senior growth strategist and website optimization expert.

Your job is to evaluate a website's traffic, speed, content clarity, and user engagement. Based on your analysis, return a **friendly, insightful, and strategic set of recommendations**—structured as a JSON object—organized by each stage of the marketing funnel.

The JSON must include **three funnel stages**:
1. 'top_of_funnel' – "Are you discoverable?" (Focus: Visibility + Speed)
2. 'mid_funnel' – "Are you clear and convincing?" (Focus: On-site Experience + Message Clarity)
3. 'bottom_of_funnel' – "Are you converting and retaining?" (Focus: Engagement + Funnel Diagnostics)

Each funnel stage should include:
- 'focus': A short sentence describing what this funnel stage is trying to improve
- 'categories': Key topics for that stage (e.g., SEO, CRO, mobile UX)
- 'recommendations': For each category, give 2–5 friendly and helpful tips or ideas to improve performance
- 'sample_insight': (Optional) A short, human-friendly insight based on real or assumed performance issues (like slow mobile speed, low engagement, or poor messaging)

Speak like you're advising a founder or marketing team. Be direct but supportive—focus on what’s working, what’s missing, and how to improve.

Output the result as a valid JSON object. Here's the structure:

\`\`\`json
{
  "top_of_funnel": {
    "focus": "Help users find and access your website faster",
    "categories": {
      "Search Discoverability": [
        "Add or improve meta titles and descriptions so pages show up better in search results",
        "Make sure every page has a unique H1 that matches what it's about",
        "Add schema markup to help AI tools and search engines better understand your content"
      ],
      "Site Speed & Accessibility": [
        "Compress large images and limit unnecessary JavaScript to improve load times (LCP, FID, CLS)",
        "Check mobile layout for touch-friendliness and fast interactivity",
        "Include a proper viewport tag for responsive behavior"
      ],
      "Link Sharing (OG Tags)": [
        "Update OpenGraph text and images for better link previews on social media"
      ]
    },
    "sample_insight": "Your homepage takes 6.4 seconds to load on mobile — that’s likely driving users away. Speeding it up can increase both traffic and search visibility."
  },
  "mid_funnel": {
    "focus": "Help visitors quickly understand what you do and why it matters",
    "categories": {
      "Messaging & Content Clarity": [
        "Add a short, punchy one-liner that clearly says what your product does",
        "Structure your H1/H2s for better readability and quick scanning",
        "Balance text and visuals to keep the page from feeling too dense or too empty"
      ],
      "Conversion Optimization": [
        "Place a CTA (like 'Start Free Trial') above the fold to capture intent early",
        "Use whitespace and contrast to guide attention toward your offer",
        "Add trust indicators like testimonials, security badges, or usage stats"
      ]
    },
    "sample_insight": "Your homepage doesn’t mention what you do until after the third scroll. Adding a clear headline and CTA at the top can reduce bounce and boost conversions."
  },
  "bottom_of_funnel": {
    "focus": "Diagnose why users drop off and how to retain them better",
    "categories": {
      "Behavior & Funnel Analysis": [
        "Look at bounce rate and exit pages to find friction points",
        "Compare new vs returning visitors to see if you're building loyalty",
        "Check session length and scroll depth to assess engagement quality",
        "Break down mobile vs desktop usage to spot performance gaps"
      ],
      "Retention & Re-engagement": [
        "Use sticky CTAs or persistent navigation to keep users on the path",
        "Test exit-intent popups or reminder nudges for hesitant visitors",
        "Consider retargeting or personalized content to bring back drop-offs"
      ]
    },
    "sample_insight": "Only 15% of your users scroll past the first section. You may need stronger visual direction and persistent CTAs to guide them down the page."
  }
}
\`\`\`

Return only the JSON, no explanations.
`




export const generateLLMTrafficReport = async (website_id: string, user_id: string) => {
  if (!website_id || !user_id) {
    return Response.json({ error: "Missing website_id or user_id" }, { status: 400 });
  } else {
    console.log("Report generation started for website_id:", website_id);
  }

  try {
   

   
    const [scraped, analysis, traffic, llm_Response,analysis_status] = await Promise.all([
      prisma.website_scraped_data.findUnique({ where: { website_id } }),
      prisma.brand_website_analysis.findFirst({
        where: { website_id },
        orderBy: { created_at: "desc" },
      }),
         prisma.brand_traffic_analysis.findFirst({
            where: { website_id },
            orderBy: { created_at: "desc" },
          }),
        
         prisma.llm_responses.findFirst({
            where: { website_id },
            orderBy: { created_at: "desc" },
            select: {
              geo_llm: true,
            },
          }),

        prisma.analysis_status.findFirst({
            where: { website_id },
            orderBy: { created_at: "desc" },
            select: {
              dashboard1: true,
            },
          })  
      
    ]);
    // console.log("website_audit",analysis)
    // Extract H1
    let h1Text = "Not Found";
    if (scraped?.raw_html) {
      const $ = cheerio.load(scraped.raw_html);
      h1Text = $("h1").first().text().trim() || "Not Found";
    }



    const allData: any = {
      Analytics: {
        revenue_loss_definition: `*Formula:*

1.  *Average Revenue Conversion Loss (Percentage):*
    RevenueLoss% = ((LCP - 2.5) × 7) + (((TBT - 200) / 100) × 3) + (CLS × 10)

*Assumptions and Metric Impacts:*

* *LCP (Largest Contentful Paint):*
    * *Threshold:* 2.5 seconds (s)
    * *Impact:* For every 1 second (s) that LCP exceeds 2.5s, there is an estimated 7% drop in conversions.
* *TBT (Total Blocking Time):*
    * *Threshold:* 200 milliseconds (ms)
    * *Impact:* For every 100 milliseconds (ms) that TBT exceeds 200ms, there is an estimated 3% drop in conversions.
* *CLS (Cumulative Layout Shift):*
    * *Threshold:* 0.1 units
    * *Impact:* For every 1.0 unit increase in CLS, there is an estimated 10% drop in conversions.

*Interpretation of Results:*

* *Positive RevenueLoss%:*
    * A positive result indicates a *projected revenue loss* due to the current performance metrics exceeding the defined thresholds. The higher the positive number, the greater the anticipated negative impact on conversion rates, and by extension, revenue.
* *Negative RevenueLoss%:*
    * A negative result indicates that the current performance metrics are *better than the defined thresholds*.
    * This suggests that these specific performance aspects are not contributing to conversion loss, and may even be positively impacting user experience, leading to potentially higher conversions. In essence, a negative value signifies a "good" or "optimal" performance state relative to these thresholds, indicating no estimated revenue loss from these factors. 
        Current value: ${analysis?.revenue_loss_percent ?? "N/A"}%`,
        ctr_loss_percent: scraped?.ctr_loss_percent ?? "N/A",
      },
      website_audit: {
        Site_Speedcore_Web_Vitals_and_mobile_Experience: analysis_status?.dashboard1 ?? "N/A",
  } ,
    }
    if (traffic) {
      allData.traffic = {
        avg_session_duration_in_seconds: traffic?.avg_session_duration ?? "N/A",
        engagement_rate: traffic?.engagement_rate ?? "N/A",
        engaged_sessions: traffic?.engaged_sessions ?? "N/A",
        total_visitors: traffic?.total_visitors ?? "N/A",
        unique_visitors: traffic?.unassigned ?? "N/A",
        new_vs_returning: traffic?.new_vs_returning ?? "N/A",
        top_countries: traffic?.top_countries ?? "N/A",
        top_devices: traffic?.top_devices ?? "N/A",
      };
      allData.Lead_Capture_Optimization =
       {bounce_rate: traffic?.overall_bounce_rate ?? "N/A",}

      allData.Homepage_Clarity_and_Meta_Tags_Schema_Fixes = {
        title: scraped?.page_title ?? "N/A",
        description: scraped?.meta_description ?? "N/A",
        heading_hierarchy: scraped?.headingAnalysis ?? "N/A",
        keywords: scraped?.meta_keywords ?? "N/A",
        h1: h1Text,
        og: {
          title: scraped?.og_title ?? "N/A",
          description: scraped?.og_description ?? "N/A",
          image: scraped?.og_image ? "Present" : "Missing",
        },
        homepage_alt_text_coverage: scraped?.homepage_alt_text_coverage ?? "N/A",
        schema: scraped?.schema_analysis ?? "None",

      };

      allData.Link_Integrity_Issues = {
        no_of_broken_links: analysis?.total_broken_links ?? "N/A",
        broken_links: analysis?.broken_links ?? "N/A",
      };

      allData.Content_Gap_Suggestions = {
        primary_keyword: scraped?.meta_keywords ?? "N/A",
        schema: scraped?.schema_analysis ?? "None",
        title: scraped?.page_title ?? "N/A",
        h1: h1Text,
        description: scraped?.meta_description ?? "N/A",
        AI_discovilibilty: llm_Response?.geo_llm ?? "None",
        appears_accross_bing: traffic?.top_sources ?? "N/A",
      };
    }


    
  
    console.log("Generating LLM response (what working , what needs to be fixed)...");
    const llmResponse = await openai.chat.completions.create({
      model: model,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: prompt_web_and_seo ,
        },
        { role: "user", content: JSON.stringify(allData) },
      ],
    });
    const llmContent = llmResponse.choices[0].message.content
      ? JSON.parse(llmResponse.choices[0].message.content)
      : { whats_working: {}, what_needs_fixing: {}, recommendations: {} };



    console.log("Generating LLM response (funnel recommendation)…");
const funnelLLMResponse = await openai.chat.completions.create({
  model: model,
  temperature: 0.5,
  response_format: { type: "json_object" },
  messages: [
    {
      role: "system",
      content: funnelRecommendationPrompt,
    },
    { role: "user", content: JSON.stringify(allData) },
  ],
});

const funnelRecommendations = funnelLLMResponse.choices[0].message.content
  ? JSON.parse(funnelLLMResponse.choices[0].message.content)
  : {
      top_of_funnel: {},
      mid_funnel: {},
      bottom_of_funnel: {},
    };
  
    // Validate recommendations
    // const validatedContent = validateRecommendations(llmContent);
    
    // Normalize output
    const combinedOutput = normalizeAuditOutput(llmContent);
    if (combinedOutput) {
      console.log("LLM response generated successfully:");
    }
    const fullLLMResponse = {
        audit_recommendations: combinedOutput,
        funnel_recommendations: funnelRecommendations,
      };
    // Save to database
    // console.log("Saving LLM response to database...");
    // await prisma.llm_responses.upsert({
    //   where: { website_id },
    //   update: {
    //     recommendation_by_mo_dashboard1: JSON.stringify(llmResponse),
    //   },
    //   create: {
    //     website_id,
    //     recommendation_by_mo_dashboard1: JSON.stringify(llmResponse),
    //   },
    // });
   
    await prisma.analysis_status.upsert({
      where: {
        user_id_website_id: {
          user_id,
          website_id,
        },
      },
      update: {
        recommendation_by_mo1: JSON.stringify(fullLLMResponse),
      },
      create: {
        user_id,
        website_id,
        recommendation_by_mo1: JSON.stringify(fullLLMResponse),
      },
    });
    console.log("LLM response saved successfully for website_id:", website_id);

    return { recommendation_by_mo_dashboard1: fullLLMResponse };
  } catch (err) {
    console.error("LLM Audit Error:", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
};

