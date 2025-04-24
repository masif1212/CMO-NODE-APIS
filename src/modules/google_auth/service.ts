import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { PrismaClient, Prisma } from "@prisma/client";
const prisma = new PrismaClient();

export const getUserProperties = async (auth: OAuth2Client) => {
  const analyticsAdmin = google.analyticsadmin({ version: "v1beta", auth });
  const summaries = await analyticsAdmin.accountSummaries.list({});
  const properties: { id: string; name: string }[] = [];

  summaries.data.accountSummaries?.forEach((account) => {
    account.propertySummaries?.forEach((property) => {
      properties.push({
        id: property.property?.split("/")[1] || "",
        name: property.displayName || "",
      });
    });
  });

  return properties;
};

export const getAnalyticsSummary = async (auth: OAuth2Client, propertyId: string) => {
  const analyticsData = google.analyticsdata({ version: "v1beta", auth });

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 30);
  const startDateStr = startDate.toISOString().split("T")[0];
  const endDateStr = today.toISOString().split("T")[0];

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
  };

  const start = performance.now();

  const [trafficResp, countryResp, bounceResp, totalResp, overallBounceResp] = await Promise.all([
    analyticsData.properties.runReport({ property: `properties/${propertyId}`, requestBody: requests.traffic }),
    analyticsData.properties.runReport({ property: `properties/${propertyId}`, requestBody: requests.country }),
    analyticsData.properties.runReport({ property: `properties/${propertyId}`, requestBody: requests.bounce }),
    analyticsData.properties.runReport({ property: `properties/${propertyId}`, requestBody: requests.totalUsers }),
    analyticsData.properties.runReport({ property: `properties/${propertyId}`, requestBody: requests.bounceRate }),
  ]);

  const duration = ((performance.now() - start) / 1000).toFixed(2);

  return {
    traffic: trafficResp.data.rows,
    country: countryResp.data.rows,
    bouncePages: bounceResp.data.rows,
    activeUsers: totalResp.data.rows?.[0]?.metricValues?.[0]?.value,
    bounceRate: overallBounceResp.data.rows?.[0]?.metricValues?.[0]?.value,
    timeTaken: duration,
  };
};

export const saveTrafficAnalysis = async (website_id: string, summary: any) => {
  const trafficMap = Object.fromEntries(summary.traffic.map((item: any) => [item.dimensionValues[0].value.toLowerCase().replace(/\s/g, "_"), parseInt(item.metricValues[0].value, 10)]));

  const total_visitors = parseInt(summary.activeUsers, 10) || 0;
  const overall_bounce_rate = parseFloat(summary.bounceRate) || null;

  const actionable_fix = (trafficMap["organic_search"] || 0) / total_visitors > 0.2 ? "✅ Organic traffic looks healthy." : "⚠️ Organic traffic is low. Consider adding more SEO content and backlinks.";

  return prisma.brand_traffic_analysis.create({
    data: {
      website_id,
      total_visitors,
      organic_search: trafficMap["organic_search"] || 0,
      direct: trafficMap["direct"] || 0,
      referral: trafficMap["referral"] || 0,
      organic_social: trafficMap["organic_social"] || 0,
      unassigned: trafficMap["unassigned"] || 0,
      high_bounce_pages: summary.bouncePages as Prisma.InputJsonValue,
      top_countries: summary.country as Prisma.InputJsonValue,
      overall_bounce_rate,
      actionable_fix,
    },
  });
};
