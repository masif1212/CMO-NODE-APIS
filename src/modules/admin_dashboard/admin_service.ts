import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { last } from "cheerio/dist/commonjs/api/traversing";

const prisma = new PrismaClient();
 


export const getUserdata = async (req: Request, res: Response) => {
  try {
    // 🔹 Fetch all users with their websites and analysis_status
    const allUsers = await prisma.users.findMany({
      include: {
        user_websites: {
          include: {
            analysis_status: true,
          },
        },
      },
    });

    // 🔹 Process the data
    let totalFreeUsers = 0;
    let totalPaidUsers = 0;

    // Initialize feature usage counts
    const featureCounts = {
      totalAnalysis: 0,
      website_audit: 0,
      trafficanaylsis: 0,
      seo_audit: 0,
      social_media_anaylsis: 0,
      competitors_aynalsis: 0,
      recommendationbymo1: 0,
      recommendationbymo2: 0,
      recommendationbymo3: 0,
      cmo_recommendation: 0,
    };

    const users = allUsers.map(user => {
      // Calculate free and paid analysis counts
      let totalFreeAnalysis = 0;
      let totalPaidAnalysis = 0;

      // Iterate through each website's analysis_status
      user.user_websites.forEach(website => {
        website.analysis_status.forEach(status => {
          // Increment total analysis count
          featureCounts.totalAnalysis += 1;

          // Increment feature counts if true
          if (status.website_audit) featureCounts.website_audit += 1;
          if (status.trafficanaylsis) featureCounts.trafficanaylsis += 1;
          if (status.onpageoptimization) featureCounts.seo_audit += 1;
          if (status.social_media_anaylsis) featureCounts.social_media_anaylsis += 1;
          if (status.competitors_identification) featureCounts.competitors_aynalsis += 1;
          if (status.recommendationbymo1) featureCounts.recommendationbymo1 += 1;
          if (status.recommendationbymo2) featureCounts.recommendationbymo2 += 1;
          if (status.recommendationbymo3) featureCounts.recommendationbymo3 += 1;
          if (status.cmo_recommendation) featureCounts.cmo_recommendation += 1;

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

          // Paid analysis: website_audit is true AND at least one other field is true
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

          if (isFreeAnalysis) {
            totalFreeAnalysis += 1;
          }
          if (isPaidAnalysis) {
            totalPaidAnalysis += 1;
          }
        });
      });

      // Determine user type for counting
      if (totalPaidAnalysis > 0) {
        totalPaidUsers += 1;
      } else if (totalFreeAnalysis > 0) {
        totalFreeUsers += 1;
      }

      // Combine first_name and last_name into Username
      const username = [user.first_name, user.last_name]
        .filter(name => name && name.trim() !== '') 
        .join(' ') || 'N/A';

      return {
        user_id: user.user_id,
        email: user.email || 'N/A',
        Username: username,
        totalWebsites: user.user_websites.length,
        totalAnalysis: user.user_websites.reduce((sum, website) => sum + website.analysis_status.length, 0),
        totalFreeAnalysis: totalFreeAnalysis,
        totalPaidAnalysis: totalPaidAnalysis,
        createdAt: user.created_at,
        lastlogin: user.last_login,
      };
    });

    // Calculate feature usage distribution with counts and percentages
    const featureUsageDistribution = {
      totalAnalysis: featureCounts.totalAnalysis,
      website_audit: {
        count: featureCounts.website_audit,
        percentage: featureCounts.totalAnalysis > 0 ? ((featureCounts.website_audit / featureCounts.totalAnalysis) * 100).toFixed(2) + '%' : '0.00%',
      },
      trafficanaylsis: {
        count: featureCounts.trafficanaylsis,
        percentage: featureCounts.totalAnalysis > 0 ? ((featureCounts.trafficanaylsis / featureCounts.totalAnalysis) * 100).toFixed(2) + '%' : '0.00%',
      },
      seo_audit: {
        count: featureCounts.seo_audit,
        percentage: featureCounts.totalAnalysis > 0 ? ((featureCounts.seo_audit / featureCounts.totalAnalysis) * 100).toFixed(2) + '%' : '0.00%',
      },
      social_media_anaylsis: {
        count: featureCounts.social_media_anaylsis,
        percentage: featureCounts.totalAnalysis > 0 ? ((featureCounts.social_media_anaylsis / featureCounts.totalAnalysis) * 100).toFixed(2) + '%' : '0.00%',
      },
      competitors_aynalsis: {
        count: featureCounts.competitors_aynalsis,
        percentage: featureCounts.totalAnalysis > 0 ? ((featureCounts.competitors_aynalsis / featureCounts.totalAnalysis) * 100).toFixed(2) + '%' : '0.00%',
      },
      recommendationbymo1: {
        count: featureCounts.recommendationbymo1,
        percentage: featureCounts.totalAnalysis > 0 ? ((featureCounts.recommendationbymo1 / featureCounts.totalAnalysis) * 100).toFixed(2) + '%' : '0.00%',
      },
      recommendationbymo2: {
        count: featureCounts.recommendationbymo2,
        percentage: featureCounts.totalAnalysis > 0 ? ((featureCounts.recommendationbymo2 / featureCounts.totalAnalysis) * 100).toFixed(2) + '%' : '0.00%',
      },
      recommendationbymo3: {
        count: featureCounts.recommendationbymo3,
        percentage: featureCounts.totalAnalysis > 0 ? ((featureCounts.recommendationbymo3 / featureCounts.totalAnalysis) * 100).toFixed(2) + '%' : '0.00%',
      },
      cmo_recommendation: {
        count: featureCounts.cmo_recommendation,
        percentage: featureCounts.totalAnalysis > 0 ? ((featureCounts.cmo_recommendation / featureCounts.totalAnalysis) * 100).toFixed(2) + '%' : '0.00%',
      },
    };

    const result = {
      totalUsers: allUsers.length,
      totalFreeUsers: totalFreeUsers,
      totalFreeUserspercentage: ((totalFreeUsers / allUsers.length) * 100).toFixed(2) + '%',
      totalPaidUsers: totalPaidUsers,
      totalPaidUserspercentage: ((totalPaidUsers / allUsers.length) * 100).toFixed(2) + '%',
      featureUsageDistribution: featureUsageDistribution,
      users: users,
    };

    // 🔹 Send response
    res.json({
      result,
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


// export const getUserdata = async (req: Request, res: Response) => {
//   try {
//     // 🔹 Fetch all users with their websites and analysis_status
//     const allUsers = await prisma.users.findMany({
//       include: {
//         user_websites: {
//           include: {
//             analysis_status: true,
//           },
//         },
//       },
//     });

//     // 🔹 Process the data
//     let totalFreeUsers = 0;
//     let totalPaidUsers = 0;

//     const users = allUsers.map(user => {
//       // Calculate free and paid analysis counts
//       let totalFreeAnalysis = 0;
//       let totalPaidAnalysis = 0;

//       // Iterate through each website's analysis_status
//       user.user_websites.forEach(website => {
//         website.analysis_status.forEach(status => {
//           // Free analysis: only website_audit is true
//           const isFreeAnalysis =
//             status.website_audit === true &&
//             !status.trafficanaylsis &&
//             !status.onpageoptimization &&
//             !status.offpageoptimization &&
//             !status.social_media_anaylsis &&
//             !status.competitors_identification &&
//             !status.recommendationbymo1 &&
//             !status.recommendationbymo2 &&
//             !status.recommendationbymo3 &&
//             !status.cmo_recommendation;

//           // Paid analysis: website_audit is true AND at least one other field is true
//           const isPaidAnalysis =
//             status.website_audit === true &&
//             (status.trafficanaylsis ||
//               status.onpageoptimization ||
//               status.offpageoptimization ||
//               status.social_media_anaylsis ||
//               status.competitors_identification ||
//               status.recommendationbymo1 ||
//               status.recommendationbymo2 ||
//               status.recommendationbymo3 ||
//               status.cmo_recommendation);

//           if (isFreeAnalysis) {
//             totalFreeAnalysis += 1;
//           }
//           if (isPaidAnalysis) {
//             totalPaidAnalysis += 1;
//           }
//         });
//       });

//       // Determine user type for counting
//       if (totalPaidAnalysis > 0) {
//         totalPaidUsers += 1;
//       } else if (totalFreeAnalysis > 0) {
//         totalFreeUsers += 1;
//       }

//       return {
//         user_id: user.user_id,
//         email: user.email || 'N/A',
//         Username:[user.first_name, user.last_name]
//         .filter(name => name && name.trim() !== '') 
//         .join(' ') || 'N/A', 

//         totalWebsites: user.user_websites.length,
//         totalAnalysis: user.user_websites.reduce((sum, website) => sum + website.analysis_status.length, 0),
//         totalFreeAnalysis: totalFreeAnalysis,
//         totalPaidAnalysis: totalPaidAnalysis,
//         createdAt: user.created_at,
//         lastlogin: user.last_login,
//       };
//     });

//     const result = {
//       totalUsers: allUsers.length,
//       totalFreeUsers: totalFreeUsers,
//       totalFreeUserspercentage: ((totalFreeUsers / allUsers.length) * 100).toFixed(2) + '%',
//       totalPaidUserspercentage: ((totalPaidUsers / allUsers.length) * 100).toFixed(2) + '%',
//       totalPaidUsers: totalPaidUsers,
//       users: users,
//     };

//     // 🔹 Send response
//     res.json({
//       result,
//     });
//   } catch (error) {
//     console.error('❌ Error:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// };




// export const getUserdata = async (req: Request, res: Response) => {
//   try {
//     // 🔹 Fetch all users with their websites and analysis_status
//     const allUsers = await prisma.users.findMany({
//       include: {
//         user_websites: {
//           include: {
//             analysis_status: true,
//           },
//         },
//       },
//     });

//     // 🔹 Process the data
//     let totalFreeUsers = 0;
//     let totalPaidUsers = 0;

//     // Initialize feature usage counts
//     const featureUsage = {
//       totalAnalysis: 0,
//       website_audit: 0,
//       trafficanaylsis: 0,
//       seo_audit: 0,
//       // offpageoptimization: 0,
//       social_media_anaylsis: 0,
//       competitors_aynalsis: 0,
//       recommendationbymo1: 0,
//       recommendationbymo2: 0,
//       recommendationbymo3: 0,
//       cmo_recommendation: 0,
//     };

//     const users = allUsers.map(user => {
//       // Calculate free and paid analysis counts
//       let totalFreeAnalysis = 0;
//       let totalPaidAnalysis = 0;

//       // Iterate through each website's analysis_status
//       user.user_websites.forEach(website => {
//         website.analysis_status.forEach(status => {
//           // Increment total analysis count
//           featureUsage.totalAnalysis += 1;

//           // Increment feature counts if true
//           if (status.website_audit) featureUsage.website_audit += 1;
//           if (status.trafficanaylsis) featureUsage.trafficanaylsis += 1;
//           if (status.onpageoptimization) featureUsage.seo_audit += 1;
//           // if (status.offpageoptimization) featureUsage.offpageoptimization += 1;
//           if (status.social_media_anaylsis) featureUsage.social_media_anaylsis += 1;
//           if (status.competitors_identification) featureUsage.competitors_aynalsis += 1;
//           if (status.recommendationbymo1) featureUsage.recommendationbymo1 += 1;
//           if (status.recommendationbymo2) featureUsage.recommendationbymo2 += 1;
//           if (status.recommendationbymo3) featureUsage.recommendationbymo3 += 1;
//           if (status.cmo_recommendation) featureUsage.cmo_recommendation += 1;

//           // Free analysis: only website_audit is true
//           const isFreeAnalysis =
//             status.website_audit === true &&
//             !status.trafficanaylsis &&
//             !status.onpageoptimization &&
//             !status.offpageoptimization &&
//             !status.social_media_anaylsis &&
//             !status.competitors_identification &&
//             !status.recommendationbymo1 &&
//             !status.recommendationbymo2 &&
//             !status.recommendationbymo3 &&
//             !status.cmo_recommendation;

//           // Paid analysis: website_audit is true AND at least one other field is true
//           const isPaidAnalysis =
//             status.website_audit === true &&
//             (status.trafficanaylsis ||
//               status.onpageoptimization ||
//               status.offpageoptimization ||
//               status.social_media_anaylsis ||
//               status.competitors_identification ||
//               status.recommendationbymo1 ||
//               status.recommendationbymo2 ||
//               status.recommendationbymo3 ||
//               status.cmo_recommendation);

//           if (isFreeAnalysis) {
//             totalFreeAnalysis += 1;
//           }
//           if (isPaidAnalysis) {
//             totalPaidAnalysis += 1;
//           }
//         });
//       });

//       // Determine user type for counting
//       if (totalPaidAnalysis > 0) {
//         totalPaidUsers += 1;
//       } else if (totalFreeAnalysis > 0) {
//         totalFreeUsers += 1;
//       }

//       // Combine first_name and last_name into Username
//       const username = [user.first_name, user.last_name]
//         .filter(name => name && name.trim() !== '') 
//         .join(' ') || 'N/A';

//       return {
//         user_id: user.user_id,
//         email: user.email || 'N/A',
//         Username: username,
//         totalWebsites: user.user_websites.length,
//         totalAnalysis: user.user_websites.reduce((sum, website) => sum + website.analysis_status.length, 0),
//         totalFreeAnalysis: totalFreeAnalysis,
//         totalPaidAnalysis: totalPaidAnalysis,
//         createdAt: user.created_at,
//         lastlogin: user.last_login,
//       };
//     });

//     const result = {
//       totalUsers: allUsers.length,
//       totalFreeUsers: totalFreeUsers,
//       totalFreeUserspercentage: ((totalFreeUsers / allUsers.length) * 100).toFixed(2) + '%',
//       totalPaidUsers: totalPaidUsers,
//       totalPaidUserspercentage: ((totalPaidUsers / allUsers.length) * 100).toFixed(2) + '%',
//       featureUsageDistribution: featureUsage,
//       users: users,
//     };

//     // 🔹 Send response
//     res.json({
//       result,
//     });
//   } catch (error) {
//     console.error('❌ Error:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// };