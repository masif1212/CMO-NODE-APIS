import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { OpenAI } from "openai";

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const generateLLMAuditReportForBrokenLinks = async (req: Request, res: Response) => {
  const { website_id } = req.body;

  if (!website_id) {
    return res.status(400).json({
      success: false,
      error: "'website_id' is required.",
    });
  }

  try {
    // 1. Get the analysis record
    const analysisRecord = await prisma.brand_website_analysis.findFirst({
      where: { website_id },
      select: {
        website_analysis_id: true,
        broken_links: true,
        total_broken_links: true,
      },
    });

    if (!analysisRecord) {
      return res.status(404).json({
        success: false,
        error: "No analysis found for the provided website_id.",
      });
    }

    const { website_analysis_id, broken_links, total_broken_links } = analysisRecord;

    if (!broken_links || total_broken_links === 0) {
      return res.status(200).json({
        success: true,
        website_id,
        analysis_id: website_analysis_id,
        report: "No broken links were found during the audit.",
      });
    }

    // 2. Build prompt with broken links
    const prompt = `
You are a website quality auditor. A recent crawl of the website revealed ${total_broken_links} broken links.

Here is the list of broken links in JSON format:
${JSON.stringify(broken_links, null, 2)}

Please analyze this list and provide:
1. A summary of the most affected pages or patterns you notice.
2. Explanation of the possible causes of these broken links.
3. Technical and actionable steps the developer or webmaster should take to fix and prevent broken links in the future.
Be specific, concise, and professional in your tone.
`;

    // 3. Call OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
    });

    const llmOutput = response.choices?.[0]?.message?.content;
    await prisma.llm_audit_reports.upsert({
          where: { website_id },
          update: {
            broken_links_report: llmOutput,
          },
          create: {
            website_id,
            broken_links_report: llmOutput,
          },
        });
    return res.status(200).json({
      success: true,
      website_id,
      analysis_id: website_analysis_id,
      report: llmOutput,
    });
  } catch (err: any) {
    console.error("❌ Broken Link Audit Error:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to generate broken link audit report.",
      detail: err?.message || "Internal server error",
    });
  }
};
