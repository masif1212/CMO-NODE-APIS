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
          { social_media_analysis: { not: null } },
          // { recommendation_by_mo1: { not: null } },
          // { recommendation_by_mo2: { not: null } },
          // {competitor_analysis:{not:null}},
          // { recommendation_by_mo3: { not: null } },
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

interface CompetitorAnalysis {
  competitor_id: string;
  name: string | null;
  website_url: string | null;
  industry: string | null;
  region: string | null;
  target_audience: string | null;
  primary_offering: string | null;
  usp: string | null;
  page_title: string | null;
  logo_url: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  social_handles: {
    twitter: string | null;
    facebook: string | null;
    instagram: string | null;
    linkedin: string | null;
    youtube: string | null;
    tiktok: string | null;
  };
  ctr_loss_percent: any;
  revenue_loss_percent: number | null;
  schema_analysis: any;
  page_speed: any;
  other_links: any;
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
        website_health.optimization_opportunities = auditDetails?.optimization_opportunities || "None";
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
    // if (analysisStatus.seo_audit != null) {
    //   const traffic = await prisma.brand_traffic_analysis.findUnique({
    //     where: { traffic_analysis_id: analysisStatus.seo_audit },
    //     select: {
    //       total_visitors: true,
    //       organic_search: true,
    //       direct: true,
    //       referral: true,
    //       organic_social: true,
    //       unassigned: true,
    //       high_bounce_pages: true,
    //       top_countries: true,
    //       top_sources: true,
    //       top_browsers: true,
    //       top_devices: true,
    //       overall_bounce_rate: true,
    //       actionable_fix: true,
    //     },
    //   });

    //   if (traffic) {
    //     traffic_anaylsis = {
    //       total_visitors: traffic.total_visitors ?? "N/A",
    //       unique_visitors: traffic.unassigned ?? "N/A",
    //       sources: {
    //         organic: traffic.organic_search ?? "N/A",
    //         direct: traffic.direct ?? "N/A",
    //         referral: traffic.referral ?? "N/A",
    //         social: traffic.organic_social ?? "N/A",
    //       },
    //       top_countries: traffic.top_countries ?? "N/A",
    //       bounce_rate: traffic.overall_bounce_rate ?? "N/A",
    //       high_bounce_pages: traffic.high_bounce_pages ?? [],
    //       actionable_fix: traffic.actionable_fix ?? [],
    //     };
    //   }
    // }


    if (analysisStatus.seo_audit != null) {
  const traffic = await prisma.brand_traffic_analysis.findUnique({
    where: { traffic_analysis_id: analysisStatus.seo_audit },
    // Select all columns by default
  });

  if (traffic) {
    traffic_anaylsis = traffic;
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
   

     let recommendation = null;
      recommendation = await prisma.llm_responses.findUnique({
        where: { website_id: website_id }, // Updated to use website_id
        select: {
          id: true,
          website_id: true,
          recommendation_by_mo_dashboard1:true,
          recommendation_by_mo_dashboard2:true,
          recommendation_by_mo_dashboard3:true,
          geo_llm:true,
          recommendation_by_cmo: true,
        },
      });


    function safeParse(jsonStr: any) {
  try {
    return typeof jsonStr === "string" ? JSON.parse(jsonStr) : jsonStr;
  } catch (e) {
    console.error("JSON parse failed:", e);
    return jsonStr; // fallback to raw string
  }
}




    // ---------- Competitor Analysis ----------
    // let competitorAnalysis: CompetitorAnalysis[] = [];
    // if (analysisStatus.competitor_details) {
    //   const competitors = await prisma.competitor_details.findMany({
    //     where: { website_id },
    //     select: {
    //       competitor_id: true,
    //       name: true,
    //       competitor_website_url: true,
    //       industry: true,
    //       region: true,
    //       target_audience: true,
    //       primary_offering: true,
    //       usp: true,
    //       competitor_data: {
    //         select: {
    //           website_url: true,
    //           page_title: true,
    //           logo_url: true,
    //           meta_description: true,
    //           meta_keywords: true,
    //           og_title: true,
    //           og_description: true,
    //           og_image: true,
    //           twitter_handle: true,
    //           facebook_handle: true,
    //           instagram_handle: true,
    //           linkedin_handle: true,
    //           youtube_handle: true,
    //           tiktok_handle: true,
    //           homepage_alt_text_coverage: true,
    //           ctr_loss_percent: true,
    //           revenue_loss_percent: true,
    //           schema_analysis: true,
    //           page_speed: true,
    //           other_links: true,
    //         },
    //       },
    //     },
    //     take: 3, // Limit to 3 competitors
    //   });

    //   competitorAnalysis = competitors.map((comp) => ({
    //     competitor_id: comp.competitor_id,
    //     name: comp.name ?? null,
    //     website_url: comp.competitor_website_url ?? comp.competitor_data?.website_url ?? null,
    //     industry: comp.industry ?? null,
    //     region: comp.region ?? null,
    //     target_audience: comp.target_audience ?? null,
    //     primary_offering: comp.primary_offering ?? null,
    //     usp: comp.usp ?? null,
    //     page_title: comp.competitor_data?.page_title ?? null,
    //     logo_url: comp.competitor_data?.logo_url ?? null,
    //     meta_description: comp.competitor_data?.meta_description ?? null,
    //     meta_keywords: comp.competitor_data?.meta_keywords ?? null,
    //     social_handles: {
    //       twitter: comp.competitor_data?.twitter_handle ?? null,
    //       facebook: comp.competitor_data?.facebook_handle ?? null,
    //       instagram: comp.competitor_data?.instagram_handle ?? null,
    //       linkedin: comp.competitor_data?.linkedin_handle ?? null,
    //       youtube: comp.competitor_data?.youtube_handle ?? null,
    //       tiktok: comp.competitor_data?.tiktok_handle ?? null,
    //     },
    //     ctr_loss_percent: safeParse(comp.competitor_data?.ctr_loss_percent) ?? null,
    //     revenue_loss_percent: comp.competitor_data?.revenue_loss_percent ?? null,
    //     schema_analysis: safeParse(comp.competitor_data?.schema_analysis) ?? null,
    //     page_speed: safeParse(comp.competitor_data?.page_speed) ?? null,
    //     other_links: safeParse(comp.competitor_data?.other_links) ?? null,
    //   }));
    // }


    let competitorAnalysis: any[] = [];

if (analysisStatus.competitor_details) {
  const competitors = await prisma.competitor_details.findMany({
    where: { website_id },
    select: {
      competitor_id: true,
      name: true,
      competitor_website_url: true,
      industry: true,
      region: true,
      target_audience: true,
      primary_offering: true,
      usp: true,
      created_at: true,
      updated_at: true,
      competitor_data: {
        select: {
          website_url: true,
          page_title: true,
          logo_url: true,
          meta_description: true,
          meta_keywords: true,
          og_title: true,
          og_description: true,
          og_image: true,
          twitter_handle: true,
          facebook_handle: true,
          instagram_handle: true,
          linkedin_handle: true,
          youtube_handle: true,
          tiktok_handle: true,
          homepage_alt_text_coverage: true,
          ctr_loss_percent: true,
          revenue_loss_percent: true,
          schema_analysis: true,
          page_speed: true,
          other_links: true,
        },
      },
    },
    take: 3,
  });

  competitorAnalysis = competitors.map((comp) => ({
    competitor_id: comp.competitor_id,
    name: comp.name ?? null,
    website_url: comp.competitor_website_url ?? comp.competitor_data?.website_url ?? null,
    industry: comp.industry ?? null,
    region: comp.region ?? null,
    target_audience: comp.target_audience ?? null,
    primary_offering: comp.primary_offering ?? null,
    usp: comp.usp ?? null,
    created_at: comp.created_at,
    updated_at: comp.updated_at,
    page_title: comp.competitor_data?.page_title ?? null,
    logo_url: comp.competitor_data?.logo_url ?? null,
    meta_description: comp.competitor_data?.meta_description ?? null,
    meta_keywords: comp.competitor_data?.meta_keywords ?? null,
    og_description: comp.competitor_data?.og_description ?? null,
    og_title: comp.competitor_data?.og_title ?? null,
    og_image: comp.competitor_data?.og_image ?? null,
    social_handles: {
      twitter: comp.competitor_data?.twitter_handle ?? null,
      facebook: comp.competitor_data?.facebook_handle ?? null,
      instagram: comp.competitor_data?.instagram_handle ?? null,
      linkedin: comp.competitor_data?.linkedin_handle ?? null,
      youtube: comp.competitor_data?.youtube_handle ?? null,
      tiktok: comp.competitor_data?.tiktok_handle ?? null,
    },
    ctr_loss_percent: safeParse(comp.competitor_data?.ctr_loss_percent),
    revenue_loss_percent: comp.competitor_data?.revenue_loss_percent ?? null,
    schema_analysis: safeParse(comp.competitor_data?.schema_analysis),
    page_speed: safeParse(comp.competitor_data?.page_speed),
    other_links: safeParse(comp.competitor_data?.other_links),
  }));
}

// Transform into your final shape
const competitorsData = competitorAnalysis.reduce((acc, comp, i) => {
  acc[`competitor${i + 1}`] = {
    competitor_id: comp.competitor_id,
    website_id,
    name: comp.name,
    website_url: comp.website_url,
    industry: comp.industry,
    region: comp.region,
    target_audience: comp.target_audience,
    primary_offering: comp.primary_offering,
    usp: comp.usp,
    created_at: comp.created_at,
    updated_at: comp.updated_at,
    page_speed: comp.page_speed,
    meta_data: {
      page_title: comp.page_title,
      meta_keywords: comp.meta_keywords,
      meta_description: comp.meta_description,
      og_description: comp.og_description,
      og_title: comp.og_title,
      og_image: comp.og_image,
    },
    social_handles: comp.social_handles,
  };
  return acc;
}, {} as Record<string, any>);

// Fetch brand's own website data
// const [mainWebsiteScrapedData, mainWebsiteAnalysisData] = await Promise.all([
//   prisma.scraped_data.findFirst({ where: { website_id } }),
//   prisma.website_analysis.findFirst({ where: { website_id } }),
// ]);

// if (mainWebsiteScrapedData && mainWebsiteAnalysisData) {
//   competitorsData["mainWebsite"] = {
//     website: mainWebsiteScrapedData,
//     brandWebsiteAnalysis: mainWebsiteAnalysisData,
//   };
// }

    

       // ---------- On Page Optimization ----------
    const onpage_opptimization: Record<string, any> = {};
    if (scrapedData) {
      onpage_opptimization.metaDataWithoutRawHtml = {
        page_title: scrapedData.page_title || "N/A",
        meta_description: scrapedData.meta_description || "N/A",
        meta_keywords: scrapedData.meta_keywords || "N/A",
        homepage_alt_text_coverage : scrapedData.homepage_alt_text_coverage || "N/A",
        status_message : scrapedData.status_code,
        ip_address:scrapedData.ip_address,
        response_time_ms:scrapedData.response_time_ms,
        status_code : scrapedData.status_code
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


    // ---------- Technical SEO ----------



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
        geo.AI_Discoverability = recommendation.geo_llm;
        // geo.Schema_Markup_Status = scrapedData ? scrapedData.schema_analysis : undefined;
         // Fallback to raw string
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
        technical_seo.Schema_Markup_Status = typeof scrapedData.schema_analysis === "string"
          ? JSON.parse(scrapedData.schema_analysis)
          : scrapedData.schema_analysis;
      
          geo.SearchBotcrawlability = technical_seo.Schema_Markup_Status;

      } catch (error) {
        console.error("Error parsing schema_analysis:", error);
        technical_seo.Schema_Markup_Status = scrapedData.schema_analysis;
        geo.SearchBotcrawlability = scrapedData.schema_analysis;

      }
    }

    if (pageSpeedData?.broken_links) {
  try {
    const parsedBrokenLinks = typeof pageSpeedData.broken_links === "string"
      ? JSON.parse(pageSpeedData.broken_links)
      : pageSpeedData.broken_links;

    const totalBroken = pageSpeedData.total_broken_links ?? parsedBrokenLinks?.broken_links?.length ?? 0;
    const brokenLinksResult = parsedBrokenLinks?.broken_links ?? [];

    technical_seo.Link_Health = {
      message: totalBroken ? "Broken links found and saved." : "No broken links found.",
      totalBroken,
      brokenLinks: brokenLinksResult,
    };
  } catch (error) {
    console.error("Error parsing broken_links from pageSpeedData:", error);
    const totalBroken = pageSpeedData.total_broken_links ?? 0;
    technical_seo.Link_Health = {
      message: totalBroken ? "Broken links found and saved." : "No broken links found.",
      totalBroken,
      brokenLinks: [],
    };
  }
} else {
  const totalBroken = pageSpeedData?.total_broken_links ?? 0;
  technical_seo.Link_Health = {
    message: totalBroken ? "Broken links found and saved." : "No broken links found.",
    totalBroken,
    brokenLinks: [],
  };
}


    // ---------- Response Payload ----------


// ---------- Response Payload ----------

const onlyWebsiteAudit = analysisStatus.website_audit != null &&
  !analysisStatus.seo_audit &&
  !analysisStatus.social_media_analysis &&
  !analysisStatus.recommendation_by_mo1 &&
  !analysisStatus.recommendation_by_mo2 &&
  !analysisStatus.recommendation_by_mo3 &&
  !analysisStatus.recommendation_by_cmo;

if (onlyWebsiteAudit) {
  return res.status(200).json({
    success: true,
    website_health,
  });
}

const responsePayload: Record<string, any> = {
  success: true,
  website_health,
  traffic_anaylsis,
    
  onpage_opptimization,
  technical_seo,
  geo,
  // competitor_analysis: competitorAnalysis.length > 0 ? competitorAnalysis : undefined,

  competitors: Object.keys(competitorsData).length ? competitorsData : undefined,
};


if (recommendation?.recommendation_by_mo_dashboard1 != null) {
  responsePayload.recommendation_by_mo_dashboard1 = safeParse(recommendation.recommendation_by_mo_dashboard1);
}

if (recommendation?.recommendation_by_mo_dashboard2 != null) {
  responsePayload.recommendation_by_mo_dashboard2 = safeParse(recommendation.recommendation_by_mo_dashboard2);
}

if (recommendation?.recommendation_by_mo_dashboard3 != null) {
  responsePayload.recommendation_by_mo_dashboard3 = safeParse(recommendation.recommendation_by_mo_dashboard3);
}


if (recommendation && recommendation.recommendation_by_cmo != null) {
responsePayload.cmo_recommendation = recommendation.recommendation_by_cmo;
}

// if (cmo_recommendation != null) {
//   responsePayload.cmo_recommendation = cmo_recommendation;
// }

return res.status(200).json(responsePayload);
} catch (error) {
  console.error("Error fetching website detailed analysis:", error);
  return res.status(500).json({ error: "Server error" });
}
};
