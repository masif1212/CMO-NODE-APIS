import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getUserDashboard = async (req: Request, res: Response) => {
  const { user_id } = req.query;

  if (!user_id || typeof user_id !== "string") {
    return res.status(400).json({ error: "user_id is required as query param" });
  }

  try {
    // Group 1: Any of the main 5 audits
    const analysisWebsitesRaw = await prisma.analysis_status.findMany({
      where: {
        user_id,
        OR: [
          { pagespeed_analysis: true },
          { social_media_analysis: true },
          { brand_audit: true },
          { traffic_analysis: true },
          { broken_links: true },
        ]
      },
      select: {
        id: true,
        website_id: true,
        updated_at: true,
        pagespeed_analysis: true,
        social_media_analysis: true,
        brand_audit: true,
        traffic_analysis: true,
        broken_links: true,
        user_websites: {
          select: {
            website_url: true,
            // Include scraped data here:
            website_scraped_data: {
              select: {
                page_title: true
              }
            }
          }
        }
      }
    });

    // Process to only return true fields and add page_title
    const analysisWebsites = analysisWebsitesRaw.map(site => {
      const analysisTypes: string[] = [];
      if (site.pagespeed_analysis) analysisTypes.push("pagespeed_analysis");
      if (site.social_media_analysis) analysisTypes.push("social_media_analysis");
      if (site.brand_audit) analysisTypes.push("brand_audit");
      if (site.traffic_analysis) analysisTypes.push("traffic_analysis");
      if (site.broken_links) analysisTypes.push("broken_links");

      return {
        id: site.id,
        website_id: site.website_id,
        updated_at: site.updated_at,
        website_url: site.user_websites?.website_url || null,
        page_title: site.user_websites?.website_scraped_data?.page_title || null,
        enabled_analysis: analysisTypes
      };
    });

    const competitorWebsitesRaw = await prisma.analysis_status.findMany({
      where: {
        user_id,
        competitor_analysis: true
      },
      select: {
        id: true,
        website_id: true,
        updated_at: true,
        user_websites: {
          select: {
            website_url: true,
            website_scraped_data: {
              select: {
                page_title: true
              }
            }
          }
        }
      }
    });

    const competitorWebsites = competitorWebsitesRaw.map(site => ({
      id: site.id,
      website_id: site.website_id,
      updated_at: site.updated_at,
      website_url: site.user_websites?.website_url || null,
      page_title: site.user_websites?.website_scraped_data?.page_title || null
    }));

    return res.status(200).json({
      success: true,
      data: {
        analysisWebsites,
        competitorWebsites
      }
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};



 // Adjust the path if needed

export const getWebsiteDetailedAnalysis = async (req: Request, res: Response) => {
  const { website_id } = req.query;

  if (!website_id || typeof website_id !== "string") {
    return res.status(400).json({ error: "website_id is required as query param" });
  }

  try {
    // 1. Fetch analysis_status for this website_id
    const analysisStatus = await prisma.analysis_status.findFirst({
      where: { website_id },
      select: {
        pagespeed_analysis: true,
        broken_links: true,
        traffic_analysis: true,
      },
    });

    if (!analysisStatus) {
      return res.status(404).json({ error: "No analysis status found for this website_id" });
    }

    const responseData: Record<string, any> = {};

    // 2. If pagespeed_analysis is true, fetch full brand_website_analysis data
    if (analysisStatus.pagespeed_analysis) {
      const pageSpeedData = await prisma.brand_website_analysis.findFirst({
        where: { website_id },
        select: {
          website_analysis_id: true,
          website_id: true,
          performance_score: true,
          seo_score: true,
          missing_image_alts: true,
          first_contentful_paint: true,
          largest_contentful_paint: true,
          accessibility_score: true,
          best_practices_score: true,
          pwa_score: true,
          total_blocking_time: true,
          speed_index: true,
          cumulative_layout_shift: true,
          time_to_interactive: true,
          audit_details: true,
          created_at: true,
          updated_at: true,
          total_broken_links: true,
          broken_links: true,
        },
      });

      if (pageSpeedData) {
        responseData.pagespeed_analysis = pageSpeedData;
      }
    }

    // 3. If broken_links is true
    if (analysisStatus.broken_links) {
      if (responseData.pagespeed_analysis) {
        // Already fetched via pageSpeedData
        responseData.broken_links = {
          total_broken_links: responseData.pagespeed_analysis.total_broken_links,
          broken_links: responseData.pagespeed_analysis.broken_links,
        };
      } else {
        const brokenLinksData = await prisma.brand_website_analysis.findFirst({
          where: { website_id },
          select: {
            total_broken_links: true,
            broken_links: true,
          },
        });

        if (brokenLinksData) {
          responseData.broken_links = brokenLinksData;
        }
      }
    }

    // 4. If traffic_analysis is true
    if (analysisStatus.traffic_analysis) {
      const trafficData = await prisma.brand_traffic_analysis.findFirst({
        where: { website_id },
        select: {
          traffic_analysis_id: true,
          website_id: true,
          total_visitors: true,
          organic_search: true,
          direct: true,
          referral: true,
          organic_social: true,
          unassigned: true,
          high_bounce_pages: true,
          top_countries: true,
          overall_bounce_rate: true,
          actionable_fix: true,
          created_at: true,
          updated_at: true,
        },
      });

      if (trafficData) {
        responseData.traffic_analysis = trafficData;
      }
    }

    return res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("Error fetching website detailed analysis:", error);
    return res.status(500).json({ error: "Server error" });
  }
};



//   const { website_id } = req.query;

//   if (!website_id || typeof website_id !== "string") {
//     return res.status(400).json({ error: "website_id is required as query param" });
//   }

//   try {
//     // 1. Fetch analysis_status for this website_id
//     const analysisStatus = await prisma.analysis_status.findFirst({
//       where: { website_id },
//       select: {
//         pagespeed_analysis: true,
//         broken_links: true,
//         traffic_analysis: true,
//       },
//     });

//     if (!analysisStatus) {
//       return res.status(404).json({ error: "No analysis status found for this website_id" });
//     }

//     const responseData: any = {};

//     // 2. If pagespeed_analysis true, fetch full brand_website_analysis data
//     if (analysisStatus.pagespeed_analysis) {
//       const websiteAnalysis = await prisma.brand_website_analysis.findFirst({
//         where: { website_id },
//         select: {
//           website_analysis_id: true,
//           website_id: true,
//           performance_score: true,
//           seo_score: true,
//           missing_image_alts: true,
//           first_contentful_paint: true,
//           largest_contentful_paint: true,
//           accessibility_score: true,
//           best_practices_score: true,
//           pwa_score: true,
//           total_blocking_time: true,
//           speed_index: true,
//           cumulative_layout_shift: true,
//           time_to_interactive: true,
//           total_broken_links: true,
//           broken_links: true,
//           audit_details: true,
//           created_at: true,
//           updated_at: true,
//         },
//       });

//       responseData.websiteAnalysis = websiteAnalysis;
//     }

//     // 3. If broken_links true, return broken links specifically (already included in above but add separately if needed)
//     if (analysisStatus.broken_links && !responseData.websiteAnalysis) {
//       // If pagespeed_analysis was false, but broken_links true, fetch only broken links fields
//       const brokenLinksData = await prisma.brand_website_analysis.findFirst({
//         where: { website_id },
//         select: {
//           total_broken_links: true,
//           broken_links: true,
//         },
//       });
//       responseData.brokenLinks = brokenLinksData;
//     }

//     // 4. If traffic_analysis true, fetch data from brand_traffic_analysis
//     if (analysisStatus.traffic_analysis) {
//       const trafficAnalysis = await prisma.brand_traffic_analysis.findFirst({
//         where: { website_id },
//         select: {
//           traffic_analysis_id: true,
//           website_id: true,
//           total_visitors: true,
//           organic_search: true,
//           direct: true,
//           referral: true,
//           organic_social: true,
//           unassigned: true,
//           high_bounce_pages: true,
//           top_countries: true,
//           overall_bounce_rate: true,
//           actionable_fix: true,
//           created_at: true,
//           updated_at: true,
//         },
//       });
//       responseData.trafficAnalysis = trafficAnalysis;
//     }

//     return res.status(200).json({
//       success: true,
//       data: responseData,
//     });
//   } catch (error) {
//     console.error("Error fetching website detailed analysis:", error);
//     return res.status(500).json({ error: "Server error" });
//   }
// };