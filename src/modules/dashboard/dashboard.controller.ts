import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();





export const getUserDashboard = async (req: Request, res: Response) => {
  const userId = req.query.user_id;

  if (typeof userId !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing user_id' });
  }

  try {
    // 🔹 Fetch audit prices
    const servicePrices = await prisma.analysisServices.findMany();
    const priceMap = Object.fromEntries(
  servicePrices.map(s => [s.name, s.price.toNumber()])
);


    // 🔹 Fetch user's websites and reports
    const userWebsites = await prisma.user_websites.findMany({
      where: { user_id: userId },
      select: {
        website_id: true,
        website_url: true,
        website_name: true,
        website_type: true,
        created_at: true,
        updated_at: true,
        report: {
          orderBy: { created_at: 'desc' },
        },
      },
    });

    // 🔹 Field name mapping
    const renameFields = (report: any) => ({
      website_audit: !!report.dashborad1_Freedata,
      seo_audit: !!report.dashborad_paiddata,
      recommendationbymo1: !!report.recommendationbymo1,
      data2: !!report.dashborad2_data,
      recommendationbymo2: !!report.recommendationbymo2,
      competitor_analysis: !!report.dashborad3_data,
      recommendationbymo3: !!report.recommendationbymo3,
      data4: !!report.dashborad4_data,
      recommendationbycmo: !!report.cmorecommendation,
    });

    // 🔹 Extract audit prices
    const extractFieldPrices = (report: any) => {
      const prices: Record<string, number> = {};
      for (const field in report) {
        if (
          report[field] !== null &&
          typeof report[field] !== 'undefined' &&
          priceMap[field] !== undefined
        ) {
          prices[field] = priceMap[field];
        }
      }
      return prices;
    };

    // 🔹 Aggregate counters and collectors
    let totalWebsiteAudit = 0;
    let totalSeoAudit = 0;
    let totalRecommendationByCMO = 0;
    let totalCompetitorAnalysis = 0;

    const websitesWithWebsiteAudit: any[] = [];
    const websitesWithSeoAudit: any[] = [];
    const websitesWithRecommendationByCMO: any[] = [];
    const websitesWithCompetitorAnalysis: any[] = [];

    // 🔹 Process websites
    const filteredWebsites = userWebsites
      .map(site => {
        const validReports = site.report?.filter(r =>
          Object.values(renameFields(r)).some(Boolean)
        );

        if (!validReports?.length) return null;

        const formattedReports = validReports.map(report => {
          const fields = renameFields(report);
          const prices = extractFieldPrices(report);

          const auditMeta = {
            website_id: site.website_id,
            website_url: site.website_url,
            report_id: report.report_id,
            created_at: report.created_at,
            prices,
          };

          if (fields.website_audit) {
            totalWebsiteAudit++;
            websitesWithWebsiteAudit.push(auditMeta);
          }
          if (fields.seo_audit) {
            totalSeoAudit++;
            websitesWithSeoAudit.push(auditMeta);
          }
          if (fields.recommendationbycmo) {
            totalRecommendationByCMO++;
            websitesWithRecommendationByCMO.push(auditMeta);
          }
          if (fields.competitor_analysis) {
            totalCompetitorAnalysis++;
            websitesWithCompetitorAnalysis.push(auditMeta);
          }

          return {
            report_id: report.report_id,
            created_at: report.created_at,
            updated_at: report.updated_at,
            fields_present: fields,
            prices,
          };
        });

        return {
          website_id: site.website_id,
          website_url: site.website_url,
          website_name: site.website_name,
          website_type: site.website_type,
          created_at: site.created_at,
          updated_at: site.updated_at,
          total_reports: formattedReports.length,
          reports: formattedReports,
        };
      })
      .filter((site): site is NonNullable<typeof site> => !!site); // filter nulls with type guard

    // 🔹 Calculate total revenue from audits
    const totalRevenue = filteredWebsites.reduce((acc, site) => {
      return (
        acc +
        site.reports.reduce((rAcc: number, report) => {
          return rAcc + Object.values(report.prices).reduce((sum, price) => sum + price, 0);
        }, 0)
      );
    }, 0);

    // 🔹 Final result
    const result = {
      total_websites: filteredWebsites.length,
      total_website_audit: totalWebsiteAudit,
      total_seo_audit: totalSeoAudit,
      total_recommendationbycmo: totalRecommendationByCMO,
      total_competitor_analysis: totalCompetitorAnalysis,
      // total_revenue: totalRevenue,
      data: {
        brand_audit :{websites_with_website_audit: websitesWithWebsiteAudit,
        websites_with_seo_audit: websitesWithSeoAudit},
      
          
        cmoRecommendation: websitesWithRecommendationByCMO,
        competitorswebsites: websitesWithCompetitorAnalysis,
      },
    };

    res.json(result);
  } catch (error) {
    console.error('Error fetching user dashboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getWebsiteDetailedAnalysis = async (req: Request, res: Response) => {
  const reportId = req.query.report_id as string;

  if (!reportId) {
    return res.status(400).json({ error: 'Missing report_id' });
  }

  try {
    const reportData = await prisma.report.findUnique({
      where: { report_id: reportId },
      
    });

   

    // Parse and extract
    const websiteAudit = safeParse(reportData?.dashborad1_Freedata)?.full_report || null;
    const seoAuditData = safeParse(reportData?.dashborad_paiddata)?.dashboard_paiddata || {};
    const {
      traffic_analysis,
      onpage_optimization,
      technical_seo,
      ...otherSeoFields
    } = seoAuditData;

    const parsedReport = {
      website_audit: websiteAudit,
      ...(traffic_analysis && { traffic_analysis }),
      ...(onpage_optimization && { onpage_optimization }),
      ...(technical_seo && { technical_seo }),
      ...otherSeoFields,
      recommendation_by_mo_dasboard1: safeParse(reportData?.recommendationbymo1),
      dashborad2_data: safeParse(reportData?.dashborad2_data),
      recommendation_by_mo_dasboard2: safeParse(reportData?.recommendationbymo2),
      competitors: safeParse(reportData?.dashborad3_data),
      recommendation_by_mo_dasboard3: safeParse(reportData?.recommendationbymo3),
      dashborad4_data: safeParse(reportData?.dashborad4_data),
      recommendationbycmo: safeParse(reportData?.cmorecommendation),
      
    };

   
    res.json(parsedReport);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

function safeParse(input: any) {
  try {
    if (typeof input === 'string') return JSON.parse(input);
    return input ?? null;
  } catch {
    return null;
  }
}

