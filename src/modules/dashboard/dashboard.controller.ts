import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import * as cheerio from "cheerio";
import { any } from "zod";


export const getUserDashboard = async (req: Request, res: Response) => {
  const { user_id } = req.query;

  if (!user_id || typeof user_id !== "string") {
    return res.status(400).json({ error: "user_id is required as query param" });
  }

  try {
    // Group 1: Any of the main 5 audits (check for non-null string values)
    const brand_auditRaw = await prisma.analysis_status.findMany({
      where: {
        user_id: user_id as string,
        OR: [
          { website_audit: { not: null } },
          { seo_audit: { not: null } },
          { social_media_analysis: { not: null } },
          { recommendation_by_mo1: { not: null } },
          { recommendation_by_mo2: { not: null } },
          // {competitor_analysis:{not:null}},
          { recommendation_by_mo3: { not: null } },
          { recommendation_by_cmo: { not: null } }
        ]
      },
      orderBy: {
        updated_at: 'desc' // ✅ ORDER BY MOST RECENT
      },
      select: {
        id: true,
        website_id: true,
        updated_at: true,
        website_audit: true,
        seo_audit: true,
        social_media_analysis: true,
        competitor_details: true,
        recommendation_by_mo1: true,
        recommendation_by_mo2: true,
        recommendation_by_mo3: true,
        user_websites: {
          select: {
            website_url: true,
            website_scraped_data: {
              select: {
                page_title: true,
                // schema_analysis: true,
                // meta_description: true
              }
            }
          }
        }
      }
    });

    // Build analysis list based on non-null values
    const brand_audit = brand_auditRaw.map(site => {
      const analysisTypes: string[] = [];
      if (site.website_audit) analysisTypes.push("website_audit");
      if (site.social_media_analysis) analysisTypes.push("social_media_analysis");
      if (site.seo_audit) analysisTypes.push("seo_audit");
      if (site.competitor_details) analysisTypes.push("competitor_details");
      if (site.recommendation_by_mo1) analysisTypes.push("recommendation_by_mo1");
      if (site.recommendation_by_mo2) analysisTypes.push("recommendation_by_mo2");
      if (site.recommendation_by_mo3) analysisTypes.push("recommendation_by_mo3");

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
        competitor_details: { not: null }
      },
      orderBy: {
        updated_at: 'desc' // ✅ ORDER BY MOST RECENT
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
                meta_description: true
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


 // Fetch social media analysis websites
const socialMediaAnalysisRaw = await prisma.analysis_status.findMany({
  where: {
    user_id,
    social_media_analysis: { not: null }
  },
  orderBy: {
    updated_at: 'desc'
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
            meta_description: true
          }
        }
      }
    }
  }
});

const socialMediaAnalysis = socialMediaAnalysisRaw.map(site => ({
  id: site.id,
  website_id: site.website_id,
  updated_at: site.updated_at,
  website_url: site.user_websites?.website_url || null,
  page_title: site.user_websites?.website_scraped_data?.page_title || null
}));

// Fetch recommendation_by_cmo websites
const cmoRecommendationsRaw = await prisma.analysis_status.findMany({
  where: {
    user_id,
    recommendation_by_cmo: { not: null }
  },
  orderBy: {
    updated_at: 'desc'
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
            meta_description: true
          }
        }
      }
    }
  }
});

const cmoRecommendations = cmoRecommendationsRaw.map(site => ({
  id: site.id,
  website_id: site.website_id,
  updated_at: site.updated_at,
  website_url: site.user_websites?.website_url || null,
  page_title: site.user_websites?.website_scraped_data?.page_title || null
}));
   
    return res.status(200).json({
      success: true,
      data: {
        brand_audit,
        competitorWebsites,
        socialMediaAnalysis,
        cmoRecommendations
      }
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};


interface GeoData {
  AI_Discoverability?: any; // Flexible type, replace with specific structure if known
  bingSource?: { type: string; name: string; sessions: number };
  SearchBotcrawlability?: any;
 
}

// interface CompetitorAnalysis {
//   competitor_id: string;
//   name: string | null;
//   website_url: string | null;
//   industry: string | null;
//   region: string | null;
//   target_audience: string | null;
//   primary_offering: string | null;
//   usp: string | null;
//   page_title: string | null;
//   logo_url: string | null;
//   meta_description: string | null;
//   meta_keywords: string | null;
//   social_handles: {
//     twitter: string | null;
//     facebook: string | null;
//     instagram: string | null;
//     linkedin: string | null;
//     youtube: string | null;
//     tiktok: string | null;
//   };
//   ctr_loss_percent: any;
//   revenue_loss_percent: number | null;
//   schema_analysis: any;
//   page_speed: any;
//   other_links: any;
// }



export const getWebsiteDetailedAnalysis = async (req: Request, res: Response) => {
  const { website_id } = req.query;

  if (!website_id || typeof website_id !== "string") {
    return res.status(400).json({ error: "website_id is required as query param" });
  }

  try {
    const analysisStatus = await prisma.analysis_status.findFirst({
      where: { website_id },
      select: {
        website_audit: true,
        seo_audit: true,
        competitor_details: true,
        social_media_analysis: true,
        recommendation_by_mo1: true,
        recommendation_by_mo2: true,
        recommendation_by_mo3: true,
        recommendation_by_cmo: true,
      },
    });

    if (!analysisStatus) {
      return res.status(404).json({ error: "no data found" });
    }

    const responsePayload: Record<string, any> = { success: true };
    // const website_health: Record<string, any> = {};
    let traffic_anaylsis: Record<string, any> = {};
    let pageSpeedData: any = undefined;

    const scrapedData = await prisma.website_scraped_data.findUnique({
      where: { website_id },
      select: {
        status_message: true,
        status_code: true,
        ip_address: true,
        response_time_ms: true,
        logo_url: true,
        ctr_loss_percent: true,
        schema_analysis: true,
        meta_description: true,
        meta_keywords: true,
        page_title: true,
        homepage_alt_text_coverage: true,
        raw_html: true,
      },
    });

    // Fetch pageSpeedData (assuming it exists in the database)
   pageSpeedData = await prisma.brand_website_analysis.findFirst({
  where: { website_id },
  select: {
    audit_details: true,
    broken_links: true,
    total_broken_links: true,
  },
});

   

    // SEO Audit and Traffic Analysis
    if (analysisStatus.seo_audit != null) {
      const traffic = await prisma.brand_traffic_analysis.findFirst({
        where: { website_id },
      });
      if (traffic) {
        traffic_anaylsis = traffic;
      }
    }

    // Social Media Analysis
    let socialMediaData: any[] = [];
    if (analysisStatus.social_media_analysis != null) {
      socialMediaData = await prisma.brand_social_media_analysis.findMany({
        where: { website_id },
        select: {
          social_media_id: true,
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
        },
      });
      responsePayload.social_media_analysis = socialMediaData.length > 0 ? socialMediaData : [];
    }

    // Recommendations
    let recommendation = null;
    recommendation = await prisma.llm_responses.findUnique({
      where: { website_id },
      select: {
        id: true,
        website_id: true,
        dashboard3_competi_camparison: true,
        // recommendation_by_mo_dashboard1: true,
        recommendation_by_mo_dashboard2: true,
        recommendation_by_mo_dashboard3: true,
        geo_llm: true,
        // recommendation_by_cmo: true,
      },
    });

    function safeParse(jsonStr: any) {
      try {
        return typeof jsonStr === "string" ? JSON.parse(jsonStr) : jsonStr;
      } catch (e) {
        console.error("JSON parse failed:", e);
        return jsonStr;
      }
    }

    // On Page Optimization
    const onpage_opptimization: Record<string, any> = {};
    if (scrapedData) {
      onpage_opptimization.metaDataWithoutRawHtml = {
        page_title: scrapedData.page_title || "N/A",
        meta_description: scrapedData.meta_description || "N/A",
        meta_keywords: scrapedData.meta_keywords || "N/A",
        homepage_alt_text_coverage: scrapedData.homepage_alt_text_coverage || "N/A",
        status_message: scrapedData.status_code,
        ip_address: scrapedData.ip_address,
        response_time_ms: scrapedData.response_time_ms,
        status_code: scrapedData.status_code,
      };
      try {
        let h1Text = "Not Found";
        if (scrapedData?.raw_html) {
          const $ = cheerio.load(scrapedData.raw_html);
          h1Text = $("h1").first().text().trim() || "Not Found";
        }
        onpage_opptimization.h1Text = { h1Text };
      } catch (error) {
        console.error("Error extracting <h1> from raw_html:", error);
        onpage_opptimization.h1Text = { h1: [], count: 0 };
      }
    }

    // Technical SEO
    const technical_seo: Record<string, any> = {};
    if (pageSpeedData?.audit_details) {
      try {
        const auditDetails = safeParse(pageSpeedData.audit_details);
        technical_seo.user_access_readiness = auditDetails?.user_access_readiness || "None";
      } catch (error) {
        console.error("Error parsing audit_details:", error);
        technical_seo.user_access_readiness = "Not Available";
      }
    } else {
      technical_seo.user_access_readiness = "Not Available";
    }

    if (scrapedData?.schema_analysis) {
      try {
        technical_seo.Schema_Markup_Status = safeParse(scrapedData.schema_analysis);
      } catch (error) {
        console.error("Error parsing schema_analysis:", error);
        technical_seo.Schema_Markup_Status = scrapedData.schema_analysis;
      }
    }

    if (pageSpeedData?.broken_links) {
      try {
        const parsedBrokenLinks = safeParse(pageSpeedData.broken_links);
        const totalBroken = pageSpeedData.total_broken_links ?? parsedBrokenLinks?.broken_links?.length ?? 0;
        const brokenLinksResult = parsedBrokenLinks?.broken_links ?? [];
        technical_seo.Link_Health = {
          message: totalBroken ? "Broken links found and saved." : "No broken links found.",
          totalBroken,
          brokenLinks: brokenLinksResult,
        };
      } catch (error) {
        console.error("Error parsing broken_links from pageSpeedData:", error);
        technical_seo.Link_Health = {
          message: pageSpeedData?.total_broken_links ? "Broken links found and saved." : "No broken links found.",
          totalBroken: pageSpeedData?.total_broken_links ?? 0,
          brokenLinks: [],
        };
      }
    } else {
      technical_seo.Link_Health = {
        message: "No page speed data available",
        totalBroken: 0,
        brokenLinks: [],
      };
    }

    // Geo Data
    const geo: Record<string, any> = {};
    if (recommendation?.geo_llm) {
      geo.AI_Discoverability = safeParse(recommendation.geo_llm);
    }
    if (technical_seo.Schema_Markup_Status) {
      geo.SearchBotcrawlability = technical_seo.Schema_Markup_Status;
    }
    let sources: any[] = [];
    if (analysisStatus.seo_audit != null) {
      const traffic = await prisma.brand_traffic_analysis.findUnique({
        where: { traffic_analysis_id: analysisStatus.seo_audit },
        select: { top_sources: true },
      });
      sources = traffic?.top_sources ? safeParse(traffic.top_sources) : [];
    }
    geo.bingSource = sources.find((src) =>
      ["bing", "bing.com"].some((kw) => src.name?.toLowerCase().includes(kw))
    ) ?? { type: "source", name: "bing.com", sessions: 0 };

    // Add all non-null data to responsePayload
    if (analysisStatus.website_audit != null) {
      responsePayload.website_audit = safeParse(analysisStatus.website_audit);
    }
    if (traffic_anaylsis && Object.keys(traffic_anaylsis).length > 0) {
      responsePayload.traffic_anaylsis = traffic_anaylsis;
      responsePayload.onpage_opptimization = onpage_opptimization;
      responsePayload.technical_seo = technical_seo;
      responsePayload.geo = geo;
    }

    if (analysisStatus.competitor_details != null) {
      responsePayload.competitors = safeParse(analysisStatus?.competitor_details);
    }
    if (analysisStatus?.recommendation_by_mo1 != null) {
      responsePayload.recommendation_by_mo_dashboard1 = safeParse(analysisStatus.recommendation_by_mo1);
    }
    if (analysisStatus?.recommendation_by_mo2 != null) {
      responsePayload.recommendation_by_mo_dashboard2 = safeParse(analysisStatus.recommendation_by_mo2);
    }
    if (analysisStatus?.recommendation_by_mo3 != null) {
      responsePayload.recommendation_by_mo_dashboard3 = safeParse(analysisStatus.recommendation_by_mo3);
    }
    if (analysisStatus?.recommendation_by_cmo != null) {
      responsePayload.cmo_recommendation = safeParse(analysisStatus.recommendation_by_cmo);
    }

    // Add traffic-related data only if traffic_anaylsis is non-empty


    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error("Error fetching website detailed analysis:", error);
    return res.status(500).json({ error: "Server error" });
  }
};