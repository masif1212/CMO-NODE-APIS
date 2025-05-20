// import { PrismaClient } from "@prisma/client";
// import OpenAI from "openai"; // ✅ Correct for openai v4+
// import { scrapeWebsite } from '../scraped_data/service';
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,

// });
// const prisma = new PrismaClient();

// export const createBrandAudit = async (websiteUrl: string, userId: string) => {
//   try {
//     const userWebsite = await prisma.user_websites.findFirst({
//       where: {
//         website_url: websiteUrl,
//         user_id: userId,
//       },
//       include: {
//         brand_traffic_analysis: true,
//         brand_website_analysis: true,
//         brand_social_media_analysis: true,
//         website_scraped_data: true,
//       },
//     });

//     if (!userWebsite) {
//       throw new Error("Website not found for this user.");
//     }
//     const websiteId = userWebsite.website_id;
//     // if (!userWebsite.website_scraped_data || userWebsite.website_scraped_data.length === 0) {
//     //   const { record, youtubeUrl } = await scrapeWebsite(websiteUrl, websiteId);
//     //       console.log("data scraped", record);
//     // }

//     if (!userWebsite.website_scraped_data || userWebsite.website_scraped_data.length === 0) {
//       const { record, youtubeUrl } = await scrapeWebsite(websiteId);
//       console.log("data scraped", record);

//       // Re-fetch the updated userWebsite with new scraped data
//       const updatedWebsite = await prisma.user_websites.findUnique({
//         where: {
//           website_id: websiteId,
//         },
//         include: {
//           website_scraped_data: true,
//         },
//       });

//       userWebsite.website_scraped_data = updatedWebsite?.website_scraped_data || [];
//     }

//     const trafficAnalysis = userWebsite.brand_traffic_analysis[0] || {};
//     const websiteAnalysis = userWebsite.brand_website_analysis[0] || {};
//     const socialMediaAnalysis = userWebsite.brand_social_media_analysis[0] || {};
//     const scrapedData = userWebsite.website_scraped_data[0] || {};

//     const auditData = {
//       websiteUrl,
//       userId,
//       date: new Date(),
//       trafficAnalysis: {
//         totalVisitors: trafficAnalysis.total_visitors || 0,
//         organicSearch: trafficAnalysis.organic_search || 0,
//         direct: trafficAnalysis.direct || 0,
//         referral: trafficAnalysis.referral || 0,
//         organicSocial: trafficAnalysis.organic_social || 0,
//         unassigned: trafficAnalysis.unassigned || 0,
//         bounceRate: trafficAnalysis.overall_bounce_rate || 0,
//         actionableFix: trafficAnalysis.actionable_fix || "",
//         topCountries: trafficAnalysis.top_countries || [],
//       },
//       websiteAnalysis: {
//         performanceScore: websiteAnalysis.performance_score || 0,
//         seoScore: websiteAnalysis.seo_score || 0,
//         brokenLinks: websiteAnalysis.total_broken_links || 0,
//         brokenLinksDetails: websiteAnalysis.broken_links || [],
//         speedIndex: websiteAnalysis.speed_index || "",
//         timeToInteractive: websiteAnalysis.time_to_interactive || "",
//       },
//       socialMediaAnalysis: {
//         platform: socialMediaAnalysis.platform_name || "",
//         followers: socialMediaAnalysis.followers || 0,
//         likes: socialMediaAnalysis.likes || 0,
//         comments: socialMediaAnalysis.comments || 0,
//         shares: socialMediaAnalysis.shares || 0,
//         videosCount: socialMediaAnalysis.videos_count || 0,
//         postsCount: socialMediaAnalysis.posts_count || 0,
//         engagementRate: socialMediaAnalysis.engagement_rate || 0,
//       },
//       scrapedData: {
//         pageTitle: scrapedData.page_title || "",
//         metaDescription: scrapedData.meta_description || "",
//         metaKeywords: scrapedData.meta_keywords || "",
//         ogTitle: scrapedData.og_title || "",
//         ogDescription: scrapedData.og_description || "",
//         ogImage: scrapedData.og_image || "",
//         twitterHandle: scrapedData.twitter_handle || "",
//         facebookHandle: scrapedData.facebook_handle || "",
//         instagramHandle: scrapedData.instagram_handle || "",
//         linkedinHandle: scrapedData.linkedin_handle || "",
//         youtubeHandle: scrapedData.youtube_handle || "",
//         tiktokHandle: scrapedData.tiktok_handle || "",
//       },
//     };

//     // Prepare the prompt for the LLM
//     const systemPrompt = `You are a marketing and branding expert creating detailed brand audit summaries.`;
//     const userPrompt = `
// Here's a brand audit data for the website: ${websiteUrl}.

// Traffic:
// - Total Visitors: ${auditData.trafficAnalysis.totalVisitors}
// - Organic Search: ${auditData.trafficAnalysis.organicSearch}
// - Direct: ${auditData.trafficAnalysis.direct}
// - Referral: ${auditData.trafficAnalysis.referral}
// - Organic Social: ${auditData.trafficAnalysis.organicSocial}
// - Bounce Rate: ${auditData.trafficAnalysis.bounceRate}
// - Actionable Fix: ${auditData.trafficAnalysis.actionableFix}
// - Top Countries: ${(Array.isArray(auditData.trafficAnalysis.topCountries)
//   ? auditData.trafficAnalysis.topCountries.join(", ")
//   : "")}

// Website:
// - Performance Score: ${auditData.websiteAnalysis.performanceScore}
// - SEO Score: ${auditData.websiteAnalysis.seoScore}
// - Broken Links: ${auditData.websiteAnalysis.brokenLinks}
// - Speed Index: ${auditData.websiteAnalysis.speedIndex}
// - Time To Interactive: ${auditData.websiteAnalysis.timeToInteractive}

// Social Media:
// - Platform: ${auditData.socialMediaAnalysis.platform}
// - Followers: ${auditData.socialMediaAnalysis.followers}
// - Engagement Rate: ${auditData.socialMediaAnalysis.engagementRate}

// Scraped Metadata:
// - Page Title: ${auditData.scrapedData.pageTitle}
// - Meta Description: ${auditData.scrapedData.metaDescription}

// Please write a clear and concise brand audit summary with insights and suggestions.
// `;

//     const gptResponse = await openai.chat.completions.create({
//       model: "gpt-4-turbo",
//       messages: [
//         { role: "system", content: systemPrompt },
//         { role: "user", content: userPrompt },
//       ],
//       temperature: 0.7,
//     });

//     // const brandAuditSummary = gptResponse.data.choices[0].message?.content;
//     const brandAuditSummary = gptResponse.choices[0].message?.content;


//     return {
//       ...auditData,
//       summary: brandAuditSummary,
//     };
//   } catch (error) {
//     console.error("Error generating brand audit:", error);
//     throw new Error("Failed to generate brand audit");
//   }
// };

