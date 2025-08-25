import { PrismaClient } from "@prisma/client";
import { OpenAI } from "openai";
import * as cheerio from "cheerio";

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
          meta_keywords: true,
          page_title: true,
          H1_text: true,
        },
      }),
    ]);

   
    const allDataforrecommendation = {
      meta_data: {
        title: scraped?.page_title ?? "N/A",
        meta_description: scraped?.meta_description ?? "N/A",
        meta_keywords: scraped?.meta_keywords ?? "n/a",
        h1_heading: scraped?.H1_text?? "N/A",
      },
      social_media_data: report?.dashboard2_data ?? "n/a",
    };

    const llmResponse = await openai.chat.completions.create({
      model: model,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: brandPulsePrompt },
        { role: "user", content: JSON.stringify(allDataforrecommendation) },
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
      update: { strengthandissues_d2: JSON.stringify(cleanedContent) },
      create: {
        report_id,
        strengthandissues_d2: JSON.stringify(cleanedContent),
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

    console.log("LLM response saved successfully for website_id:", website_id);
    return { recommendation_by_mo_dashboard2: cleanedContent };
  } catch (err) {
    console.error("LLM Audit Error:", err);
    return { error: "Internal Server Error" };
  }
};

export const brandPulsePrompt = `Analyze the brand tone and messaging style across the following platforms: website, Instagram, Facebook, and YouTube. Carefully read and compare the content from each platform, and generate a structured JSON output that includes:

Platform-wise Tone Analysis: Brief summary of the tone and style used on each platform. Mention any emotional tone (e.g. inspiring, humorous, professional), voice (e.g. conversational, authoritative), and communication style (e.g. visual-heavy, slogan-driven).

Persona Alignment: Determine whether the brand’s tone and content aligns with a specific audience persona, such as Gen Z consumers, corporate buyers, eco-conscious families, small business owners, etc.

Consistency Evaluation: Rate the overall brand tone consistency across all platforms on a scale of 1 to 5, where 1 is very inconsistent and 5 is highly consistent.

Key Findings: List 3–5 bullet points highlighting:
- Matches or mismatches in tone across platforms
- Unique or standout phrases, CTAs, or slogans
- Any contradictions in messaging or positioning
- Observations about visual tone (if applicable)

Actionable Recommendation: Provide a one-sentence recommendation to improve tone consistency and alignment with the target persona.

Return the response in the following JSON format:

Expected JSON Format:

{
  "Brand Pulse Sync: Voice & Tone Harmony Check”": {
    "website": "Brief summary of tone & style used on the website",
    "social_media_platform1": "Brief summary of tone on Instagram",
    "social_media_platform2": "Brief summary of tone on Facebook",
    "social_media_platform3": "Brief summary of tone on YouTube"
  },
  "persona_alignment": "Describe the perceived target persona (e.g. Gen Z lifestyle audience, professional B2B buyers, health-conscious parents, etc.)",
  
  "overall_consistency_score": "Rating from 1 (inconsistent) to 5 (very consistent)",
  "key_findings": [
    "Finding 1: tone match/mismatch across platforms",
    "Finding 2: notable phrase, CTA, or slogan",
    "Finding 3: contradiction in tone or messaging",
    "Finding 4: additional tone-related insight (optional)"
  ],
  "recommendation": "One-sentence suggestion to align or enhance brand tone consistency"
}` as const;
