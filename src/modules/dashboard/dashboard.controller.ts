import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getUserDashboard = async (req: Request, res: Response) => {
  const { user_id } = req.query;

  if (!user_id || typeof user_id !== "string") {
    return res.status(400).json({ error: "user_id is required as query param" });
  }

  try {
    // Group 1: Any of the main 5 audits (check for non-null string values)
    const analysisWebsitesRaw = await prisma.analysis_status.findMany({
      where: {
        user_id,
        OR: [
          { pagespeed_analysis: { not: null } },
          { social_media_analysis: { not: null } },
          { brand_audit: { not: null } },
          { traffic_analysis: { not: null } },
          { broken_links: { not: null } },
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
            website_scraped_data: {
              select: {
                page_title: true,
                schema_analysis: true,
                meta_description: true
              }
            }
          }
        }
      }
    });

    // Build analysis list based on non-null values
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
        competitor_analysis: { not: null }
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
                page_title: true,
                schema_analysis: true,
                meta_description: true,
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


export const getWebsiteDetailedAnalysis = async (req: Request, res: Response) => {
  const { website_id } = req.query;

  if (!website_id || typeof website_id !== "string") {
    return res.status(400).json({ error: "website_id is required as query param" });
  }

  try {
    const analysisStatus = await prisma.analysis_status.findFirst({
      where: { website_id },
      select: {
        pagespeed_analysis: true,
        broken_links: true,
        traffic_analysis: true,
        social_media_analysis: true,
        recommendation_by_mo1: true,
        recommendation_by_mo2: true,
        recommendation_by_mo3: true,
      },
    });

    if (!analysisStatus) {
      return res.status(404).json({ error: "No analysis status found for this website_id" });
    }

    const responseData: Record<string, any> = {};

    // --- PageSpeed Analysis ---
    if (analysisStatus.pagespeed_analysis) {
      const pageSpeedData = await prisma.brand_website_analysis.findUnique({
        where: { website_analysis_id: analysisStatus.pagespeed_analysis },
        select: {
          website_analysis_id: true,
          website_id: true,
          performance_score: true,
          seo_score: true,
          first_contentful_paint: true,
          largest_contentful_paint: true,
          accessibility_score: true,
          best_practices_score: true,
          pwa_score: true,
          total_blocking_time: true,
          speed_index: true,
          revenue_loss_percent: true,
          
        
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

    // --- Broken Links ---
    if (analysisStatus.broken_links) {
      if (responseData.pagespeed_analysis) {
        responseData.broken_links = {
          total_broken_links: responseData.pagespeed_analysis.total_broken_links,
          broken_links: responseData.pagespeed_analysis.broken_links,
        };
      } else {
        const brokenLinksData = await prisma.brand_website_analysis.findUnique({
          where: { website_analysis_id: analysisStatus.broken_links },
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

    // --- Traffic Analysis ---
    if (analysisStatus.traffic_analysis) {
      const trafficData = await prisma.brand_traffic_analysis.findUnique({
        where: { traffic_analysis_id: analysisStatus.traffic_analysis },
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

    // --- Social Media Analysis ---
    const socialMediaData = await prisma.brand_social_media_analysis.findMany({
  where: { website_id },
  select: {
    social_media_id: true,
    website_id: true,
    platform_name: true,
    followers: true,
    likes: true,
    comments: true,
    shares: true,
    videos_count: true,
    posts_count: true,
    postingFrequency: true,
    dailyPostingGraph: true, 
    engagement_rate: true,
    engagementToFollowerRatio: true,
    created_at: true,
    updated_at: true,
  },
});

if (socialMediaData.length > 0) {
  responseData.social_media_analysis = socialMediaData;
}

    // --- Recommendations by MO ---
    const moRecommendations = [];

    for (const moField of ["recommendation_by_mo1", "recommendation_by_mo2", "recommendation_by_mo3"] as const) {
      const recommendationId = analysisStatus[moField];
      if (recommendationId) {
        const recommendation = await prisma.llm_responses.findUnique({
          where: { id: recommendationId },
          select: {
            id: true,
            website_id: true,
            recommendation_by_cmo: true,
            recommendation_by_mo_dashboard1: true,
            recommendation_by_mo_dashboard2: true,
            recommendation_by_mo_dashboard3: true,
            geo_llm: true,
            dashboard1_what_working: true,
            dashboard2_what_working: true,
            dashboard3_competi_recommedation: true,
            dashboard3_competi_camparison: true,

            created_at: true,
            updated_at: true,
          },
        });
        if (recommendation) {
          moRecommendations.push(recommendation);
        }
      }
    }

    if (moRecommendations.length > 0) {
      responseData.recommendations_by_mo = moRecommendations;
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
