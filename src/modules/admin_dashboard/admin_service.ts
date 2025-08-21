import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();


const featureKeys = [
  'website_audit',
  'trafficanalysis',
  'seo_audit',
  'social_media_analysis',
  'competitors_analysis',
  'recommendationbymo1',
  'recommendationbymo2',
  'recommendationbymo3',
  'cmo_recommendation',
] as const;

type FeatureKey = typeof featureKeys[number];
const user_role= 'User'; // Replace with actual role ID for users


const priceKeyMap: Record<string, string> = {
  website_audit: "dashboard1_Freedata",
  seo_audit: "dashboard_paiddata",
  trafficanalysis: "traffic_analysis_id",
  social_media_analysis: "dashboard2_data",
  competitors_identification: "dashboard3_data",
  recommendationbymo1: "recommendationbymo",
  recommendationbymo2: "recommendationbymo",
  recommendationbymo3: "recommendationbymo",
  cmo_recommendation: "cmorecommendation",
};

export const getUserdata = async (req: Request, res: Response) => {
  try {
    // 🔹 Load all users with websites and analysis status
    const allUsers = await prisma.users.findMany({
      where: {
        user_roles: {
          some: {
            roles: {
              role_name: user_role
            }
          }
        }
      },
      include: {
        user_websites: {
          include: {
            analysis_status: {
              orderBy: { created_at: 'desc' }, // latest first
            },
          },
        },
      },
    });

    // 🔹 Load service prices + history for price lookup
    const analysisServices = await prisma.analysisServices.findMany({
      include: { AnalysisServiceHistory: true },
    });

    // Map of service -> sorted histories
    const serviceHistoryMap: Record<string, { price: number; updated_at: Date }[]> = {};
    for (const service of analysisServices) {
      const histories = [
        { price: service.price.toNumber(), updated_at: service.updated_at },
        ...service.AnalysisServiceHistory.map((h) => ({
          price: h.price.toNumber(),
          updated_at: h.created_at,
        })),
      ].sort((a, b) => a.updated_at.getTime() - b.updated_at.getTime());

      if (service.report) {
        serviceHistoryMap[service.report] = histories;
      }
    }

    // Helper to get historical price at a given date
    const getHistoricalPrice = (reportKey: string, createdAt: Date): number | null => {
      const histories = serviceHistoryMap[reportKey];
      if (!histories || histories.length === 0) return null;
      let applied = histories[0].price;
      for (const h of histories) {
        if (h.updated_at <= createdAt) applied = h.price;
        else break;
      }
      return applied;
    };

    // Feature counters
    let totalFreeUsers = 0;
    let totalPaidUsers = 0;
    let totalNoAuditUsers = 0;
    let totalAnalysisCount = 0;

    const featureCounts: Record<FeatureKey, number> = featureKeys.reduce(
      (acc, key) => ({ ...acc, [key]: 0 }),
      {} as Record<FeatureKey, number>
    );

    // Process users
    const users = allUsers.map(user => {
      let totalFreeAnalysis = 0;
      let totalPaidAnalysis = 0;
      let latestReportCreatedAt: Date | null = null;
      const reports: any[] = [];

      user.user_websites.forEach(website => {
        website.analysis_status.forEach(status => {
          totalAnalysisCount++;

          // Feature counters
          if (status.website_audit) featureCounts.website_audit++;
          if (status.trafficanaylsis) featureCounts.trafficanalysis++;
          if (status.onpageoptimization) featureCounts.seo_audit++;
          if (status.social_media_anaylsis) featureCounts.social_media_analysis++;
          if (status.competitors_identification) featureCounts.competitors_analysis++;
          if (status.recommendationbymo1) featureCounts.recommendationbymo1++;
          if (status.recommendationbymo2) featureCounts.recommendationbymo2++;
          if (status.recommendationbymo3) featureCounts.recommendationbymo3++;
          if (status.cmo_recommendation) featureCounts.cmo_recommendation++;

          // Free / Paid classification
          const isFreeAnalysis =
            status.website_audit &&
            !status.trafficanaylsis &&
            !status.onpageoptimization &&
            !status.offpageoptimization &&
            !status.social_media_anaylsis &&
            !status.competitors_identification &&
            !status.recommendationbymo1 &&
            !status.recommendationbymo2 &&
            !status.recommendationbymo3 &&
            !status.cmo_recommendation;

          const isPaidAnalysis =
            status.trafficanaylsis ||
            status.onpageoptimization ||
            status.offpageoptimization ||
            status.social_media_anaylsis ||
            status.competitors_identification ||
            status.recommendationbymo1 ||
            status.recommendationbymo2 ||
            status.recommendationbymo3 ||
            status.cmo_recommendation;

          if (isFreeAnalysis) totalFreeAnalysis++;
          if (isPaidAnalysis) totalPaidAnalysis++;

          // Latest report
          if (!latestReportCreatedAt || status.created_at > latestReportCreatedAt) {
            latestReportCreatedAt = status.created_at;
          }

          // Include only true fields
          const filteredStatus = Object.fromEntries(
            Object.entries(status).filter(([_, value]) => value === true)
          );

          // Add price info
          const pricedStatus: Record<string, any> = {};
          for (const key of Object.keys(filteredStatus)) {
   


            const priceKey = priceKeyMap[key] || key;
            const price = getHistoricalPrice(priceKey, status.created_at);
            pricedStatus[key] = { value: true, price };

          }

          reports.push({
            report_id: status.report_id,
            created_at: status.created_at,
            website_url: website.website_url,
            isPaidAnalysis,
            ...pricedStatus,
          });
        });
      });

      // Count user types
      if (totalPaidAnalysis > 0) totalPaidUsers++;
      else if (totalFreeAnalysis > 0) totalFreeUsers++;
      else totalNoAuditUsers++;

      // Sort reports
      reports.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const username =
        [user.first_name, user.last_name].filter(Boolean).join(' ') || 'N/A';

      return {
        user_id: user.user_id,
        email: user.email || 'N/A',
        Username: username,
        user_type: user.user_type || 'N/A',
        account_status: user.account_status || 'N/A',
        totalWebsites: user.user_websites.length,
        totalAnalysis: reports.length,
        totalFreeAnalysis,
        totalPaidAnalysis,
        createdAt: user.created_at,
        lastlogin: user.last_login,
        latestReportCreatedAt,
        reports,
      };
    });

    // Sort users by latest report
    const sortedUsers = users.sort((a, b) => {
      const dateA = a.latestReportCreatedAt as unknown as Date;
      const dateB = b.latestReportCreatedAt as unknown as Date;
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateB.getTime() - dateA.getTime();
    });

    // Feature usage %
    const totalFeatureUsage = featureKeys.reduce(
      (sum, key) => sum + featureCounts[key],
      0
    );

    const featureUsageDistribution = {
      totalAnalysis: totalAnalysisCount,
      ...featureKeys.reduce((acc, key, idx) => {
        let percentage = 0;
        if (totalFeatureUsage > 0) {
          if (idx === featureKeys.length - 1) {
            const allocated = Object.values(acc).reduce(
              (sum, val: any) => sum + parseFloat(val.percentage),
              0
            );
            percentage = 100 - allocated;
          } else {
            percentage = parseFloat(((featureCounts[key] / totalFeatureUsage) * 100).toFixed(4));
          }
        }
        acc[key] = { count: featureCounts[key], percentage: percentage.toFixed(4) + '%' };
        return acc;
      }, {} as Record<FeatureKey, { count: number; percentage: string }>),
    };

    // User growth over time
    const userGrowthOverTime = allUsers.reduce((acc, user) => {
      const dateKey = user.created_at.toISOString().split('T')[0];
      acc[dateKey] = (acc[dateKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sortedUserGrowth = Object.entries(userGrowthOverTime)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, count]) => ({ date, count }));

    const result = {
      totalUsers: allUsers.length,
      totalFreeUsers,
      totalFreeUserspercentage: ((totalFreeUsers / allUsers.length) * 100).toFixed(4) + '%',
      totalPaidUsers,
      totalPaidUserspercentage: ((totalPaidUsers / allUsers.length) * 100).toFixed(4) + '%',
      totalNoAuditUsers,
      totalNoAuditUserspercentage: ((totalNoAuditUsers / allUsers.length) * 100).toFixed(4) + '%',
      featureUsageDistribution,
      userGrowthOverTime: sortedUserGrowth,
      users: sortedUsers.map(({ latestReportCreatedAt, ...u }) => u),
    };

    res.json({ result });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


export async function addOrUpdateAnalysisService(req: Request, res: Response) {
  try {
    const { type, name, price, description, report } = req.body;

    // ✅ If no update values are provided, just return all services
    if (!name && price == null && !description && !report) {
      const allServices = await prisma.analysisServices.findMany();
      return res.json(allServices);
    }

    // Step 1: Find service by type
    let existingService = await prisma.analysisServices.findUnique({
      where: { type },
      include: { AnalysisServiceHistory: true },
    });

    let service;

    if (existingService) {
      console.log("Service found. Updating...");

      // If price is changing, close the old history record and insert a new one
      if (price != null && Number(price) !== Number(existingService.price)) {
        // ✅ Close the previous history (set valid_to)
        await prisma.analysisServiceHistory.updateMany({
          where: {
            service_id: existingService.id,
            valid_to: null, // only the active record
          },
          data: {
            valid_to: new Date(),
          },
        });

        // ✅ Insert new history entry with new price
        await prisma.analysisServiceHistory.create({
          data: {
            service_id: existingService.id,
            price: Number(price),
            valid_from: new Date(),
          },
        });
      }

      // ✅ Build update object dynamically
      const updateData: any = {};
      if (name) updateData.name = name;
      if (price != null) updateData.price = Number(price);
      if (description) updateData.description = description;
      if (report) updateData.report = report;

      if (Object.keys(updateData).length === 0) {
        return res
          .status(400)
          .json({ error: "No valid fields provided for update" });
      }

      // ✅ Update main service with NEW values
      service = await prisma.analysisServices.update({
        where: { id: existingService.id },
        data: updateData,
      });
    } else {
      console.log("No service found with this type. Creating new...");

      // ✅ Create fresh service
      service = await prisma.analysisServices.create({
        data: {
          type,
          name: name ?? "",
          price: price != null ? Number(price) : 0,
          description: description ?? null,
          report: report ?? null,
          AnalysisServiceHistory: {
            create: {
              price: price != null ? Number(price) : 0,
              valid_from: new Date(),
            },
          },
        },
      });
    }

    return res.json(service);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
}

export async function Deactivateuser(req: Request, res: Response) {
  try {
    const { user_id } = req.body;
    if (!user_id || typeof user_id !== 'string') {
      
      return res.json("User ID is required");
    }
    
      const user = await prisma.users.update({
        where: { 
          user_id: user_id 
        },
        data: { 
          account_status: "inactive"
        }
  });
   
    return res.json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
}



