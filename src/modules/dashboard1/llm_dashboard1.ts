import { PrismaClient } from "@prisma/client";
import { OpenAI } from "openai";
import * as cheerio from "cheerio";

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = process.env.OPENAI_MODEL || "gpt-4.1";
let propmt_for_whatsworking = "Whats working and what needs to be fixed(dashbord1)";
let recommendation = "recommendation by mo for dashboard 1";

export const generate_d1_recommendation= async (website_id: string, user_id: string, report_id:string) => {
  if (!website_id || !user_id) {
    return ({ error: "Missing website_id or user_id" });
  }
  console.log("Report generation started for website_id:", website_id);
  const report = await prisma.report.findUnique({
        where: { report_id }
      })
      console.log("report?.traffic_analysis_id",report?.traffic_analysis_id)
  try {
   
  const [scraped, analysis, traffic,prompt] = await Promise.all([
  prisma.website_scraped_data.findUnique({
    where: { scraped_data_id: report?.scraped_data_id ?? undefined },
  
  }),
  prisma.brand_website_analysis.findUnique({
    where: { website_analysis_id: report?.website_analysis_id ?? undefined },
    select: {
      audit_details: true,
      broken_links: true,
      total_broken_links: true,
    },
  }),
  report?.traffic_analysis_id
    ? prisma.brand_traffic_analysis.findUnique({
        where: { traffic_analysis_id: report.traffic_analysis_id },
      })
    : null,
     prisma.propmt_templates.findUnique({
    where: { template_name: propmt_for_whatsworking },
    select: {
    description: true,
    },
  }),  
]);

    let h1Text = "Not Found";
    if (scraped?.raw_html) {
      const $ = cheerio.load(scraped.raw_html);
      h1Text = $("h1").first().text().trim() || "Not Found";
    }
    let parsedData: any = {};
try {
  parsedData = JSON.parse(report?.dashboard1_Freedata || '{}');
  // console.log("parsedData",parsedData)
} catch (e) {
  console.error("Failed to parse dashboard data:", e);
}

    const allDataforrecommendation: any = {
      top_of_funnel: {
        Site_Speedcore_Web_Vitals_and_mobile_Experience : parsedData?.dashboard_summary?.data_for_llm ?? "N/A",
        Search_Discoverability: {
          schema: scraped?.schema_analysis ?? "None",
          AI_discovilibilty: report?.geo_llm ?? "None",
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
        },
      },
      middle_of_funnel: {
        Messaging_Content_Clarity: {
          h1: h1Text,
          heading_hierarchy: scraped?.headingAnalysis ?? "N/A", 
          homepage_alt_text_coverage: scraped?.homepage_alt_text_coverage ?? "N/A",
          no_of_broken_links: analysis?.total_broken_links ?? "N/A",
        },
        Conversion_optimization: {
          bounce_rate: traffic?.overall_bounce_rate ?? "N/A",
          high_bounce_pages: traffic?.high_bounce_pages ?? "N/A",
          engagement_rate: traffic?.engagement_rate ?? "N/A",
        },
      },
      bottom_of_funnel: {
        Behavior_Funnel_Analysis: {
          avg_session_duration_in_seconds: traffic?.avg_session_duration ?? "N/A",
          engaged_sessions: traffic?.engaged_sessions ?? "N/A",
          bounce_rate: traffic?.overall_bounce_rate ?? "N/A",
          total_visitors: traffic?.total_visitors ?? "N/A",
          unique_visitors: traffic?.unassigned ?? "N/A",
          new_vs_returning: traffic?.new_vs_returning ?? "N/A",
          top_devices: traffic?.top_devices ?? "N/A",
        },
      },
    };

   
    console.log("allDataforrecommendation",allDataforrecommendation)
  
    recommendation = prompt?.description || "Whats working and what needs to be fixed";
    console.log("Generating LLM response (funnel recommendation)…");
    const funnelLLMResponse = await openai.chat.completions.create({
      model: model,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: recommendation },
        { role: "user", content: JSON.stringify(allDataforrecommendation) },
      ],
    });

    let funnelRecommendations;
    try {
      funnelRecommendations = funnelLLMResponse.choices[0].message.content
        ? JSON.parse(funnelLLMResponse.choices[0].message.content)
        : { top_of_funnel: {}, middle_of_funnel: {}, bottom_of_funnel: {} };
      // console.log("Parsed Funnel Recommendations:", JSON.stringify(funnelRecommendations, null, 2));
    } catch (parseError) {
      console.error("Failed to parse funnel LLM response:", parseError);
      funnelRecommendations = { top_of_funnel: {}, middle_of_funnel: {}, bottom_of_funnel: {} };
    }

    // const combinedOutput = normalizeAuditOutput(llmContent);
    const fullLLMResponse = {
      recommendations: funnelRecommendations,
    };
    console.log("Full LLM Response:", JSON.stringify(fullLLMResponse, null, 2));

    console.log("Saving LLM response to database...");
    await prisma.report.upsert({
  where: { report_id },
  update: {
    recommendationbymo1: JSON.stringify(funnelRecommendations),
  },
  create: {
    report_id,
    recommendationbymo1: JSON.stringify(funnelRecommendations),
    user_websites: {
      connect: {
        website_id: website_id, 
           },
    },
  },
});
     
   const existing = await prisma.analysis_status.findFirst({
  where: { report_id }
});

if (existing) {
await prisma.analysis_status.update({
    where: { id: existing.id },
    data: { website_id, recommendationbymo1: true }
  });
} else {
await prisma.analysis_status.create({
    data: { report_id, website_id, recommendationbymo1: true ,user_id}
  });
}

    console.log("LLM response saved successfully for website_id:", website_id);

    return ({ recommendation_by_mo_dashboard1: fullLLMResponse });
  } catch (err) {
    console.error("LLM Audit Error:", err);
    return ({ error: "Internal Server Error" });
  }
};

export const generated1_strengthandIssue = async (website_id: string, user_id: string, report_id:string) => {
  if (!website_id || !user_id) {
    return ({ error: "Missing website_id or user_id" });
  }
  console.log("Report generation started for website_id:", website_id);
  const report = await prisma.report.findUnique({
        where: { report_id }
      })
      console.log("report?.traffic_analysis_id",report?.traffic_analysis_id)
  try {
  
  const [scraped, analysis, traffic,propmt] = await Promise.all([
  prisma.website_scraped_data.findUnique({
    where: { scraped_data_id: report?.scraped_data_id ?? undefined },
  
  }),
  prisma.brand_website_analysis.findUnique({
    where: { website_analysis_id: report?.website_analysis_id ?? undefined },
    select: {
      audit_details: true,
      broken_links: true,
      total_broken_links: true,
    },
  }),
  
  report?.traffic_analysis_id
    ? prisma.brand_traffic_analysis.findUnique({
        where: { traffic_analysis_id: report.traffic_analysis_id },
      })
    : null,
     prisma.propmt_templates.findUnique({
    where: { template_name: propmt_for_whatsworking },
    select: {
    description: true,
    },
  }),
]);
    
    let h1Text = "Not Found";
    if (scraped?.raw_html) {
      const $ = cheerio.load(scraped.raw_html);
      h1Text = $("h1").first().text().trim() || "Not Found";
    }
    let parsedData: any = {};
try {
  parsedData = JSON.parse(report?.dashboard1_Freedata || '{}');
  // console.log("parsedData",parsedData)
} catch (e) {
  console.error("Failed to parse dashboard data:", e);
}
    const allDataforstrength: any = {
      website_audit: {
        
        siteSpeedAndMobileExperience: {
  speedHealth: parsedData?.data_for_llm?.speed_health ?? {},
  // mobileFriendliness: parsedData?.data_for_llm?.categories?.mobileFriendliness ?? [],
}

      },
      traffic: {
        avg_session_duration_in_seconds: traffic?.avg_session_duration ?? "N/A",
        engagement_rate: traffic?.engagement_rate ?? "N/A",
        engaged_sessions: traffic?.engaged_sessions ?? "N/A",
        total_visitors: traffic?.total_visitors ?? "N/A",
        unique_visitors: traffic?.unassigned ?? "N/A",
        new_vs_returning: traffic?.new_vs_returning ?? "N/A",
        top_countries: traffic?.top_countries ?? "N/A",
        top_devices: traffic?.top_devices ?? "N/A",
        bounc_rate: traffic?.overall_bounce_rate ?? "N/A",
      },
      OnPage_Optimization: {
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
      technical_seo: {
        no_of_broken_links: analysis?.total_broken_links ?? "N/A",
        broken_links: analysis?.broken_links ?? "N/A",
        schema: scraped?.schema_analysis ?? "None",
      },
      GEO: {
        schema: scraped?.schema_analysis ?? "None",
        AI_discovilibilty: report?.geo_llm ?? "None",
        appears_accross_bing: traffic?.top_sources ?? "N/A",
      },
    };
    console.log("allDataforstrength",allDataforstrength)
    propmt_for_whatsworking = propmt?.description || "Whats working and what needs to be fixed";
    console.log("Generating LLM response (what working, what needs to be fixed)...");
    const llmResponse = await openai.chat.completions.create({
      model: model,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content:propmt_for_whatsworking },
        { role: "user", content: JSON.stringify(allDataforstrength) },
      ],
    });
    // console.log("Raw LLM Response:", llmResponse.choices[0].message.content);
    let llmContent;
    try {
      llmContent = llmResponse.choices[0].message.content
        ? JSON.parse(llmResponse.choices[0].message.content)
        : { whats_working: {}, what_needs_fixing: {} };
    } catch (parseError) {
      console.error("Failed to parse LLM response:", parseError);
      llmContent = { whats_working: {}, what_needs_fixing: {}};
    }

 
    const fullLLMResponse = {
      strengths_and_weaknness: llmContent,
    };
    console.log("Full LLM Response:", JSON.stringify(fullLLMResponse, null, 2));

    console.log("Saving LLM response to database...");
    await prisma.report.upsert({
  where: { report_id },
  update: {
    // recommendationbymo1: JSON.stringify(funnelRecommendations),
    strengthandissues_d1:JSON.stringify(llmContent),
  },
  create: {
    report_id,
    // recommendationbymo1: JSON.stringify(funnelRecommendations),
    strengthandissues_d1:JSON.stringify(llmContent),
    user_websites: {
      connect: {
        website_id: website_id, 
           },
    },
  },
});
     
   const existing = await prisma.analysis_status.findFirst({
  where: { report_id }
});

if (existing) {
  await prisma.analysis_status.update({
    where: { id: existing.id },
    data: { website_id, strengthandissues_d1: true }
  });
} else {
  await prisma.analysis_status.create({
    data: { report_id, website_id, strengthandissues_d1: true ,user_id}
  });
}

    console.log("LLM response saved successfully for website_id:", website_id);

    return ({ recommendation_by_mo_dashboard1: fullLLMResponse });
  } catch (err) {
    console.error("LLM Audit Error:", err);
    return ({ error: "Internal Server Error" });
  }
};

const prompt_web_and_seo = `
You are a senior technical SEO expert with extensive experience in metadata, accessibility, structured data, web vitals, and analytics. You are generating output for a self-contained SEO audit and web audit tool that must provide actionable, technical solutions without relying on external tools or services (e.g., PageSpeed Insights, SEMrush, Lighthouse, or similar).

Handle all elements in the provided JSON input (title, meta data (keywords, descriptions), LCP, etc.).

Each element you describe will be rated numerically from 1 to 10 based on its performance:
**Every element in the input must be evaluated and categorized into either "whats_working" or "what_needs_fixing". No element should be omitted or left unclassified.**

- For **whats_working**: Assign ratings from 7 to 10:
  - 10 = Excellent (perfect implementation, optimal performance)
  - 9 = Strong (very good with minor room for improvement)
  - 8 = Good (solid but not exceptional)
  - 7 = Adequate (functional but could be enhanced)

- For **what_needs_fixing**: Assign ratings from 1 to 5:
  - 1 = Missing/Broken (completely absent or non-functional)
  - 2 = Poor (present but severely flawed)
  - 3 = Fair (functional but with significant issues)
  - 4 = Needs Improvement (minor issues)
  - 5 = Borderline (barely acceptable)

Return JSON with the following top-level structure:

### Output Structure:

\`\`\`json
{
  "whats_working": {
    "website audit": [...],

    
    "Traffic Analysis":[...],
  
    "OnPage Optimization": [...],

    "Technical SEO": [...],

    "GEO": [...]
  },
  "what_needs_fixing": {
    "website audit": [...],

    "Traffic Analysis":[...],
  
    "OnPage Optimization": [...],

    "Technical SEO": [...],

    "GEO": [...]
}
\`\`\`

Each object inside the arrays must include:
- \`tag\`: Exact metric/tag from the list below (e.g., "LCP", "Alt Text Coverage")
- \`explanation_reason\`: Clear, technical explanation (2–3 sentences) of why it’s performing well or poorly. Include the business/UX/SEO impact. Avoid vague words like “present”.
- \`rating\`: A number based on the above scale.

### Evaluation Criteria:

#### website audit:
- LCP: <2.5s (7-9); 2.5–4s (4-6); >4s (1-3); missing (1)
- CLS: <0.1 (6-9); 0.1–0.25 (5-6); >0.25 (1-4); missing (0-1)
- FCP: <1.8s (6-7); 1.8–3s (5); >3s (1); missing (0-1)
- TTI: <3.8s (7-10); 3.8–7.8s (5); >7.8s (1); missing (0-1)
- TBT: <200ms (7-10); 200–500ms (5); >500ms (1); missing (0-1)
- Performance: >90 (7-10); 50–89 (5); <50 (1); missing (0-1)
- SEO Score: >90 (7-10); 50–89 (5); <50 (1); missing (0-1)
- Best Practices: >90 (7-10); 50–89 (5); <50 (1); missing (0-1)

#### SEO audit:

##### Traffic Analysis:
- Avg Session Duration: >3 min (7-10); 1–3 min (7); <1 min (3); missing (0-1)
- Engagement Rate: >50% (7-10); 30–50% (5); <30% (2); missing (0-1)
- Organic Traffic: >50% of total (7-10); 20–50% (5); <20% (2); missing (0-1)
- Total Visitors: >7-10,000 monthly (7-10); 1,000–7-10,000 (5–7); <1,000 (3); missing (0-1)
- New vs Returning: Balanced (40–60%) (7-10); skewed (>80% new) (5); missing (0-1)
- Bounce Rate: <40% (7-10); 40–60% (5); >60% (2); missing (0-1)

##### OnPage Optimization:
- Title: <60 chars, keyword-rich (7-10); 60–70 chars (5–7); >70 or missing (1–3)
- Description: 150–160 chars, compelling (8–10); <120 or >160 (5–7); missing (1–4)
- H1: Present, unique, keyword-aligned (7–9); missing (1–4)
- Alt Text Coverage: >90% (8-10); 70–90% (7); <70% (3); missing (0-1)
- OG Tags:
  - og:title: Keyword-aligned and engaging (8–10); generic (5–7); missing (1–3)
  - og:description: Informative and compelling (8–10); generic/too long (5–7); missing (1–4)
  - og:image: High-quality and optimized (8–10); missing or irrelevant (1–3)

##### Technical SEO:
- Schema (Chatbot Crawlability): Valid JSON-LD (7-10); invalid (3); missing (1)
- Broken Links: None (9-9.5); 1–3 (5); >3 (1); missing (5)

##### GEO:
- Geo Schema: Valid JSON-LD (7-9); invalid (3); missing (1)
- AI Discoverability: High visibility on open search (8–10); low or missing (1–3)

### Additional Rules:
- For every \`tag\` in \`what_needs_fixing\`, provide corresponding improvement recommendations in your system (do not include in JSON output).
- Avoid recommending use of external tools.
- All numeric ratings must align with the explanation tone and thresholds.
- If a section has no issues, the corresponding category in \`what_needs_fixing\` must be an empty array.
- Tags must exactly match those listed above to ensure consistency with grading logic.

Output only **valid, parsable JSON** as described above.
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
  "middle_of_funnel": {
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
     
    },
    "sample_insight": "Only 15% of your users scroll past the first section — consider using visual cues and persistent CTAs to guide users downward."
  }
}
\`\`\`

---

NOTE : Never mention a 3rd party like pagespeed or smrush etc 
`



