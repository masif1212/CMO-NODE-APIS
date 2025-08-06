import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
 



export const getUserDashboard = async (req: Request, res: Response) => {
  const userId = req.query.user_id;

  if (typeof userId !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing user_id' });
  }

  try {
    // 🔹 Load service prices
    const analysisServices = await prisma.analysisServices.findMany();
    const reportPriceMap: Record<string, number> = Object.fromEntries(
      analysisServices.map(service => [service.report, service.price])
    );

    // 🔹 Field groups
    const brandFields = [
      'dashboard1_Freedata',
      'dashboard_paiddata',
      'strengthandissues_d1',
      'recommendationbymo1',
      'traffic_analysis_id',
    ];
    const socialFields = [
      'dashboard2_data',
      'strengthandissues_d2',
      'recommendationbymo2',
    ];
    const competitorFields = [
      'dashboard3_data',
      'recommendationbymo3',
    ];
    const cmoFields = ['cmorecommendation'];

    // 🔹 Aliases for field names (keys in response)
    const renameFields: Record<string, string> = {
      dashboard1_Freedata: 'website_audit',
      dashboard_paiddata: 'seo_audit',
      strengthandissues_d1: 'strength_and_issues',
      traffic_analysis_id: 'traffic_analysis',
      recommendationbymo1: 'recommendationbymo',

      dashboard2_data: 'social_data',
      strengthandissues_d2: 'social_issues',
      recommendationbymo2: 'recommendationbymo',

      dashboard3_data: 'competitor_data',
      recommendationbymo3: 'recommendationbymo',

      cmorecommendation: 'cmo_recommendation',
    };

    // 🔹 Fetch data
    const userWebsites = await prisma.user_websites.findMany({
      where: { user_id: userId },
      select: {
        website_url: true,
        website_id:true,
        report: {
          orderBy: { created_at: 'desc' },
          select: {
            report_id: true,
            created_at: true,
            updated_at: true,
            dashboard1_Freedata: true,
            dashboard_paiddata: true,
            strengthandissues_d1: true,
            recommendationbymo1: true,
            traffic_analysis_id: true,
            dashboard2_data: true,
            strengthandissues_d2: true,
            recommendationbymo2: true,
            dashboard3_data: true,
            recommendationbymo3: true,
            cmorecommendation: true,
          },
        },
      },
    });

    // 🔹 Output containers
    const brandAudit: any[] = [];
    const socialMedia: any[] = [];
    const competitorsAnalysis: any[] = [];
    const finalRecommendationByCMO: any[] = [];

    for (const site of userWebsites) {
      for (const report of site.report) {
        const base = {
          report_id: report.report_id,
          website_url: site.website_url,
          created_at: report.created_at,
          updated_at: report.updated_at,
        };

        const extractFields = (fields: string[]) => {
          const result: Record<string, number> = {};
          for (const key of fields) {
            const value = report[key as keyof typeof report];
            if (value != null) {
              const priceKey = key.startsWith('recommendationbymo') ? 'recommendationbymo' : key;
              if (reportPriceMap[priceKey]) {
                const renamed = renameFields[key] ?? key;
                result[renamed] = reportPriceMap[priceKey];
              }
            }
          }
          return result;
        };

        const brand = extractFields(brandFields);
        const social = extractFields(socialFields);
        const competitor = extractFields(competitorFields);
        const cmo = extractFields(cmoFields);

        if (Object.keys(brand).length) brandAudit.push({ ...base, columns: brand });
        if (Object.keys(social).length) socialMedia.push({ ...base, columns: social });
        if (Object.keys(competitor).length) competitorsAnalysis.push({ ...base, columns: competitor });
        if (Object.keys(cmo).length) finalRecommendationByCMO.push({ ...base, columns: cmo });
      }
    }

  const dashboardCounts = {
  total_brand_audit: brandAudit.length,
  total_social_media: socialMedia.length,
  total_competitor_analysis: competitorsAnalysis.length,
  total_cmo_recommendations: Array.isArray(finalRecommendationByCMO) 
    ? finalRecommendationByCMO.length 
    : (finalRecommendationByCMO ? 1 : 0)
};

    // 🔹 Return grouped response
    res.json({
      ...dashboardCounts,
      data: {
        brand_audit: brandAudit,

        social_media: socialMedia,
        competitors_analysis: competitorsAnalysis,
        recommendation_by_cmo: finalRecommendationByCMO,
      },
    });
  } catch (error) {
    console.error('❌ Error:', error);
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
    const websiteAudit = safeParse(reportData?.dashboard1_Freedata)?.full_report || null;
    const seoAuditData = safeParse(reportData?.dashboard_paiddata)?.dashboard_paiddata || {};
    const competitor_data = safeParse(reportData?.dashboard3_data)?.dashboardData || {};
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
      // recommendation_by_mo_dasboard1: safeParse(reportData?.recommendationbymo1),
      recommendation_by_mo_dashboard1 : {
      strengths_and_weaknness: safeParse(reportData?.strengthandissues_d1),
      recommendations: safeParse(reportData?.recommendationbymo1),
    },
      dashboard2_data: safeParse(reportData?.dashboard2_data),
      recommendation_by_mo_dashboard2: safeParse(reportData?.recommendationbymo2),
      competitors: competitor_data,
      recommendation_by_mo_dashboard3: safeParse(reportData?.recommendationbymo3),
      competitor_social_media_data: safeParse(reportData?.dashboard3_socialmedia),
      dashboard4_data: safeParse(reportData?.dashboard4_data),
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

export const getaudit = async (req: Request, res: Response) => {
  const website_id = req.query.website_id;

  if (typeof website_id !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing website_id' });
  }

  try {
    const brandFields = [
      'dashboard1_Freedata',
      'dashboard_paiddata',
      'strengthandissues_d1',
      'recommendationbymo1',
      'traffic_analysis_id',
    ];
    const socialFields = [
      'dashboard2_data',
      'strengthandissues_d2',
      'recommendationbymo2',
    ];
    const competitorFields = [
      'dashboard3_data',
      'recommendationbymo3',
    ];

    const renameFields: Record<string, string> = {
      dashboard1_Freedata: 'website_audit',
      dashboard_paiddata: 'seo_audit',
      strengthandissues_d1: 'strength_and_issues',
      traffic_analysis_id: 'traffic_analysis',
      recommendationbymo1: 'recommendationbymo',
      dashboard2_data: 'social_data',
      strengthandissues_d2: 'social_issues',
      recommendationbymo2: 'recommendationbymo',
      dashboard3_data: 'competitor_data',
      recommendationbymo3: 'recommendationbymo',
    };

    const userWebsites = await prisma.user_websites.findMany({
      where: { website_id: website_id },
      select: {
        website_url: true,
        website_id: true,
        report: {
          where: { cmorecommendation: null },
          orderBy: { created_at: 'desc' },
          select: {
            report_id: true,
            created_at: true,
            updated_at: true,
            scraped_data_id:true,
            dashboard1_Freedata: true,
            dashboard_paiddata: true,
            strengthandissues_d1: true,
            recommendationbymo1: true,
            traffic_analysis_id: true,
            dashboard2_data: true,
            strengthandissues_d2: true,
            recommendationbymo2: true,
            dashboard3_data: true,
            recommendationbymo3: true,
          },
        },
      },
    });
    
  

    const websites = await Promise.all(userWebsites.map(async (site) => {
  const brandAudit: any[] = [];
  const socialMedia: any[] = [];
  const competitorsAnalysis: any[] = [];

  for (const report of site.report) {
    const base = {
      report_id: report.report_id,
      created_at: report.created_at,
      updated_at: report.updated_at,
    };

    const hasAnyField = (fields: string[]) =>
      fields.some(field => report[field as keyof typeof report] != null);

    // 🔍 Fetch logo_url using scraped_data_id (if present)
    let logo_url: string | null = null;
    if (report.scraped_data_id) {
      const scraped = await prisma.website_scraped_data.findUnique({
        where: { scraped_data_id: report.scraped_data_id },
        select: { logo_url: true },
      });
      logo_url = scraped?.logo_url || null;
    }

    const reportWithLogo = {
      ...base,
      logo_url,
    };

    if (hasAnyField(brandFields)) {
      brandAudit.push(reportWithLogo);
    }

    if (hasAnyField(socialFields)) {
      socialMedia.push(reportWithLogo);
    }

    if (hasAnyField(competitorFields)) {
      competitorsAnalysis.push(reportWithLogo);
    }
  }

  if (brandAudit.length || socialMedia.length || competitorsAnalysis.length) {
    return {
      website_url: site.website_url,
      website_id: site.website_id,
      reports: {
        brand_audit: brandAudit,
        social_media_audit: socialMedia,
        competitors_analysis: competitorsAnalysis,
      },
    };
  }

  return null; }) .filter((site): site is NonNullable<typeof site> => site !== null));

    res.json({ websites });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
