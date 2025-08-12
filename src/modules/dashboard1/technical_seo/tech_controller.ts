import { Request, Response } from "express";
import { checkBrokenLinks, getWebsiteUrlById } from "./tech_service";
import { PrismaClient, Prisma } from "@prisma/client";



const prisma = new PrismaClient();


export const technical_seo = async (req: Request, res: Response) => {
  console.log("🚀 technical seo started:", req.body);

  const { website_id, user_id, maxDepth = 0, report_id } = req.body;
  const website_url = await getWebsiteUrlById(user_id, website_id);

  if (!website_id || !user_id) {
    return res.status(400).json({ error: "Both 'url' and 'user_id' are required." });
  }
  console.log("fetching broken links");
  const brokenLinksResult = await checkBrokenLinks(user_id, website_id, website_url, maxDepth);
  if (brokenLinksResult) {
    console.log("Broken links fetched successfully:")
  }

  const totalBroken = brokenLinksResult.length;
  console.log("report_id", report_id)
  const report = await prisma.report.findUnique({
    where: { report_id: report_id }, // You must have 'record_id' from req.body
    select: {
      scraped_data_id: true,
      website_analysis_id: true,
    }
  });
  // Step 3: Save analysis to DB
  console.log("Saving broken link analysis to database...");
  const analysis = await prisma.brand_website_analysis.upsert({
    where: {
      website_analysis_id: report?.website_analysis_id ?? undefined, // must be unique or PK
    },
    update: {
      // website_id,
      total_broken_links: totalBroken,
      broken_links: brokenLinksResult as unknown as Prisma.InputJsonValue,
    },
    create: {
      website_analysis_id: report?.website_analysis_id ?? undefined, // required here if PK
      // website_id,
      total_broken_links: totalBroken,
      broken_links: brokenLinksResult as unknown as Prisma.InputJsonValue,
    },
    select: {
      website_analysis_id: true,
      // website_id: true,
      total_broken_links: true,
      broken_links: true,
      audit_details: true,
      created_at: true,
    },
  });





  let user_access_readiness: any = "None";

  if (analysis?.audit_details) {
    try {
      const auditDetails =
        typeof analysis.audit_details === "string"
          ? JSON.parse(analysis.audit_details)
          : analysis.audit_details;

      user_access_readiness = auditDetails?.user_access_readiness || "None";
    } catch (error) {
      console.error("Error parsing audit_details:", error);
      user_access_readiness = "None";
    }
  }


  const schema = await prisma.website_scraped_data.findUnique(
    {
      where: { scraped_data_id: report?.scraped_data_id ?? undefined },
      select: {
        schema_analysis: true
      }
    }
  )


  return res.status(200).json({
    technical_seo: {
      Schema_Markup_Status: {
        message: schema && schema.schema_analysis
          ? (typeof schema.schema_analysis === "string"
            ? JSON.parse(schema.schema_analysis).message
            : (typeof schema.schema_analysis === "object" && schema.schema_analysis !== null && "message" in schema.schema_analysis
              ? (schema.schema_analysis as { message?: string }).message
              : undefined))
          : "No schema data found.",
        valid: schema?.schema_analysis
          ? (typeof schema.schema_analysis === "string"
            ? JSON.parse(schema.schema_analysis).schemas?.summary
            : (typeof schema.schema_analysis === "object" && schema.schema_analysis !== null && "schemas" in schema.schema_analysis
              ? (schema.schema_analysis as { schemas?: { summary?: any } }).schemas?.summary
              : null))
          : null
      },
      user_access_readiness: user_access_readiness,

      Link_Health: {
        message: totalBroken ? "Broken links found and saved." : "No broken links found.",

        totalBroken,
        brokenLinks: brokenLinksResult,
      }
    }
  });

}

