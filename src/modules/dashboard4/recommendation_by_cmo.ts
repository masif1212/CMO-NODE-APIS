
import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const model = process.env.OPENAI_MODEL || "gpt-4.1";
const prisma = new PrismaClient();

interface CMOReport {
  website_id: string;
  // executive_summary: string;
  // website_performance: string;
  // social_media_insights: string;
  // competitive_positioning: string;
  // strategic_recommendations: string;
  // reportContent: string;
  
  created_at: Date;
  updated_at: Date;
  reportContent: string;
}

export async function generateCMOReport(website_id: string): Promise<CMOReport> {
  try {
    // Fetch website audit data
    const websiteAudit = await prisma.brand_traffic_analysis.findFirst({
      where: { website_id },
      select: {
        total_visitors: true,
        organic_search: true,
        direct: true,
        referral: true,
        organic_social: true,
        overall_bounce_rate: true,
        avg_session_duration: true,
        engagement_rate: true,
        top_countries: true,
        top_devices: true,
        top_sources: true,
        actionable_fix: true,
      },
    });

    const websiteScrapedData = await prisma.website_scraped_data.findFirst({
      where: { website_id },
      select: {
        page_title: true,
        meta_description: true,
        meta_keywords: true,
        ctr_loss_percent: true,
        homepage_alt_text_coverage: true,
        status_code: true,
        response_time_ms: true,
        schema_analysis: true,
      },
    });

    // Fetch social media audit data
    const socialMediaAnalysis = await prisma.brand_social_media_analysis.findMany({
      where: { website_id },
      select: {
        platform_name: true,
        followers: true,
        engagement_rate: true,
        engagementToFollowerRatio: true,
        postingFrequency: true,
        posts_count: true,
      },
    });

    // Fetch competitor analysis data
    const competitorAnalysis = await prisma.competitor_data.findMany({
      where: { website_id },
      select: {
        // domain_authority: true, // Removed because it does not exist in the schema
        website_id: true,
        website_url: true,
        meta_keywords: true,
        meta_description: true,
        page_title: true,
        page_speed: true,
        linkedin_handle: true,
        facebook_handle: true,
        instagram_handle: true,
        twitter_handle: true,
        youtube_handle: true,
        tiktok_handle: true,
        og_image: true,
        og_description: true,
        og_title: true,

      },
    });

    const competitorDetails = await prisma.competitor_details.findMany({
      where: { website_id },
      select: {
        name: true,
         competitor_website_url: true,
        industry: true,
        region: true,
        target_audience: true,
        usp: true,
        primary_offering: true,
      },
    });

    // Fetch existing recommendations
    const existingRecommendations = await prisma.llm_responses.findFirst({
      where: { website_id },
      select: {
        dashboard1_what_working: true,
        dashboard2_what_working: true,
        dashboard3_competi_camparison: true,
      },
    });

    // Prepare data for OpenAI prompt
    const prompt = `
      You are a Chief Marketing Officer (CMO) tasked with generating a comprehensive strategic report based on the following data for a website (ID: ${website_id}). Create a detailed report with the following sections: Executive Summary, Website Performance Analysis, Social Media Insights, Competitive Positioning, and Strategic Recommendations. Use the provided data and existing recommendations to craft actionable, high-level insights suitable for a CMO.

      **Website Audit Data:**
      - Total Visitors: ${websiteAudit?.total_visitors ?? 'N/A'}
      - Organic Search: ${websiteAudit?.organic_search ?? 'N/A'}
      - Direct Traffic: ${websiteAudit?.direct ?? 'N/A'}
      - Referral Traffic: ${websiteAudit?.referral ?? 'N/A'}
      - Organic Social: ${websiteAudit?.organic_social ?? 'N/A'}
      - Bounce Rate: ${websiteAudit?.overall_bounce_rate ?? 'N/A'}%
      - Avg Session Duration: ${websiteAudit?.avg_session_duration ?? 'N/A'} seconds
      - Engagement Rate: ${websiteAudit?.engagement_rate ?? 'N/A'}%
      - Top Countries: ${JSON.stringify(websiteAudit?.top_countries) ?? 'N/A'}
      - Top Devices: ${JSON.stringify(websiteAudit?.top_devices) ?? 'N/A'}
      - Top Sources: ${JSON.stringify(websiteAudit?.top_sources) ?? 'N/A'}
      - Actionable Fixes: ${websiteAudit?.actionable_fix ?? 'N/A'}
      - Page Title: ${websiteScrapedData?.page_title ?? 'N/A'}
      
      - Meta Description: ${websiteScrapedData?.meta_description ?? 'N/A'}
      - Meta Keywords: ${websiteScrapedData?.meta_keywords ?? 'N/A'}
      
    
      - CTR Loss: ${JSON.stringify(websiteScrapedData?.ctr_loss_percent) ?? 'N/A'}
      - Homepage Alt Text Coverage: ${websiteScrapedData?.homepage_alt_text_coverage ?? 'N/A'}%

      **Social Media Audit Data:**
      ${socialMediaAnalysis
        .map(
          (platform) => `
        - Platform: ${platform.platform_name}
          - Followers: ${platform.followers ?? 'N/A'}
          - Engagement Rate: ${platform.engagement_rate ?? 'N/A'}%
          - Engagement to Follower Ratio: ${platform.engagementToFollowerRatio ?? 'N/A'}
          - Posting Frequency: ${platform.postingFrequency ?? 'N/A'} posts/day
          - Total Posts: ${platform.posts_count ?? 'N/A'}`
        )
        .join('\n')}

      **Competitor Analysis Data:**
      ${competitorAnalysis
        .map(
          (comp, index) => `
        - Competitor ${index + 1}:
          - competitor_website_url: ${comp.website_url ?? 'N/A'}
          - page_title: ${comp.page_title ?? 'N/A'}
          - meta_keywords: ${comp.meta_keywords ?? 'N/A'}
          - meta_description: ${comp.meta_description ?? 'N/A'}
          - og_image: ${comp.og_image ?? 'N/A'}
          - og_title: ${comp.og_title ?? 'N/A'}
          - og_description: ${comp.og_description ?? 'N/A'}
          - linkedin_handle: ${comp.linkedin_handle ?? 'N/A'}
          - facebook_handle: ${comp.facebook_handle ?? 'N/A'}
          - instagram_handle: ${comp.instagram_handle ?? 'N/A'}
          - twitter_handle: ${comp.twitter_handle ?? 'N/A'}
          - youtube_handle: ${comp.youtube_handle ?? 'N/A'}
          - tiktok_handle: ${comp.tiktok_handle ?? 'N/A'}
          - page_speed: ${comp.page_speed ?? 'N/A'}
          
         
          
          
        `
        )
        .join('\n')}
      
      **Competitor Details:**
      ${competitorDetails
        .map(
          (comp) => `
        - Name: ${comp.name ?? 'N/A'}
          - Website: ${comp.competitor_website_url ?? 'N/A'}
          - Industry: ${comp.industry ?? 'N/A'}
          - USP: ${comp.usp ?? 'N/A'}`
        )
        .join('\n')}

      **Existing Recommendations:**
      - Website Audit Recommendations: ${existingRecommendations?.dashboard1_what_working ?? 'N/A'}
      - Social Media Recommendations: ${existingRecommendations?.dashboard2_what_working ?? 'N/A'}
      - Competitor Analysis Recommendations: ${existingRecommendations?.dashboard3_competi_camparison ?? 'N/A'}

      **Instructions:**
      - Executive Summary: Summarize key findings and strategic priorities.
      - Website Performance Analysis: Highlight strengths, weaknesses, and opportunities based on traffic, engagement, and technical metrics.
      - Social Media Insights: Analyze performance across platforms, focusing on engagement and growth potential.
      - Competitive Positioning: Compare the website's performance against competitors and identify gaps.
      - Strategic Recommendations: Provide 3-5 high-level, actionable recommendations for the CMO, integrating insights from all dashboards and existing recommendations.
      - Use a professional tone suitable for a C-level executive.
    `;

    // Call OpenAI to generate the report
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: "You are a strategic marketing consultant generating a CMO-level report.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 1500,
      temperature: 0.7,
    });

    const reportContent = completion.choices[0].message.content ?? "Error generating report";

    // Parse the report into sections (assuming OpenAI returns structured markdown)
   
   

    // Store or update the report in the database
    const report = await prisma.llm_responses.upsert({
      where: { website_id },
      update: {
        recommendation_by_cmo: reportContent,
        updated_at: new Date(),
      },
      create: {
        website_id,
        recommendation_by_cmo: reportContent,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    return {
      website_id: report.website_id,
      reportContent : reportContent,
      created_at: report.created_at,
      updated_at: report.updated_at,
    };
  } catch (error) {
    console.error("Error generating CMO report:", error);
    throw new Error("Failed to generate CMO report");
  } finally {
    await prisma.$disconnect();
  }
}



