import { PrismaClient } from "@prisma/client";
import { OpenAI } from "openai";
import * as cheerio from "cheerio";

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = process.env.OPENAI_MODEL || "gpt-4.1";

type AuditType = "web_audit" | "seo_audit";

type AuditItem = {
  tag: string;
  explanation_reason: string;
  rating: number;
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

};

type AuditEntry = {
  tag: string;
  explanation_reason: string;
  rating: number;
};

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

    for (const [category, subcategories] of Object.entries(input || {})) {
      if (typeof subcategories !== "object") continue;

      // Auto-map category to audit type
      const type = category.toLowerCase().includes("seo") ? "seo_audit" : "web_audit";

      for (const [subcategory, entries] of Object.entries({ [category]: subcategories })) {
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



  return {
    whats_working: normalizeAuditGroup(raw?.whats_working, 8),
    what_needs_fixing: normalizeAuditGroup(raw?.what_needs_fixing, 3),
  };
};

export const generateLLMTrafficReport = async (website_id: string, user_id: string) => {
  if (!website_id || !user_id) {
    return Response.json({ error: "Missing website_id or user_id" }, { status: 400 });
  } else {
    console.log("Report generation started for website_id:", website_id);
  }

  try {



    const [scraped, analysis, traffic, llm_Response, analysis_status] = await Promise.all([
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

    let h1Text = "Not Found";
    if (scraped?.raw_html) {
      const $ = cheerio.load(scraped.raw_html);
      h1Text = $("h1").first().text().trim() || "Not Found";
    }



    //     const allData: any = {
    //       Analytics: {
    //         revenue_loss_definition: `*Formula:*

    // 1.  *Average Revenue Conversion Loss (Percentage):*
    //     RevenueLoss% = ((LCP - 2.5) × 7) + (((TBT - 200) / 100) × 3) + (CLS × 10)

    // *Assumptions and Metric Impacts:*

    // * *LCP (Largest Contentful Paint):*
    //     * *Threshold:* 2.5 seconds (s)
    //     * *Impact:* For every 1 second (s) that LCP exceeds 2.5s, there is an estimated 7% drop in conversions.
    // * *TBT (Total Blocking Time):*
    //     * *Threshold:* 200 milliseconds (ms)
    //     * *Impact:* For every 100 milliseconds (ms) that TBT exceeds 200ms, there is an estimated 3% drop in conversions.
    // * *CLS (Cumulative Layout Shift):*
    //     * *Threshold:* 0.1 units
    //     * *Impact:* For every 1.0 unit increase in CLS, there is an estimated 10% drop in conversions.

    // *Interpretation of Results:*

    // * *Positive RevenueLoss%:*
    //     * A positive result indicates a *projected revenue loss* due to the current performance metrics exceeding the defined thresholds. The higher the positive number, the greater the anticipated negative impact on conversion rates, and by extension, revenue.
    // * *Negative RevenueLoss%:*
    //     * A negative result indicates that the current performance metrics are *better than the defined thresholds*.
    //     * This suggests that these specific performance aspects are not contributing to conversion loss, and may even be positively impacting user experience, leading to potentially higher conversions. In essence, a negative value signifies a "good" or "optimal" performance state relative to these thresholds, indicating no estimated revenue loss from these factors. 
    //         Current value: ${analysis?.revenue_loss_percent ?? "N/A"}%`,
    //         ctr_loss_percent: scraped?.ctr_loss_percent ?? "N/A",
    //       },
    //       website_audit: {
    //         Site_Speedcore_Web_Vitals_and_mobile_Experience: analysis_status?.dashboard1 ?? "N/A",
    //   } ,
    //     }
    //     if (traffic) {
    //       allData.traffic = {
    //         avg_session_duration_in_seconds: traffic?.avg_session_duration ?? "N/A",
    //         engagement_rate: traffic?.engagement_rate ?? "N/A",
    //         engaged_sessions: traffic?.engaged_sessions ?? "N/A",
    //         total_visitors: traffic?.total_visitors ?? "N/A",
    //         unique_visitors: traffic?.unassigned ?? "N/A",
    //         new_vs_returning: traffic?.new_vs_returning ?? "N/A",
    //         top_countries: traffic?.top_countries ?? "N/A",
    //         top_devices: traffic?.top_devices ?? "N/A",
    //       };
    //       allData.Lead_Capture_Optimization =
    //        {bounce_rate: traffic?.overall_bounce_rate ?? "N/A",}

    //       allData.Homepage_Clarity_and_Meta_Tags_Schema_Fixes = {
    //         title: scraped?.page_title ?? "N/A",
    //         description: scraped?.meta_description ?? "N/A",
    //         heading_hierarchy: scraped?.headingAnalysis ?? "N/A",
    //         keywords: scraped?.meta_keywords ?? "N/A",
    //         h1: h1Text,
    //         og: {
    //           title: scraped?.og_title ?? "N/A",
    //           description: scraped?.og_description ?? "N/A",
    //           image: scraped?.og_image ? "Present" : "Missing",
    //         },
    //         homepage_alt_text_coverage: scraped?.homepage_alt_text_coverage ?? "N/A",
    //         schema: scraped?.schema_analysis ?? "None",

    //       };

    //       allData.Link_Integrity_Issues = {
    //         no_of_broken_links: analysis?.total_broken_links ?? "N/A",
    //         broken_links: analysis?.broken_links ?? "N/A",
    //       };

    //       allData.Content_Gap_Suggestions = {
    //         primary_keyword: scraped?.meta_keywords ?? "N/A",
    //         schema: scraped?.schema_analysis ?? "None",
    //         title: scraped?.page_title ?? "N/A",
    //         h1: h1Text,
    //         description: scraped?.meta_description ?? "N/A",
    //         AI_discovilibilty: llm_Response?.geo_llm ?? "None",
    //         appears_accross_bing: traffic?.top_sources ?? "N/A",
    //       };
    //     }

    const allDataforstrength: any = {

      website_audit: {
        Site_Speedcore_Web_Vitals_and_mobile_Experience: analysis_status?.dashboard1 ?? "N/A",
      },
      traffic : {
      avg_session_duration_in_seconds: traffic?.avg_session_duration ?? "N/A",
      engagement_rate: traffic?.engagement_rate ?? "N/A",
      engaged_sessions: traffic?.engaged_sessions ?? "N/A",
      total_visitors: traffic?.total_visitors ?? "N/A",
      unique_visitors: traffic?.unassigned ?? "N/A",
      new_vs_returning: traffic?.new_vs_returning ?? "N/A",
      top_countries: traffic?.top_countries ?? "N/A",
      top_devices: traffic?.top_devices ?? "N/A",
    },

    OnPage_Optimization : {
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


    },

    technical_seo : {
      no_of_broken_links: analysis?.total_broken_links ?? "N/A",
      broken_links: analysis?.broken_links ?? "N/A",
      schema: scraped?.schema_analysis ?? "None",
    },

    GEO : {
      schema: scraped?.schema_analysis ?? "None",
      AI_discovilibilty: llm_Response?.geo_llm ?? "None",
      appears_accross_bing: traffic?.top_sources ?? "N/A",

    },

    }

    


    const allDataforrecommendation: any = {

      top_of_funnel: {
        Site_Speed_and_Accessibility: analysis_status?.dashboard1 ?? "N/A",

        Search_Discoverability: {
          schema: scraped?.schema_analysis ?? "None",
          AI_discovilibilty: llm_Response?.geo_llm ?? "None",
          appears_accross_bing: traffic?.top_sources ?? "N/A",

          title: scraped?.page_title ?? "N/A",
          description: scraped?.meta_description ?? "N/A",
          heading_hierarchy: scraped?.headingAnalysis ?? "N/A",
          keywords: scraped?.meta_keywords ?? "N/A",
          og: {
            title: scraped?.og_title ?? "N/A",
            description: scraped?.og_description ?? "N/A",
            image: scraped?.og_image ? "Present" : "Missing",
          },

        }
      },

      mid_funnel: {
        Messaging_Content_Clarity: {
          h1: h1Text,
          heading_herachy: scraped?.headingAnalysis ?? "N/A",
          homepage_alt_text_coverage: scraped?.homepage_alt_text_coverage ?? "N/A",
          no_of_broken_links: analysis?.total_broken_links ?? "N/A",


        },
        Conversion_optimization: {
          bounce_rate: traffic?.overall_bounce_rate,
          high_bounce_pages: traffic?.high_bounce_pages,
          engagement_rate: traffic?.engagement_rate ?? "N/A",




        }

      },
      bottom_of_funnel: {
        Behavior_Funnel_Analysis: {
          avg_session_duration_in_seconds: traffic?.avg_session_duration ?? "N/A",
          engaged_sessions: traffic?.engaged_sessions ?? "N/A",
          bounce_rate: traffic?.overall_bounce_rate,
          // high_bounce_pages:traffic?.high_bounce_pages,
          total_visitors: traffic?.total_visitors ?? "N/A",
          unique_visitors: traffic?.unassigned ?? "N/A",
          new_vs_returning: traffic?.new_vs_returning ?? "N/A",
          // top_countries: traffic?.top_countries ?? "N/A",
          top_devices: traffic?.top_devices ?? "N/A",

        }

      }


    }
console.log("allDataforrecommendation",allDataforrecommendation)
    console.log("Generating LLM response (what working , what needs to be fixed)...");
    const llmResponse = await openai.chat.completions.create({
      model: model,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: prompt_web_and_seo,
        },
        { role: "user", content: JSON.stringify(allDataforstrength) },
      ],
    });
    // console.log("llm res", llmResponse.choices[0].message.content)
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
        { role: "user", content: JSON.stringify(allDataforrecommendation) },
      ],
    });

    const funnelRecommendations = funnelLLMResponse.choices[0].message.content
      ? JSON.parse(funnelLLMResponse.choices[0].message.content)
      : {
        top_of_funnel: {},
        mid_funnel: {},
        bottom_of_funnel: {},
      };


    // Normalize output
    const combinedOutput = normalizeAuditOutput(llmContent);
    if (combinedOutput) {
      console.log("LLM response generated successfully:");
    }
    const fullLLMResponse = {
      strengths_and_weaknness: combinedOutput,
      recommendations: funnelRecommendations,
    };
    console.log("Saving LLM response to database...");


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





const prompt_web_and_seo = `
You are a senior technical SEO expert with extensive experience in metadata, accessibility, structured data, web vitals, and analytics. You are generating output for a self-contained SEO audit and web audit tool that must provide actionable, technical solutions without relying on external tools or services (e.g., PageSpeed Insights, SEMrush, Lighthouse, or similar).
Handle all elements in the provided JSON input(title,meta data(keywords , descriptions),lcp).

Each element you describe will be rated numerically from 1 to 10 based on its performance:
**Every element in the input must be evaluated and categorized into either "whats_working" or "what_needs_fixing". No element should be omitted or left unclassified.**

- For **whats_working**: Assign ratings from 7 to 10:
  - 10 = Excellent (e.g., perfect implementation, optimal performance)
  - 9 = Strong (e.g., very good with minor room for improvement)
  - 8 = Good (e.g., solid but not exceptional)
  - 7 = Adequate (e.g., functional but could be enhanced)
- For **what_needs_fixing**: Assign ratings from 1 to 5:
  - 1 = Missing/Broken (e.g., completely absent or non-functional)
  - 2 = Poor (e.g., present but severely flawed)
  - 3 = Fair (e.g., functional but with significant issues)
  - 4 = Needs Improvement (e.g., minor issues)
  - 5 = Borderline (e.g., barely acceptable)

Given the provided JSON input, output a structured JSON response with three keys:

1. **whats_working**: A dictionary where keys are categories ("Analytics", "website audit") and each value is an array of objects. Each object must include:
   - \`tag\`: A short descriptive label (e.g., "LCP", "CLS")
   - \`explanation_reason\`: A detailed explanation (2-3 sentences) of why it works well, including technical context, impact on SEO/performance/user experience, and specific metrics or examples (e.g., "improves click-through rates by 20%"). Use positive terms like "excellent," "strong," "clear," or "robust." Do not mention external tools or services.
   - \`rating\`: A number from 7 to 10, based on the explanation_reason

2. **what_needs_fixing**: A dictionary where keys are categories ("Analytics", "website audit") and each value is an array of objects. Each object must include:
   - \`tag\`: A clear label (e.g., "TBT", "TTI")
   - \`explanation_reason\`: A detailed explanation (2-3 sentences) of why it’s underperforming or incorrect, including technical context, impact on SEO/performance/user experience, and specific metrics or examples (e.g., "reduces click-through rates by 30-40%"). Use terms like "missing," "broken," "poor," or "incomplete." Do not mention external tools or services.
   - \`rating\`: A number from 1 to 5, based on the explanation_reason


**Evaluation Criteria**:
- **Analytics**:
  - CTR Loss: <5% (10); 5–10% (5); >10% (2); missing (3)
  - Revenue Loss: <10% (10); 10–20% (5); >20% (2); missing (3)


- **website audit**:
  - LCP: <2.5s (10); 2.5–4s (5); >4s (1); missing (3)
  - CLS: <0.1 (10); 0.1–0.25 (5); >0.25 (1); missing (3)
  - FCP: <1.8s (10); 1.8–3s (5); >3s (1); missing (3)
  - TTI: <3.8s (10); 3.8–7.8s (5); >7.8s (1); missing (3)
  - TBT: <200ms (10); 200–500ms (5); >500ms (1); missing (3)
  - Performance: >90 (10); 50–89 (5); <50 (1); missing (3)
  - seo score: >90 (10); 50–89 (5); <50 (1); missing (3)
  - best partice : >90 (10); 50–89 (5); <50 (1); missing (3)

  
- **Traffic Anaylsis**:
- Avg Session Duration: >3 min (10); 1–3 min (7); <1 min (3); missing (3)
  - Engagement Rate: >50% (10); 30–50% (5); <30% (2); missing (3)
  - Organic Traffic: >50% of total (10); 20–50% (5); <20% (2); missing (3)
  - Total Visitors: >10,000 monthly (10); 1,000–10,000 (5–7); <1,000 (3); missing (3)
  - New vs. Returning: Balanced (40–60%) (10); skewed (>80% new) (5); missing (3)
  - bounce rate 
  


- **OnPage Optimization**  
  - Title: <60 chars, keyword-rich (8–10); 60–70 chars (5–7); >70 or missing (1–3)
  - Description: 150–160 chars, compelling (8–10); <120 or >160 (5–7); missing (1–4)
  - H1: Present, unique, keyword-aligned (7–9); missing (0–4)
  - Alt Text Coverage: >90% (10); 70–90% (7); <70% (3); missing (3)
  - og: {
            title: scraped?.og_title ?? "N/A",
            description: scraped?.og_description ?? "N/A",
            image: scraped?.og_image ? "Present" : "Missing",
          },


- **Technical SEO**:
  - Schema: Valid JSON-LD (10); invalid (3); missing (1)-(refer this as chatbot crawlability
  
  - Broken Links: None (10); 1–3 (5); >3 (1); missing (5)

- **GEO**:
  - Schema: Valid JSON-LD (10); invalid (3); missing (1)
  - AI_Discoverability (visibility on openai search)

  

Strictly ensure every recommendation has a \`tag\` matching a \`tag\` in what_needs_fixing for the same category. If what_needs_fixing is empty for a category, recommendations for that category must be empty. Avoid ambiguous terms like "present" unless clearly positive or negative. Ensure ratings align with the tone and content of the explanation_reason. Never recommend using external tools or services like PageSpeed Insights, SEMrush, Lighthouse, or similar.

Example Output:
{
  "whats_working": {
    "website audit": [
      {
        "tag": "CTR Loss",
        "explanation_reason": "The click-through rate (CTR) loss is 0%, indicating that all key pages are performing optimally in attracting clicks from search results. This strong performance suggests that metadata, snippets, and search presentation are clear and compelling, resulting in no measurable drop in organic traffic due to CTR issues.",
        "rating": 10
      }
    ]
  },
  "what_needs_fixing": {
    "website audit": [
      {
        "tag": "TBT",
        "explanation_reason": "Total Blocking Time (TBT) is 600ms, exceeding the 200ms threshold. This delays interactivity, causing user frustration and potentially increasing bounce rates by 15-20%.",
        "rating": 1
      }
      
    ]
  },
  
}


Output only valid JSON .
`;



const funnelRecommendationPrompt = `
You are a senior growth strategist and website optimization expert.

Your job is to evaluate a website's traffic, performance, content, and engagement. Based on the given data (e.g., current H1, CTA text, bounce rate, LCP, engagement rate), generate a **diagnostic and actionable** set of recommendations — structured as a JSON object — organized by each stage of the marketing funnel.

Each recommendation must follow this format:
- Start by referencing or critiquing the current state (e.g., “Your H1 says ‘Welcome to Acme’ — this feels too generic…”)
- Suggest a better alternative (e.g., “Try ‘AI Tools for Startups’…”)
- Explain why this matters (e.g., “…to improve keyword relevance and help users instantly understand your value.”)

---

### Output JSON format (return this and nothing else):

\`\`\`json
{
  "top_of_funnel": {
    "focus": "Increase visibility and speed to capture top-of-funnel interest.",
    "categories": {
      "Search Discoverability": [
        "Your H1 says 'Welcome to Acme' — this feels too generic and doesn’t reflect any use full imformation,Try 'Marketing Software for Coaches' to immediately communicate value and improve SEO relevance.",
        "Meta title is currently 'Home' — that’s not informative for search engines , update it to something like 'Affordable CRM for Coaches | Acme' to improve visibility and click-through rates.",
        "No schema markup detected — this limits your presence in rich search results ,you should add Product and Organization schema to improve search visibility and context."
      ],
      "Site Speed & Accessibility": [
        "screen takes to much time to response"
        "Mobile LCP is 5.8s — that's quite slow ,for lower load and improve ranking time compress hero images and reduce render-blocking scripts.",
        "No viewport tag found — your site may not render properly on mobile ,for responsive behavior and better usability add a viewport meta tag .",
        "CLS is high due to shifting banners , this creates a jarring user experience for better performace  reserve layout space or preload fonts to stabilize content."
      ],
      "Link Sharing (OG Tags)": [
        "OpenGraph title is missing — shared links appear blank or generic , Add OG:title(suggest title ) and OG:image to improve social preview and engagement."
      ]
    },
    "sample_insight": "Your homepage takes over 5 seconds to load on mobile — that’s likely causing drop-offs before the content even renders."
  },
  "mid_funnel": {
    "focus": "Help visitors quickly understand what you offer and why it matters.",
    "categories": {
      "Messaging & Content Clarity": [
        "Hero headline says 'Welcome to Our Site' — it doesn’t communicate your value , Use something like 'Manage Your Coaching Business in One Place' to clarify your purpose.",
        "Content layout uses multiple H1 tags — that confuses search engines and users ,Structure headings semantically with one H1 and clear H2/H3s for scannability.",
        "Above-the-fold content is mostly visual — there's little textual context ,Add a one-liner and value prop to guide the user and improve SEO signals."
      ],
     "Conversion Optimization": [
  "Users appear to visit but leave quickly with minimal interaction — this indicates the page may lack a clear next step or compelling value proposition. Consider guiding users visually or contextually toward one core action, even if it's just scrolling or reading more.",
  "High initial drop-off and low engagement suggest that your top section may not be capturing attention. Try repositioning key content — such as your main benefit, product summary, or unique differentiator — closer to the top.",
  "The experience feels passive and static — this often leads users to disengage. Introduce scroll cues (like downward arrows or animations), progressive content reveals, or even interactive elements to keep users exploring.",
  "Slow loading above the fold is likely reducing perceived quality and trust. Optimize large assets and script loads to deliver faster content visibility and reduce abandonment risk.",
  "If most users don’t scroll far, consider restructuring your layout — bring value-based elements (benefits, trust indicators, pain points solved) into the top 25% of the page to spark interest earlier."
]

    },
    "sample_insight": "Users must scroll several times before encountering your CTA — you're missing early conversion opportunities."
  },
  "bottom_of_funnel": {
    "focus": "Reduce drop-offs and encourage repeat engagement.",
    "categories": {
      "Behavior & Funnel Analysis": [
        "Most users appear to leave shortly after landing,without scrolling or interacting( bounce rate is 70%) — that’s a sign of poor first impressions or unclear content , Review above-the-fold messaging and speed performance to reduce exits.",
        "Session depth is 1.3 pages per user — this suggests shallow engagement ,Add internal links or related content sections to guide further exploration.",
        "Users aren't exploring beyond the first page — this points to a lack of curiosity or direction. Consider embedding contextual internal links, adding section previews, or guiding users with clear next-step paths.",
        "Mobile engagement is lower than desktop — likely due to speed or layout issues , Audit mobile usability and compress assets for better mobile retention."
      ],
      "Retention & Re-engagement": [
        "New vs returning visitors ratio is 90:10 — that’s low retention , Offer value-based lead magnets or email opt-ins to nurture return visits.",
        "No re-engagement nudges detected — you're missing a chance to recover exits , Try adding exit-intent popups with offers or guides.",
        "No persistent nav or sticky CTA — users may lose their way during long scrolls , Add sticky navigation or bottom-fix CTA buttons to keep actions visible."
      ]
    },
    "sample_insight": "Only 15% of your users scroll past the first section — consider using visual cues and persistent CTAs to guide users downward."
  }
}
\`\`\`

---

NOTE : Never mention a 3rd party like pagespeed or smrush etc 
`
