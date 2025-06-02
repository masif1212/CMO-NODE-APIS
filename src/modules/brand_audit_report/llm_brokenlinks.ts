import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { OpenAI } from "openai";
import * as cheerio from "cheerio"; 
import { marked } from 'marked'; // for Markdown to HTML conversion
const prisma = new PrismaClient();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = process.env.OPENAI_MODEL || "gpt-4.1";
const max_tokens = Number(process.env.MAX_TOKENS) || 3000; 

export async function generateLLMAuditReportForBrokenLinks(website_id: string) {    

  const currentDate = new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

  try {
         const scrapedData = await prisma.website_scraped_data.findUnique({
           where: { website_id },
           select: {
             page_title: true,
             meta_description: true,
             meta_keywords: true,
             og_title: true,
             og_description: true,
             raw_html: true,
           },
         });
     
         if (!scrapedData) {
           return ({
             success: false,
             error: "No scraped metadata found for the provided website_id.",
           });
         }
     
         // Extract <h1> from HTML
         let h1Text = "Not Found";
         if (scrapedData.raw_html) {
           const $ = cheerio.load(scrapedData.raw_html);
           h1Text = $("h1").first().text().trim() || "Not Found";
         }
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
      return ({
        success: false,
        error: "No analysis found for the provided website_id.",
      });
    }

    const { website_analysis_id, broken_links, total_broken_links } = analysisRecord;

    if (!broken_links || total_broken_links === 0) {
      return ({
        success: true,
        website_id,
        analysis_id: website_analysis_id,
        report: "No broken links were found during the audit.",
      });
    }

    // 2. Build prompt with broken links
    const prompt = `
You are a website quality auditor. A recent crawl of the website revealed ${total_broken_links} broken links.
 

### Website Metadata Overview:
- Page Title: ${scrapedData.page_title || "N/A"}
- Meta Description: ${scrapedData.meta_description || "N/A"}
- Meta Keywords: ${scrapedData.meta_keywords || "N/A"}

- First H1 Tag: ${h1Text}

Here is the list of broken links in JSON format:
${JSON.stringify(broken_links, null, 2)}



1. **Introduction**  
   - Briefly introduce the brand/website and summarize the purpose of brand.  


Please analyze this list and provide:
1. A summary of the most affected pages or patterns you notice.
2. Explanation of the possible causes of these broken links.
3. Technical and actionable steps the developer or webmaster should take to fix and prevent broken links in the future.
Be specific, concise, and professional in your tone.


AT THE END 
Prepared by:
CMO ON THE GO
Date: ${currentDate}

`;

    // 3. Call OpenAI
    const response = await openai.chat.completions.create({
      model: model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: max_tokens
    });

    const llmOutput = response.choices?.[0]?.message?.content;
        const htmlBody = marked(llmOutput ?? "");
    
    // Add CSS for table styling
    const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>LLM Response</title>
      <style>
        table, th, td {
          border: 1px solid black;
          border-collapse: collapse;
          padding: 8px;
        }
        th {
          background-color: #f2f2f2;
        }
        body {
          font-family: sans-serif;
          padding: 20px;
        }
      </style>
    </head>
    <body>
      ${htmlBody}
    </body>
    </html>
    `;

    await prisma.llm_responses.upsert({
          where: { website_id },
          update: {
            brand_audit: fullHtml,
          },
          create: {
            website_id,
            brand_audit: fullHtml,
          },
        });
     
    return ({
      success: true,
      website_id,
      analysis_id: website_analysis_id,
      report: fullHtml,
    });
  } catch (err: any) {
    console.error("❌ Broken Link Audit Error:", err);
    return ({
      success: false,
      error: "Failed to generate broken link audit report.",
      detail: err?.message || "Internal server error",
    });
  }
};
