import { PrismaClient } from "@prisma/client";
import { OpenAI } from "openai";
import {sanitizeAndStringify} from "../../../utils/clean_text"
const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = process.env.OPENAI_MODEL || "gpt-4.1";

function cleanStringValues(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(cleanStringValues);
  } else if (typeof obj === "string") {
    return obj
      .replace(/\\n/g, " ")           // Replace \n with space
      .replace(/\s+/g, " ")           // Collapse multiple spaces
      .replace(/["']+/g, "")          // Remove quotes (if needed)
      .trim();
  } else if (obj && typeof obj === "object") {
    const cleaned: Record<string, any> = {};
    for (const key in obj) {
      cleaned[key] = cleanStringValues(obj[key]);
    }
    return cleaned;
  }
  return obj; // Return as-is for numbers, booleans, null
}

export const generatesocialmediareport = async (
  website_id: string,
  user_id: string,
  report_id: string
) => {
  if (!website_id || !user_id) {
    return { error: "Missing website_id or user_id" };
  }

  console.log("Report generation started for website_id:", website_id);

  const report = await prisma.report.findUnique({
    where: { report_id },
    select: { scraped_data_id: true, dashboard2_data: true },
  });

  try {
    const [scraped] = await Promise.all([
      prisma.website_scraped_data.findUnique({
        where: { scraped_data_id: report?.scraped_data_id ?? undefined },
        select: {
          meta_description: true,
          page_title: true,
          H1_text: true,
        },
      }),
    ]);

   
    const allDataforrecommendation = {
      meta_data: {
        title: scraped?.page_title ?? "N/A",
        meta_description: scraped?.meta_description ?? "N/A",
        h1_heading: scraped?.H1_text?? "N/A",
      },
      social_media_data: report?.dashboard2_data ?? "n/a",
    };
    const clean_data = sanitizeAndStringify(allDataforrecommendation)
    console.log("clean_data",clean_data)
    const llmResponse = await openai.chat.completions.create({
      model: model,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: brandPulsePrompt },
        { role: "user", content: JSON.stringify(clean_data) },
      ],
    });

    const contentString = llmResponse.choices[0].message.content;

    let llmContentParsed;
    try {
      llmContentParsed = JSON.parse(contentString ?? "{}");
    } catch (parseError) {
      console.error("Failed to parse LLM response:", parseError);
      return { error: "Failed to parse LLM response" };
    }

    // Securely clean strings from \n, extra quotes, etc.
    const cleanedContent = cleanStringValues(llmContentParsed);

    // Save cleaned response
    await prisma.report.upsert({
      where: { report_id },
      update: { recommendationbymo2: JSON.stringify(cleanedContent) },
      create: {
        report_id,
        recommendationbymo2: JSON.stringify(cleanedContent),
        user_websites: { connect: { website_id } },
      },
    });

    const existing = await prisma.analysis_status.findFirst({ where: { report_id } });

    if (existing) {
      await prisma.analysis_status.update({
        where: { id: existing.id },
        data: { website_id, recommendationbymo2: true },
      });
    } else {
      await prisma.analysis_status.create({
        data: { report_id, website_id, recommendationbymo2: true, user_id },
      });
    }

    console.log("LLM response saved successfully for report_id:", report_id);
    return { recommendation_by_mo_dashboard2: cleanedContent };
  } catch (err) {
    console.error("LLM Audit Error:", err);
    return { error: "Internal Server Error" };
  }
};

export const brandPulsePrompt = `Analyze the brand tone, messaging style, and cross-channel presence across the following platforms: website, Instagram, Facebook, and YouTube. Carefully review the content from each platform, then generate a structured JSON output with the following sections:

1. **Brand Voice Summary (Core Identity)**  
   - Provide a unified overview of the brand’s overall voice, tone, emotional quality, and communication style.

2. **Platform-wise Overview**  
   For each platform (website, Instagram, Facebook, YouTube), summarize in the same format:
   - Tone & Style (e.g. professional, playful, inspiring)  
   - Emotional Appeal (e.g. motivating, humorous, trust-building)  
   - Communication Format (e.g. slogan-driven, visual-heavy, story-led)

3. **Persona Alignment**  
   - Identify the perceived target persona(s) (e.g. Gen Z trend-seekers, eco-conscious parents, corporate buyers, etc.).  
   - Mention if personas differ by platform.

4. **Consistency Evaluation**  
   - Rate consistency across all platforms on a scale of 1–5 (1 = very inconsistent, 5 = highly consistent).  
   - Mention any areas where tone or style diverges.

5. **Industry Platform Usage**  
   - Identify which platforms are most dominant in this industry.  
   - Suggest which platform(s) this brand should prioritize more for visibility and impact.

6. **Omnichannel Experience**  
   - Evaluate how well the platforms connect to create a seamless brand journey.  
   - Note strengths and gaps (e.g. strong Instagram ↔ website funnel, weak YouTube integration).  

7. **Industry Advertising Insights**  
   - Highlight common types of ads running in this industry (e.g. performance-driven video ads, influencer collaborations, carousel product ads).  
   - Suggest which ad formats the brand should focus on (detail).

8. **Key Findings**  
   Provide 3–5 bullet points covering:  
   - Matches/mismatches in tone across platforms  
   - Unique or standout CTAs/slogans  
   - Any contradictions in messaging  
   - Observations about visual or ad strategy

9. **Actionable Recommendation**  
   - One-sentence suggestion on how to unify voice, optimize platform mix, and align with the target persona.

Return the response in the following JSON format:

{
  "brand_voice_summary": "Unified overview of brand’s voice and tone",
  
  "platform_overview": {
    "website":
    { "tone_style":"",
       "emotional_appeal":"",
       "communication_format" : "" ,
       "engagement": ""
    },
    "instagram":  { "tone_style":"",
       "emotional_appeal":"",
       "communication_format" : "" ,
       "engagement": ""
    },
    "facebook": { "tone_style":"",
       "emotional_appeal":"",
       "communication_format" : "" ,
       "engagement": ""
    },
    "youtube":  { "tone_style":"",
       "emotional_appeal":"",
       "communication_format" : "" ,
       "engagement": ""
    },
  },
  
  "persona_alignment": "Description of target persona(s)",

  "overall_consistency": {
   "overall_consistency_score": "",
   "visual": "★★★★☆" 
   "justification" : ""

  
  },

  "industry_platform_usage": {
    "dominant_platforms": ["List of top platforms in this industry"],
    "recommended_focus": "Which platform(s) the brand should prioritize(in detail)"
  },

  "omnichannel_experience": "Evaluation of cross-platform journey, strengths and gaps",

  "industry_ads": {
    "common_ad_types": ["List of common ad types in the industry"],
    "recommended_ad_focus": "Which ad type(s) to prioritize"
  },

  "key_findings": [
    "Finding 1",
    "Finding 2",
    "Finding 3"
  ],

  "recommendation": "actionable suggestions"
}` as const;
