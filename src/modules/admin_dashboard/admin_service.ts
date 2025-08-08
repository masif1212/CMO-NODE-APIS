import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { last } from "cheerio/dist/commonjs/api/traversing";

const prisma = new PrismaClient();
 


// // export const getUserdata = async (req: Request, res: Response) => {
// //   try {
// //     // 🔹 Fetch all users with their websites and analysis_status
// //     const allUsers = await prisma.users.findMany({
// //       include: {
// //         user_websites: {
// //           include: {
// //             analysis_status: true,
// //           },
// //         },
// //       },
// //     });

// //     // 🔹 Process the data
// //     let totalFreeUsers = 0;
// //     let totalPaidUsers = 0;

// //     // Initialize feature usage counts
// //     const featureCounts = {
// //       totalAnalysis: 0,
// //       website_audit: 0,
// //       trafficanaylsis: 0,
// //       seo_audit: 0,
// //       social_media_anaylsis: 0,
// //       competitors_aynalsis: 0,
// //       recommendationbymo1: 0,
// //       recommendationbymo2: 0,
// //       recommendationbymo3: 0,
// //       cmo_recommendation: 0,
// //     };

// //     const users = allUsers.map(user => {
// //       // Calculate free and paid analysis counts
// //       let totalFreeAnalysis = 0;
// //       let totalPaidAnalysis = 0;

// //       // Iterate through each website's analysis_status
// //       user.user_websites.forEach(website => {
// //         website.analysis_status.forEach(status => {
// //           // Increment total analysis count
// //           featureCounts.totalAnalysis += 1;

// //           // Increment feature counts if true
// //           if (status.website_audit) featureCounts.website_audit += 1;
// //           if (status.trafficanaylsis) featureCounts.trafficanaylsis += 1;
// //           if (status.onpageoptimization) featureCounts.seo_audit += 1;
// //           if (status.social_media_anaylsis) featureCounts.social_media_anaylsis += 1;
// //           if (status.competitors_identification) featureCounts.competitors_aynalsis += 1;
// //           if (status.recommendationbymo1) featureCounts.recommendationbymo1 += 1;
// //           if (status.recommendationbymo2) featureCounts.recommendationbymo2 += 1;
// //           if (status.recommendationbymo3) featureCounts.recommendationbymo3 += 1;
// //           if (status.cmo_recommendation) featureCounts.cmo_recommendation += 1;

// //           // Free analysis: only website_audit is true
// //           const isFreeAnalysis =
// //             status.website_audit === true &&
// //             !status.trafficanaylsis &&
// //             !status.onpageoptimization &&
// //             !status.offpageoptimization &&
// //             !status.social_media_anaylsis &&
// //             !status.competitors_identification &&
// //             !status.recommendationbymo1 &&
// //             !status.recommendationbymo2 &&
// //             !status.recommendationbymo3 &&
// //             !status.cmo_recommendation;

// //           // Paid analysis: website_audit is true AND at least one other field is true
// //           const isPaidAnalysis =
// //             status.website_audit === true &&
// //             (status.trafficanaylsis ||
// //               status.onpageoptimization ||
// //               status.offpageoptimization ||
// //               status.social_media_anaylsis ||
// //               status.competitors_identification ||
// //               status.recommendationbymo1 ||
// //               status.recommendationbymo2 ||
// //               status.recommendationbymo3 ||
// //               status.cmo_recommendation);

// //           if (isFreeAnalysis) {
// //             totalFreeAnalysis += 1;
// //           }
// //           if (isPaidAnalysis) {
// //             totalPaidAnalysis += 1;
// //           }
// //         });
// //       });

// //       // Determine user type for counting
// //       if (totalPaidAnalysis > 0) {
// //         totalPaidUsers += 1;
// //       } else if (totalFreeAnalysis > 0) {
// //         totalFreeUsers += 1;
// //       }

// //       // Combine first_name and last_name into Username
// //       const username = [user.first_name, user.last_name]
// //         .filter(name => name && name.trim() !== '') 
// //         .join(' ') || 'N/A';

// //       return {
// //         user_id: user.user_id,
// //         email: user.email || 'N/A',
// //         Username: username,
// //         totalWebsites: user.user_websites.length,
// //         totalAnalysis: user.user_websites.reduce((sum, website) => sum + website.analysis_status.length, 0),
// //         totalFreeAnalysis: totalFreeAnalysis,
// //         totalPaidAnalysis: totalPaidAnalysis,
// //         createdAt: user.created_at,
// //         lastlogin: user.last_login,
// //       };
// //     });

// //     // Calculate feature usage distribution with counts and percentages
// //     // Calculate total feature usage count (excluding totalAnalysis)
// // const totalFeatureUsage =
// //   featureCounts.website_audit +
// //   featureCounts.trafficanaylsis +
// //   featureCounts.seo_audit +
// //   featureCounts.social_media_anaylsis +
// //   featureCounts.competitors_aynalsis +
// //   featureCounts.recommendationbymo1 +
// //   featureCounts.recommendationbymo2 +
// //   featureCounts.recommendationbymo3 +
// //   featureCounts.cmo_recommendation;

// // // Calculate feature usage distribution with sum = 100%
// // const featureUsageDistribution = {
// //   totalAnalysis: featureCounts.totalAnalysis,
// //   website_audit: {
// //     count: featureCounts.website_audit,
// //     percentage: totalFeatureUsage > 0 ? ((featureCounts.website_audit / totalFeatureUsage) * 100).toFixed(2) + '%' : '0.00%',
// //   },
// //   trafficanaylsis: {
// //     count: featureCounts.trafficanaylsis,
// //     percentage: totalFeatureUsage > 0 ? ((featureCounts.trafficanaylsis / totalFeatureUsage) * 100).toFixed(2) + '%' : '0.00%',
// //   },
// //   seo_audit: {
// //     count: featureCounts.seo_audit,
// //     percentage: totalFeatureUsage > 0 ? ((featureCounts.seo_audit / totalFeatureUsage) * 100).toFixed(2) + '%' : '0.00%',
// //   },
// //   social_media_anaylsis: {
// //     count: featureCounts.social_media_anaylsis,
// //     percentage: totalFeatureUsage > 0 ? ((featureCounts.social_media_anaylsis / totalFeatureUsage) * 100).toFixed(2) + '%' : '0.00%',
// //   },
// //   competitors_aynalsis: {
// //     count: featureCounts.competitors_aynalsis,
// //     percentage: totalFeatureUsage > 0 ? ((featureCounts.competitors_aynalsis / totalFeatureUsage) * 100).toFixed(2) + '%' : '0.00%',
// //   },
// //   recommendationbymo1: {
// //     count: featureCounts.recommendationbymo1,
// //     percentage: totalFeatureUsage > 0 ? ((featureCounts.recommendationbymo1 / totalFeatureUsage) * 100).toFixed(2) + '%' : '0.00%',
// //   },
// //   recommendationbymo2: {
// //     count: featureCounts.recommendationbymo2,
// //     percentage: totalFeatureUsage > 0 ? ((featureCounts.recommendationbymo2 / totalFeatureUsage) * 100).toFixed(2) + '%' : '0.00%',
// //   },
// //   recommendationbymo3: {
// //     count: featureCounts.recommendationbymo3,
// //     percentage: totalFeatureUsage > 0 ? ((featureCounts.recommendationbymo3 / totalFeatureUsage) * 100).toFixed(2) + '%' : '0.00%',
// //   },
// //   cmo_recommendation: {
// //     count: featureCounts.cmo_recommendation,
// //     percentage: totalFeatureUsage > 0 ? ((featureCounts.cmo_recommendation / totalFeatureUsage) * 100).toFixed(2) + '%' : '0.00%',
// //   },
// // };
 

// //     const result = {
// //       totalUsers: allUsers.length,
// //       totalFreeUsers: totalFreeUsers,
// //       totalFreeUserspercentage: ((totalFreeUsers / allUsers.length) * 100).toFixed(2) + '%',
// //       totalPaidUsers: totalPaidUsers,
// //       totalPaidUserspercentage: ((totalPaidUsers / allUsers.length) * 100).toFixed(2) + '%',
// //       featureUsageDistribution: featureUsageDistribution,
// //       users: users,
// //     };

// //     // 🔹 Send response
// //     res.json({
// //       result,
// //     });
// //   } catch (error) {
// //     console.error('❌ Error:', error);
// //     res.status(500).json({ error: 'Internal server error' });
// //   }
// // };






// Define all feature keys explicitly for type safety
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
    // Fetch all users with their websites and analysis_status
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

    // Initialize feature usage counts
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

          // Increment feature usage counts if true
          if (status.website_audit) featureCounts.website_audit++;
          if (status.trafficanaylsis) featureCounts.trafficanalysis++;
          if (status.onpageoptimization) featureCounts.seo_audit++;
          if (status.social_media_anaylsis) featureCounts.social_media_analysis++;
          if (status.competitors_identification) featureCounts.competitors_analysis++;
          if (status.recommendationbymo1) featureCounts.recommendationbymo1++;
          if (status.recommendationbymo2) featureCounts.recommendationbymo2++;
          if (status.recommendationbymo3) featureCounts.recommendationbymo3++;
          if (status.cmo_recommendation) featureCounts.cmo_recommendation++;

          // Free analysis: only website_audit is true
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

          // Paid analysis: website_audit + at least one other feature
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

    // Calculate total feature usage count
    const totalFeatureUsage = featureKeys.reduce(
      (sum, key) => sum + featureCounts[key],
      0
    );

    // Calculate percentage distribution — sum exactly 100%
    const featureUsageDistribution = {
      totalAnalysis: totalAnalysisCount,
      ...featureKeys.reduce((acc, key, idx) => {
        let percentage = 0;
        if (totalFeatureUsage > 0) {
          if (idx === featureKeys.length - 1) {
            // Last feature gets the remainder to ensure 100%
            const allocated = Object.values(acc).reduce(
              (sum, val: any) =>
                sum + parseFloat((val as { percentage: string }).percentage),
              0
            );
            percentage = 100 - allocated;
          } else {
            percentage = parseFloat(
              ((featureCounts[key] / totalFeatureUsage) * 100).toFixed(2)
            );
          }
        }
        acc[key] = {
          count: featureCounts[key],
          percentage: percentage.toFixed(2) + '%',
        };
        return acc;
      }, {} as Record<FeatureKey, { count: number; percentage: string }>),
    };

    const result = {
      totalUsers: allUsers.length,
      totalFreeUsers,
      totalFreeUserspercentage:
        ((totalFreeUsers / allUsers.length) * 100).toFixed(2) + '%',
      totalPaidUsers,
      totalPaidUserspercentage:
        ((totalPaidUsers / allUsers.length) * 100).toFixed(2) + '%',
      featureUsageDistribution,
      users,
    };

    res.json({ result });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
