
import { PrismaClient } from "@prisma/client";
import { OpenAI } from "openai";
import * as cheerio from "cheerio"; 
// for Markdown to HTML conversion
const prisma = new PrismaClient();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = process.env.OPENAI_MODEL || "gpt-4.1";
const max_tokens = Number(process.env.MAX_TOKENS) || 3000; 

export const generateLLMCombinedAuditReport = async (website_id: string): Promise<string> => {
    const userWebsite = await prisma.user_websites.findUnique({
    where: { website_id: website_id },
    include: {
      analysis_status: true,
      brand_website_analysis: true,
      brand_traffic_analysis: true,
      brand_social_media_analysis: true,
      website_scraped_data: true,
    },
  });

  if (!userWebsite) throw new Error("Website not found");

  const status = userWebsite.analysis_status[0];
  if (!status) throw new Error("Analysis status not found");

  const scrapedData = userWebsite.website_scraped_data;
  const page = userWebsite.brand_website_analysis[0];
  if (!scrapedData) {
    throw new Error("No scraped metadata found for the provided website_id.");
  }

  let h1Text = "Not Found";
  if (scrapedData.raw_html) {
    const $ = cheerio.load(scrapedData.raw_html);
    h1Text = $("h1").first().text().trim() || "Not Found";
  }

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const systemPromptBase = `You are a senior marketing and technical audit expert responsible for generating human-readable, technically sound audit reports for developers, SEOs, and decision-makers.
For each section, provide:
- Clear explanations of each metric or data point
- Analysis of its implications for user experience, SEO, and marketing
- Specific, actionable recommendations and suggestions
- Prioritize critical issues and growth opportunities
\n\n`;

  const promptSections: string[] = [];

  // 🟢 Section 1: INTRO with detailed instruction
  const brandIntro = `
## 1. Introduction

This audit analyzes the brand presence, technical health, and marketing potential of the website: **${userWebsite.website_url}**

### Website Metadata Overview:
- Page Title: ${scrapedData.page_title || "N/A"}
- Meta Description: ${scrapedData.meta_description || "N/A"}
- Meta Keywords: ${scrapedData.meta_keywords || "N/A"}
- Open Graph Title: ${scrapedData.og_title || "N/A"}
- Open Graph Description: ${scrapedData.og_description || "N/A"}
- First H1 Tag: ${h1Text}

Based on this metadata, write a detailed introduction paragraph explaining the brand's likely purpose, content focus, and target audience. 
Include insights on how these metadata elements contribute to the website’s SEO, marketing positioning, and user engagement.
`;

  promptSections.push(brandIntro);

  // 🟢 Section 2: Website Technical Performance with explicit detailed analysis request
  if (status.pagespeed_analysis && page) {
    const pagespeedPrompt = `
## 2. Website Technical Performance

### Audit Scores:
- Performance: ${page.performance_score ?? "N/A"}
- SEO: ${page.seo_score ?? "N/A"}
- Accessibility: ${page.accessibility_score ?? "N/A"}
- Best Practices: ${page.best_practices_score ?? "N/A"}

### Core Web Vitals:
- First Contentful Paint: ${page.first_contentful_paint ?? "N/A"}
- Largest Contentful Paint: ${page.largest_contentful_paint ?? "N/A"}
- Total Blocking Time: ${page.total_blocking_time ?? "N/A"}
- Speed Index: ${page.speed_index ?? "N/A"}
- Cumulative Layout Shift: ${page.cumulative_layout_shift ?? "N/A"}
- Time to Interactive: ${page.time_to_interactive ?? "N/A"}

### Additional Findings:
- Missing Image Alts: ${page.missing_image_alts ?? "N/A"}
- Number of Broken Links: ${page.total_broken_links ?? 0}
- Broken Links:${page.broken_links ?? "N/A"}
\`\`\`json
${JSON.stringify(page.broken_links || [], null, 2)}S
\`\`\`

For each metric above:
- Explain what it measures and why it matters.
- Discuss its impact on user experience (UX), SEO, and website performance.
- Highlight any critical issues or red flags.
- Provide detailed, developer-friendly recommendations to improve each metric.
- Suggest prioritization of fixes and best practices for long-term health.
`;
    promptSections.push(pagespeedPrompt);
  }

  // 🟢 Section 3: Traffic Analysis with detailed analysis and recommendations
  const traffic = userWebsite.brand_traffic_analysis[0];
  if (status.traffic_analysis && traffic) {
    const trafficPrompt = `
## 3. Traffic Performance

### Traffic Data:
- Total Visitors: ${traffic.total_visitors ?? "N/A"}
- Organic Search: ${traffic.organic_search ?? "N/A"}
- Direct: ${traffic.direct ?? "N/A"}
- Referral: ${traffic.referral ?? "N/A"}
- Organic Social: ${traffic.organic_social ?? "N/A"}
- Bounce Rate: ${traffic.overall_bounce_rate ?? "N/A"}
- Actionable Fix: ${traffic.actionable_fix ?? "N/A"}

For each channel and data point:
- Explain the significance and what the numbers suggest about website traffic health.
- Analyze strengths and weaknesses in the traffic sources.
- Identify if the bounce rate is a concern and why.
- Provide specific, actionable recommendations per channel to increase quality traffic.
- Recommend  top-priority growth strategy with clear rationale.
`;
    promptSections.push(trafficPrompt);
  }

  // 🟢 Section 4: Social Media with detailed actionable insights
  interface SocialMediaAnalysis {
    platform_name: string;
    followers: number;
    likes: number;
    comments: number;
    shares: number;
    engagement_rate: number;
  }

  const socials = userWebsite.brand_social_media_analysis as SocialMediaAnalysis[];
  if (status.social_media_analysis && socials.length) {
    const socialPrompt = `
## 4. Social Media Presence

${socials
  .map(
    (s: SocialMediaAnalysis) => `**${s.platform_name}**
- Followers: ${s.followers}
-platform_name: ${s.platform_name}
- Likes: ${s.likes}
- Comments: ${s.comments}
- Shares: ${s.shares}
- Engagement Rate: ${s.engagement_rate}`
  )
  .join("\n\n")}

For each social media platform:
- Explain what the engagement and follower metrics imply about audience interaction.
- Highlight the strongest and weakest platforms.
- Offer 2–3 actionable strategies to boost reach, engagement, and conversion.
- Suggest improvements in posting frequency, content types, and timing for better performance.
`;
    promptSections.push(socialPrompt);
  }

  // ... rest of your code unchanged

  const userPrompt = `# Combined Brand & Technical Audit Report for ${userWebsite.website_url}\n\n${promptSections.join(
    "\n\n"
  )}\n\nPrepared by: CMO ON THE GO\nDate: ${currentDate}`;

  // ... API call and response handling unchanged

  console.log("🧠 Final User Prompt Sent to GPT:\n", userPrompt);

  const gptResponse = await openai.chat.completions.create({
    model:model,
    messages: [
      { role: "system", content: systemPromptBase },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: max_tokens,
  });

  const combinedAudit = gptResponse.choices[0].message?.content?.trim() || "";

  
  await prisma.llm_responses.upsert({
    where: { website_id},
    update: { brand_audit: combinedAudit },
    create: {
      website_id,
      brand_audit: combinedAudit,
    },
  });

  return combinedAudit;
};