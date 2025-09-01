// src/modules/legal_ai/controller.ts
import { fetchBrands } from './service';
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { safeParse } from "../../../utils/safeParse";

const prisma = new PrismaClient();

export const getLegalAIBrandsController = async (req: Request, res: Response) => {
  try {
    const { user_id, website_id, report_id } = req.body;
    // console.log('Received request with user_id:', user_id, 'and website_id:', website_id);
    if (!user_id || !website_id) {
      return res.status(400).json({ message: 'user_id and website_id are required' });
    }

    const report = await prisma.report.findUnique({
      where: { report_id: report_id }, // 'record_id' must be defined
    });

    console.log("fetching llm response...")
    const result = await fetchBrands(user_id, website_id, report);
    console.log("llm response", result)


    const responsePayload: Record<string, any> = { success: true };

    if (!report) throw new Error("Missing report object");

console.log("fetching data from db...")
    const [scrapedData, pageSpeedData, traffic] = await Promise.all([
      report?.scraped_data_id
        ? prisma.website_scraped_data.findUnique({
          where: { scraped_data_id: report.scraped_data_id },
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
            H1_text: true,
          },

        })
        : Promise.resolve(null),

      report?.website_analysis_id
        ? prisma.brand_website_analysis.findUnique({
          where: { website_analysis_id: report.website_analysis_id },
          select: {
            audit_details: true,
            broken_links: true,
            total_broken_links: true,
          },
        })
        : Promise.resolve(null),

      report?.traffic_analysis_id
        ? prisma.brand_traffic_analysis.findUnique({
          where: { traffic_analysis_id: report.traffic_analysis_id },
        })
        : Promise.resolve(null),
    ]);


    console.log("report.traffic_analysis_id", report.traffic_analysis_id)
    console.log("data fetch")

    
    // On Page Optimization
    const onpage_opptimization: Record<string, any> = {};
    if (scrapedData) {
      onpage_opptimization.metaDataWithoutRawHtml = {
        page_title: scrapedData.page_title || "N/A",
        meta_description: scrapedData.meta_description || "N/A",
        meta_keywords: scrapedData.meta_keywords || "N/A",
        homepage_alt_text_coverage: scrapedData.homepage_alt_text_coverage || "N/A",
        status_message: scrapedData.status_code,
        h1_text:scrapedData.H1_text || "N/A",
        ip_address: scrapedData.ip_address,
        response_time_ms: scrapedData.response_time_ms,
        status_code: scrapedData.status_code,
      };

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
    if (report?.geo_llm) {
      geo.AI_Discoverability = safeParse(report.geo_llm);
    }
    if (technical_seo.Schema_Markup_Status) {
      geo.SearchBotcrawlability = technical_seo.Schema_Markup_Status;
    }
    let sources: any[] = [];
    if (report?.traffic_analysis_id != null) {

      sources = traffic?.top_sources ? safeParse(traffic.top_sources) : [];
    }
    geo.bingSource = sources.find((src) =>
      ["bing", "bing.com"].some((kw) => src.name?.toLowerCase().includes(kw))
    ) ?? { type: "source", name: "bing.com", sessions: 0 };

    if (report?.dashboard1_Freedata != null) {
      responsePayload.website_audit = safeParse(report?.dashboard1_Freedata);
    }
    if (traffic && Object.keys(traffic).length > 0) {
      responsePayload.traffic_anaylsis = traffic;
      responsePayload.onpage_opptimization = onpage_opptimization;
      responsePayload.technical_seo = technical_seo;
      responsePayload.geo = geo;
    }




    const dashboard_paiddata = {
      traffic_anaylsis: traffic,
      onpage_opptimization,
      technical_seo,
      geo,
    };

    // Create a deep copy and remove technical_seo.user_access_readiness
    const datafor_llm = JSON.parse(JSON.stringify(dashboard_paiddata));


    if (datafor_llm?.traffic_anaylsis) {
      delete datafor_llm.technical_seo.user_access_readiness;
      delete datafor_llm.traffic_anaylsis.traffic_analysis_id;
      delete datafor_llm.traffic_anaylsis.daily_active_users;

      if (datafor_llm?.traffic_anaylsis?.top_sources) {
        datafor_llm.traffic_anaylsis.top_sources = datafor_llm.traffic_anaylsis.top_sources.slice(0, 5);
      }

      if (datafor_llm?.traffic_anaylsis?.high_bounce_pages) {
        datafor_llm.traffic_anaylsis.high_bounce_pages = datafor_llm.traffic_anaylsis.high_bounce_pages.slice(0, 5);
      }
    }


    const fullreport = {
      dashboard_paiddata,
      datafor_llm,
    };

    await prisma.report.upsert({
      where: {
        report_id: report?.report_id,
      },
      update: {
        website_id,
        dashboard_paiddata: JSON.stringify(fullreport), // existing field
      },
      create: {
        website_id,
        dashboard_paiddata: JSON.stringify(fullreport),

      },
    });


    const existing = await prisma.analysis_status.findFirst({
      where: { report_id }
    });

    if (existing) {
      await prisma.analysis_status.update({
        where: { id: existing.id },
        data: { website_id, onpageoptimization: true }
      });
    } else {
      await prisma.analysis_status.create({
        data: { report_id, website_id, onpageoptimization: true, user_id }
      });
    }

    if (result) {
      console.log('Fetched brands successfully');
    }
    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Internal server error' });
  }
};
