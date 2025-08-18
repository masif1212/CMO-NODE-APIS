import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { PrismaClient, Prisma } from "@prisma/client";
const prisma = new PrismaClient();

export const saveUserRequirement = async (data: {
  user_id: string;
  website_id: string;
  property_id: string;
  access_token: string;
  profile?: any;
}) => {
  // Check if user requirement already exists for this user and website
  const existing = await prisma.user_requirements.findFirst({
    where: {
      user_id: data.user_id,
      website_id: data.website_id,
    },
  });

  if (existing) {
    // Update the existing record with new data
    // Find the unique requirement_id from the existing record and use it for update
    return prisma.user_requirements.update({
      where: {
        requirement_id: existing.requirement_id,
      },
      data,
    });
  } else {
    // Create a new record
    return prisma.user_requirements.create({
      data,
    });
  }
};

// Function to get the user's properties along with the website URL (defaultUri)
export const getUserProperties = async (auth: OAuth2Client) => {
  const analyticsAdmin = google.analyticsadmin({ version: "v1beta", auth });

  try {
    // Fetch account summaries
    const summaries = await analyticsAdmin.accountSummaries.list({});
    const properties: { id: string; name: string; websiteUrl: string | null }[] = [];

    for (const account of summaries?.data?.accountSummaries || []) {
      for (const property of account.propertySummaries || []) {
        const propertyId = property?.property?.split("/")[1] || "";
        const propertyName = property?.displayName || "";
        let websiteUrl = null;

        try {
          // Fetch data streams for each property
          const streamResp = await analyticsAdmin.properties.dataStreams.list({
            parent: `properties/${propertyId}`,
          });

          // Look for the web data stream and get the defaultUri (website URL)
          const webStream = streamResp.data.dataStreams?.find(
            (stream) => stream.type === "WEB_DATA_STREAM"
          );

          if (webStream && webStream.webStreamData?.defaultUri) {
            websiteUrl = webStream.webStreamData.defaultUri;
          }
        } catch (error) {
          console.warn(`Error fetching data stream for property ${propertyId}`);
        }

        // Push the property with its ID, name, and website URL (if available)
        properties.push({
          id: propertyId,
          name: propertyName,
          websiteUrl: websiteUrl || null, // If no website URL, set as null
        });
      }
    }

    return properties;
  } catch (error) {
    console.error("Error fetching account summaries or data streams:");
    throw error; // Re-throw to handle higher up if needed
  }
};


export const getAnalyticsSummary = async (auth: OAuth2Client, propertyId: string) => {
  // console.log("Fetching analytics summary for property:", propertyId);
  const analyticsData = google.analyticsdata({ version: "v1beta", auth });

  // console.log("Analytics Data API initialized",analyticsData);
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 30);

  const startDateStr = startDate.toISOString().split("T")[0];
  const endDateStr = today.toISOString().split("T")[0];
  console.log("Start Date:", startDateStr, "End Date:", endDateStr);
  const requests = {
    traffic: {
      dateRanges: [{ startDate: startDateStr, endDate: endDateStr }],
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "sessions" }],
    },
    country: {
      dateRanges: [{ startDate: startDateStr, endDate: endDateStr }],
      dimensions: [{ name: "country" }],
      metrics: [{ name: "sessions" }],
      limit: "3",
    },
    bounce: {
      dateRanges: [{ startDate: startDateStr, endDate: endDateStr }],
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "bounceRate" }],
    },
    totalUsers: {
      dateRanges: [{ startDate: startDateStr, endDate: endDateStr }],
      metrics: [{ name: "activeUsers" }],
    },
    bounceRate: {
      dateRanges: [{ startDate: startDateStr, endDate: endDateStr }],
      metrics: [{ name: "bounceRate" }],
    },
    topDevices: {
      dateRanges: [{ startDate: startDateStr, endDate: endDateStr }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'sessions' }],
      limit: 3,
    },
    topBrowsers: {
      dateRanges: [{ startDate: startDateStr, endDate: endDateStr }],
      dimensions: [{ name: 'browser' }],
      metrics: [{ name: 'sessions' }],
      // limit: 3,
    },
    dailyActiveUsers: {
      dateRanges: [{ startDate: startDateStr, endDate: endDateStr }],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "activeUsers" }],
    },
    newVsReturning: {
      dateRanges: [{ startDate: startDateStr, endDate: endDateStr }],
      dimensions: [{ name: 'newVsReturning' }],
      metrics: [{ name: 'activeUsers' }],
    },
    engagement: {
      dateRanges: [{ startDate: startDateStr, endDate: endDateStr }],
      metrics: [
        { name: "averageSessionDuration" },
        { name: "engagedSessions" },
        { name: "engagementRate" },
      ],
    },
    devices: {
      dateRanges: [{ startDate: startDateStr, endDate: endDateStr }],
      dimensions: [{ name: "deviceCategory" }],
      metrics: [{ name: "sessions" }],
    },
    browsers: {
      dateRanges: [{ startDate: startDateStr, endDate: endDateStr }],
      dimensions: [{ name: "browser" }],
      metrics: [{ name: "sessions" }],
    },
    sources: {
      dateRanges: [{ startDate: startDateStr, endDate: endDateStr }],
      dimensions: [{ name: "sessionSource" }],
      metrics: [{ name: "sessions" }],
      limit: "100",
    },

    medium: {
      dateRanges: [{ startDate: startDateStr, endDate: endDateStr }],
      dimensions: [{ name: "sessionMedium" }],
      metrics: [{ name: "sessions" }],
      // limit: "10",
    },
  };

  const start = performance.now();

  const [
    trafficResp,
    countryResp,
    bounceResp,
    totalResp,
    overallBounceResp,
    dailyUsersResp,
    engagementResp,
    devicesResp,
    browsersResp,
    sourcesResp,

    newVsReturningResp,
    sessionMediumtResp,
  ] = await Promise.all([
    analyticsData.properties.runReport({ property: `properties/${propertyId}`, requestBody: requests.traffic }),
    analyticsData.properties.runReport({ property: `properties/${propertyId}`, requestBody: requests.country }),
    analyticsData.properties.runReport({ property: `properties/${propertyId}`, requestBody: requests.bounce }),
    analyticsData.properties.runReport({ property: `properties/${propertyId}`, requestBody: requests.totalUsers }),
    analyticsData.properties.runReport({ property: `properties/${propertyId}`, requestBody: requests.bounceRate }),
    analyticsData.properties.runReport({ property: `properties/${propertyId}`, requestBody: requests.dailyActiveUsers }),
    analyticsData.properties.runReport({ property: `properties/${propertyId}`, requestBody: requests.engagement }),
    analyticsData.properties.runReport({ property: `properties/${propertyId}`, requestBody: requests.devices }),
    analyticsData.properties.runReport({ property: `properties/${propertyId}`, requestBody: requests.browsers }),
    analyticsData.properties.runReport({ property: `properties/${propertyId}`, requestBody: requests.sources }),
    analyticsData.properties.runReport({ property: `properties/${propertyId}`, requestBody: requests.newVsReturning }),
    analyticsData.properties.runReport({ property: `properties/${propertyId}`, requestBody: requests.medium }),
  ]);

  const dailyActiveUsers = dailyUsersResp?.data?.rows?.map(row => ({
    date: row.dimensionValues?.[0]?.value,
    users: parseInt(row.metricValues?.[0]?.value ?? "0", 10),
  })) || [];

  const newVsReturning = newVsReturningResp?.data?.rows?.map(row => ({
    type: row.dimensionValues?.[0]?.value,
    users: parseInt(row.metricValues?.[0]?.value ?? "0", 10),
  })) || [];

  const sessionMedium = sessionMediumtResp?.data?.rows?.map(row => ({
    medium: row.dimensionValues?.[0]?.value,
    sessions: parseInt(row.metricValues?.[0]?.value ?? "0", 10),
  })) || [];
  const engagement = {
    avgSessionDuration: parseFloat(engagementResp?.data?.rows?.[0]?.metricValues?.[0]?.value ?? "0"),
    engagedSessions: parseInt(engagementResp?.data?.rows?.[0]?.metricValues?.[1]?.value ?? "0"),
    engagementRate: parseFloat(engagementResp?.data?.rows?.[0]?.metricValues?.[2]?.value ?? "0"),
  };

  const duration = ((performance.now() - start) / 1000).toFixed(4);
  // console.log(`Analytics summary fetched in ${sessionMedium} seconds`);
  return {
    traffic: trafficResp?.data?.rows,
    country: countryResp?.data?.rows,
    bouncePages: bounceResp?.data?.rows,
    activeUsers: totalResp?.data?.rows?.[0]?.metricValues?.[0]?.value,
    bounceRate: overallBounceResp?.data?.rows?.[0]?.metricValues?.[0]?.value,
    dailyActiveUsers,
    newVsReturning,
    sessionMedium,
    engagement,
    devices: devicesResp?.data?.rows,
    browsers: browsersResp?.data?.rows,
    sources: sourcesResp?.data?.rows,
    timeTaken: duration,
  };
};


export const saveTrafficAnalysis = async (summary: any) => {
  const trafficMap = Object.fromEntries(
    summary?.traffic?.map((item: any) => [
      item.dimensionValues[0]?.value?.toLowerCase()?.replace(/\s/g, "_"),
      parseInt(item.metricValues[0]?.value, 10),
    ])
  );

  const total_visitors = parseInt(summary?.activeUsers, 10) || 0;
  const overall_bounce_rate = parseFloat(summary?.bounceRate) || null;

  const actionable_fix =
    (trafficMap["organic_search"] || 0) / total_visitors > 0.5
      ? "  Organic traffic looks healthy."
      : "⚠️ Organic traffic is low. Consider adding more SEO content and backlinks.";



  const combinedSources = [
    ...(summary?.sources?.map((item: any) => {
      const rawName = item.dimensionValues?.[0]?.value?.toLowerCase();
      return {
        type: "source",
        name: rawName?.includes("chatgpt") ? "chatgpt.com" : rawName,

        sessions: parseInt(item.metricValues?.[0]?.value, 10),
      };
    }) ?? []),
    ...(summary?.sessionMedium?.map((item: any) => ({
      type: "medium",
      name: item.medium?.toLowerCase().includes("chatgpt") ? "chatgpt.com" : item.medium,
      sessions: item.sessions,
    })) ?? []),
  ];

  const hasChatGPT = combinedSources.some(src => src.name === "chatgpt.com");
  // console.log("chatgpt", hasChatGPT);
  if (!hasChatGPT) {
    combinedSources.unshift({
      type: "source",
      name: "chatgpt.com",
      sessions: 0,
    });
  }
  return prisma.brand_traffic_analysis.create({
    data: {
      total_visitors,
      organic_search: trafficMap["organic_search"] || 0,
      direct: trafficMap["direct"] || 0,
      referral: trafficMap["referral"] || 0,
      organic_social: trafficMap["organic_social"] || 0,
      unassigned: trafficMap["unassigned"] || 0,
      high_bounce_pages: summary?.bouncePages as Prisma.InputJsonValue,
      top_countries: summary?.country as Prisma.InputJsonValue,
      overall_bounce_rate,
      actionable_fix,
      daily_active_users: summary?.dailyActiveUsers as Prisma.InputJsonValue,
      avg_session_duration: summary?.engagement?.avgSessionDuration,
      engagement_rate: summary?.engagement?.engagementRate,
      engaged_sessions: summary?.engagement?.engagedSessions,
      top_devices: summary?.devices as Prisma.InputJsonValue,
      top_browsers: summary?.browsers as Prisma.InputJsonValue,
      top_sources: combinedSources as Prisma.InputJsonValue, 
      new_vs_returning: summary?.newVsReturning as Prisma.InputJsonValue,
    },
  });
};

