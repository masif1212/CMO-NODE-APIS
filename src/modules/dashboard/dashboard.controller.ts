import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import * as cheerio from "cheerio";


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
        {social_media_analysis:  {not:null}},
        // { recommendation_by_mo1: { not: null } },
        // { recommendation_by_mo2: { not: null } },
        // {competitor_analysis:{not:null}},
        // { recommendation_by_mo3: { not: null } },
        {recommendation_by_cmo:  {not:null}}  
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
      social_media_analysis:true,
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

    return res.status(200).json({
      success: true,
      data: {
        brand_audit,
        competitorWebsites
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
  schema_analysis?: any; // Flexible type, replace with specific structure if known
}

interface MoRecommendation {
  id: string;
  website_id: string;
  recommendation_by_mo_dashboard1?: any;
  recommendation_by_mo_dashboard2?: any;
  recommendation_by_mo_dashboard3?: any;
  dashboard3_competi_camparison?: any;
}

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

    const responseData: Record<string, any> = {};
    const website_health: Record<string, any> = {};
    const seo_health: Record<string, any> = {};
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
        page_title: true,
        homepage_alt_text_coverage: true,
        raw_html: true,
      },
    });

    // ---------- PageSpeed / Website Health ----------
    if (analysisStatus.website_audit != null) {
      pageSpeedData = await prisma.brand_website_analysis.findUnique({
        where: { website_analysis_id: analysisStatus.website_audit },
        select: {
          performance_score: true,
          seo_score: true,
          accessibility_score: true,
          best_practices_score: true,
          revenue_loss_percent: true,
          total_blocking_time: true,
          first_contentful_paint: true,
          cumulative_layout_shift: true,
          speed_index: true,
          largest_contentful_paint: true,
          time_to_interactive: true,
          broken_links: true,
          total_broken_links: true,
          audit_details: true,
        },
      });

      if (pageSpeedData) {
        const auditDetails = typeof pageSpeedData.audit_details === "string"
          ? JSON.parse(pageSpeedData.audit_details)
          : pageSpeedData.audit_details;

        website_health.revenueLossPercent = pageSpeedData.revenue_loss_percent ?? 0;
        website_health.seo_revenue_loss_percentage = 0;
        website_health.ctr_loss_percent = scrapedData?.ctr_loss_percent;

        website_health.categories = {
          performance_insight: pageSpeedData.performance_score ?? 0,
          seo: pageSpeedData.seo_score ?? 0,
          accessibility: pageSpeedData.accessibility_score ?? 0,
          best_practices: pageSpeedData.best_practices_score ?? 0,
        };

    website_health.speed_health = {
      total_blocking_time: {
        display_value: pageSpeedData.total_blocking_time ?? "N/A",
        score: auditDetails?.metrics?.total_blocking_time?.score ?? null,
      },
      first_contentful_paint: {
        display_value: pageSpeedData.first_contentful_paint ?? "N/A",
        score: auditDetails?.metrics?.first_contentful_paint?.score ?? null,
      },
      speed_index: {
        display_value: pageSpeedData.speed_index ?? "N/A",
        score: auditDetails?.metrics?.speed_index?.score ?? null,
      },
      largest_contentful_paint: {
        display_value: pageSpeedData.largest_contentful_paint ?? "N/A",
        score: auditDetails?.metrics?.largest_contentful_paint?.score ?? null,
      },
      interactive: {
        display_value: pageSpeedData.time_to_interactive ?? "N/A",
        score: auditDetails?.metrics?.interactive?.score ?? null,
      },
      cumulative_layout_shift: {
        display_value: pageSpeedData.cumulative_layout_shift ?? "N/A",
        score: auditDetails?.metrics?.cumulative_layout_shift?.score ?? null,
      },
    };
  } // <-- Add this closing brace to properly close the try block
}
if (pageSpeedData?.audit_details) {
  try {
    const auditDetails =
      typeof pageSpeedData.audit_details === "string"
        ? JSON.parse(pageSpeedData.audit_details)
        : pageSpeedData.audit_details;
    website_health.optimization_opportunities = auditDetails?.optimization_opportinuties || "None";
  } catch (error) {
    console.error("Error parsing audit_details:", error);
  }
}

    // ---------- Availability Tracker ----------
    if (scrapedData) {
      website_health.availability_tracker = {
        status_message: scrapedData.status_message ?? "Unknown",
        status_code: scrapedData.status_code ?? 0,
        ip_address: scrapedData.ip_address ?? "N/A",
        response_time_ms: scrapedData.response_time_ms ?? 0,
        logo: scrapedData.logo_url ?? null,
      };
    }

    // ---------- SEO Health (Traffic Analysis) ----------
    if (analysisStatus.seo_audit != null) {
      const traffic = await prisma.brand_traffic_analysis.findUnique({
        where: { traffic_analysis_id: analysisStatus.seo_audit },
        select: {
          total_visitors: true,
          organic_search: true,
          direct: true,
          referral: true,
          organic_social: true,
          unassigned: true,
          high_bounce_pages: true,
          top_countries: true,
          top_sources: true,
          top_browsers:true,
          top_devices:true,
          overall_bounce_rate: true,
          actionable_fix: true,
        },
      });

      if (traffic) {
        seo_health.traffic = {
          total_visitors: traffic.total_visitors ?? "N/A",
          unique_visitors: traffic.unassigned ?? "N/A",
          sources: {
            organic: traffic.organic_search ?? "N/A",
            direct: traffic.direct ?? "N/A",
            referral: traffic.referral ?? "N/A",
            social: traffic.organic_social ?? "N/A",
          },
          top_countries: traffic.top_countries ?? "N/A",
          bounce_rate: traffic.overall_bounce_rate ?? "N/A",
          high_bounce_pages: traffic.high_bounce_pages ?? [],
          actionable_fix: traffic.actionable_fix ?? [],
        };
      }
    }

    // ---------- Social Media Analysis ----------
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

      if (socialMediaData.length > 0) {
        responseData.social_media_analysis = socialMediaData;
      }
    }

    // ---------- Recommendations ----------
    const moRecommendations: MoRecommendation[] = [];
    const recommendation = await prisma.llm_responses.findUnique({
      where: { website_id: website_id },
      select: {
        id: true,
        website_id: true,
        recommendation_by_mo_dashboard1: true,
        recommendation_by_mo_dashboard2: true,
        recommendation_by_mo_dashboard3: true,
        dashboard3_competi_camparison: true,
        geo_llm: true, // Include geo_llm in the query
      },
    });

    if (recommendation) {
      const moFieldMap: { [key: string]: any } = {
        recommendation_by_mo1: recommendation.recommendation_by_mo_dashboard1,
        recommendation_by_mo2: recommendation.recommendation_by_mo_dashboard2,
        recommendation_by_mo3: recommendation.recommendation_by_mo_dashboard3,
      };

      for (const moField of ["recommendation_by_mo1", "recommendation_by_mo2", "recommendation_by_mo3"] as const) {
        if (analysisStatus[moField] && moFieldMap[moField]) {
          let parsedRecommendation: any = moFieldMap[moField];
          try {
            if (typeof parsedRecommendation === "string") {
              parsedRecommendation = JSON.parse(parsedRecommendation);
            }
          } catch (error) {
            console.error(`Error parsing ${moField}:`, error);
            // Keep as string if parsing fails
          }

          moRecommendations.push({
            id: recommendation.id,
            website_id: recommendation.website_id,
            recommendation_by_mo_dashboard1: moField === "recommendation_by_mo1" ? parsedRecommendation : null,
            recommendation_by_mo_dashboard2: moField === "recommendation_by_mo2" ? parsedRecommendation : null,
            recommendation_by_mo_dashboard3: moField === "recommendation_by_mo3" ? parsedRecommendation : null,
            dashboard3_competi_camparison: recommendation.dashboard3_competi_camparison,
          });
        }
      }
    }

    // ---------- CMO Recommendation ----------
    let cmoRecommendation = null;
    if (analysisStatus.recommendation_by_cmo) {
      cmoRecommendation = await prisma.llm_responses.findUnique({
        where: { website_id: website_id }, // Updated to use website_id
        select: {
          id: true,
          website_id: true,
          recommendation_by_cmo: true,
        },
      });

      if (cmoRecommendation?.recommendation_by_cmo) {
        try {
          cmoRecommendation.recommendation_by_cmo =
            typeof cmoRecommendation.recommendation_by_cmo === "string"
              ? JSON.parse(cmoRecommendation.recommendation_by_cmo)
              : cmoRecommendation.recommendation_by_cmo;
        } catch (error) {
          console.error("Error parsing recommendation_by_cmo:", error);
          // Keep as string if parsing fails
        }
      }
    }

    // ---------- Geo Data ----------
// ---------- Geo Data ----------
const geo: GeoData = {};

// Parse geo_llm
if (recommendation?.geo_llm) {
  try {
    geo.AI_Discoverability = typeof recommendation.geo_llm === "string"
      ? JSON.parse(recommendation.geo_llm)
      : recommendation.geo_llm;
  } catch (error) {
    console.error("Error parsing geo_llm:", error);
    geo.AI_Discoverability = recommendation.geo_llm; // Fallback to raw string
  }
}

// Fetch top_sources from brand_traffic_analysis
let sources: any[] = [];
if (analysisStatus.seo_audit != null) {
  const traffic = await prisma.brand_traffic_analysis.findUnique({
    where: { traffic_analysis_id: analysisStatus.seo_audit },
    select: {
      top_sources: true, // Add top_sources to the select
    },
  });

  sources = traffic?.top_sources
    ? (typeof traffic.top_sources === "string"
        ? JSON.parse(traffic.top_sources)
        : traffic.top_sources) // Parse if stored as a string
    : [];
}

// Extract bing source
const bingSource = sources?.find((src) =>
  ["bing", "bing.com"].some((kw) => src.name?.toLowerCase().includes(kw))
) ?? { type: "source", name: "bing.com", sessions: 0 };

geo.bingSource = bingSource;



    // ---------- On Page Optimization ----------
    const onpage_opptimization: Record<string, any> = {};
    if (scrapedData) {
      onpage_opptimization.meta = {
        title: scrapedData.page_title || "N/A",
        meta_description: scrapedData.meta_description || "N/A",
      };

      try {
        let h1Text = "Not Found";
        if (scrapedData?.raw_html) {
          const $ = cheerio.load(scrapedData.raw_html);
          h1Text = $("h1").first().text().trim() || "Not Found";
        }
        onpage_opptimization.h1_text = { h1Text };
      } catch (error) {
        console.error("Error extracting <h1> from raw_html:", error);
        onpage_opptimization.h1_text = { h1: [], count: 0 };
      }
    }

    // ---------- Technical SEO ----------
    const technical_seo: Record<string, any> = {};
    if (pageSpeedData?.audit_details) {
      try {
        const auditDetails =
          typeof pageSpeedData.audit_details === "string"
            ? JSON.parse(pageSpeedData.audit_details)
            : pageSpeedData.audit_details;
        technical_seo.user_access_readiness = auditDetails?.user_access_readiness || "None";
      } catch (error) {
        console.error("Error parsing audit_details:", error);
      }
    }

    if (scrapedData?.schema_analysis) {
      try {
        technical_seo.schema_analysis = typeof scrapedData.schema_analysis === "string"
          ? JSON.parse(scrapedData.schema_analysis)
          : scrapedData.schema_analysis;
      } catch (error) {
        console.error("Error parsing schema_analysis:", error);
        technical_seo.schema_analysis = scrapedData.schema_analysis;
      }
    }

    if (pageSpeedData?.broken_links) {
      try {
        const Link_Health = typeof pageSpeedData.broken_links === "string"
          ? JSON.parse(pageSpeedData.broken_links)
          : pageSpeedData.broken_links;
        technical_seo.total_broken_links = pageSpeedData.total_broken_links ?? 0;
        technical_seo.broken_links = Link_Health?.broken_links ?? [];
      } catch (error) {
        console.error("Error parsing broken_links from pageSpeedData:", error);
        technical_seo.broken_links = [];
        technical_seo.total_broken_links = pageSpeedData.total_broken_links ?? 0;
      }
    } else {
      technical_seo.total_broken_links = pageSpeedData?.total_broken_links ?? 0;
      technical_seo.broken_links = [];
    }

    // ---------- Response Payload ----------
    

    const responsePayload: Record<string, any> = {
      success: true,
      website_health,
      seo_audit:{
      seo_health,
      onpage_opptimization,

      },
      
      technical_seo,
      geo,
      moRecommendations,
    };

    if (cmoRecommendation != null) {
      responsePayload.cmoRecommendation = cmoRecommendation;
    }

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error("Error fetching website detailed analysis:", error);
    return res.status(500).json({ error: "Server error" });
  }
};