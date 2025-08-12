import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { last } from "cheerio/dist/commonjs/api/traversing";

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



export const getUserdata = async (req: Request, res: Response) => {
  try {
    const allUsers = await prisma.users.findMany({
      include: {
        user_websites: {
          include: {
            analysis_status: true,
          },
        },
      },
    });

    let totalFreeUsers = 0;
    let totalPaidUsers = 0;

    const featureCounts: Record<FeatureKey, number> = featureKeys.reduce(
      (acc, key) => ({ ...acc, [key]: 0 }),
      {} as Record<FeatureKey, number>
    );
    let totalAnalysisCount = 0;

    const users = allUsers.map(user => {
      let totalFreeAnalysis = 0;
      let totalPaidAnalysis = 0;

      user.user_websites.forEach(website => {
        website.analysis_status.forEach(status => {
          totalAnalysisCount++;

          if (status.website_audit) featureCounts.website_audit++;
          if (status.trafficanaylsis) featureCounts.trafficanalysis++;
          if (status.onpageoptimization) featureCounts.seo_audit++;
          if (status.social_media_anaylsis) featureCounts.social_media_analysis++;
          if (status.competitors_identification) featureCounts.competitors_analysis++;
          if (status.recommendationbymo1) featureCounts.recommendationbymo1++;
          if (status.recommendationbymo2) featureCounts.recommendationbymo2++;
          if (status.recommendationbymo3) featureCounts.recommendationbymo3++;
          if (status.cmo_recommendation) featureCounts.cmo_recommendation++;

          const isFreeAnalysis =
            status.website_audit === true &&
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
            status.website_audit === true &&
            (status.trafficanaylsis ||
              status.onpageoptimization ||
              status.offpageoptimization ||
              status.social_media_anaylsis ||
              status.competitors_identification ||
              status.recommendationbymo1 ||
              status.recommendationbymo2 ||
              status.recommendationbymo3 ||
              status.cmo_recommendation);

          if (isFreeAnalysis) totalFreeAnalysis++;
          if (isPaidAnalysis) totalPaidAnalysis++;
        });
      });

      if (totalPaidAnalysis > 0) totalPaidUsers++;
      else if (totalFreeAnalysis > 0) totalFreeUsers++;

      const username =
        [user.first_name, user.last_name]
          .filter(name => name && name.trim() !== '')
          .join(' ') || 'N/A';

      return {
        user_id: user.user_id,
        email: user.email || 'N/A',
        Username: username,
        user_type: user.user_type || 'N/A',
        totalWebsites: user.user_websites.length,
        totalAnalysis: user.user_websites.reduce(
          (sum, website) => sum + website.analysis_status.length,
          0
        ),
        totalFreeAnalysis,
        totalPaidAnalysis,
        createdAt: user.created_at,
        lastlogin: user.last_login,
      };
    });

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
              (sum, val: any) =>
                sum + parseFloat((val as { percentage: string }).percentage),
              0
            );
            percentage = 100 - allocated;
          } else {
            percentage = parseFloat(
              ((featureCounts[key] / totalFeatureUsage) * 100).toFixed(4)
            );
          }
        }
        acc[key] = {
          count: featureCounts[key],
          percentage: percentage.toFixed(4) + '%',
        };
        return acc;
      }, {} as Record<FeatureKey, { count: number; percentage: string }>),
    };

    // 📊 User growth over time
    const userGrowthOverTime = allUsers.reduce((acc, user) => {
      const dateKey = user.created_at.toISOString().split('T')[0]; // yyyy-mm-dd
      acc[dateKey] = (acc[dateKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Sort growth data by date
    const sortedUserGrowth = Object.entries(userGrowthOverTime)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, count]) => ({ date, count }));

    const result = {
      totalUsers: allUsers.length,
      totalFreeUsers,
      totalFreeUserspercentage:
        ((totalFreeUsers / allUsers.length) * 100).toFixed(4) + '%',
      totalPaidUsers,
      totalPaidUserspercentage:
        ((totalPaidUsers / allUsers.length) * 100).toFixed(4) + '%',
      featureUsageDistribution,
      userGrowthOverTime: sortedUserGrowth, // ✅ Added growth data
      users,
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

    if (!name && price == null) {
      const allServices = await prisma.analysisServices.findMany();
      return res.json(allServices);
    }

    // Step 1: Find service by type
    let existingService = await prisma.analysisServices.findFirst({
      where: { type },
    });

    let service;

    if (existingService) {
      console.log("Service found. Updating...");

      // Build update object dynamically
      const updateData: any = {};
      if (name) updateData.name = name;
      if (price != null) updateData.price = price;
      if (description) updateData.description = description;
      if (report) updateData.report = report;

      if (Object.keys(updateData).length === 0) {
        return res
          .status(400)
          .json({ error: "No valid fields provided for update" });
      }

      service = await prisma.analysisServices.update({
        where: { id: existingService.id },
        data: updateData,
      });

    } else {
      console.log("No service found with this type. Creating new...");
      service = await prisma.analysisServices.create({
        data: {
          type,
          name: name ?? "",
          price: price ?? 0,
          description: description ?? null,
          report: report ?? null,
        },
      });
    }

    return res.json(service);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
}




