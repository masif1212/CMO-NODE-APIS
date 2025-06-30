import { Request, Response } from "express";
import { checkBrokenLinks ,getWebsiteUrlById} from "./tech_service";
import { saveBrokenLinkAnalysis} from "../technical_seo/brokenLink.service";
import { PrismaClient } from "@prisma/client";


const prisma = new PrismaClient();


export const technical_seo = async (req: Request, res: Response) => {
  console.log("🚀 ~ file: tech_controller.ts:11 ~ technical_seo ~ req.body:", req.body);

  const { website_id, user_id, maxDepth = 0 } = req.body;
  const website_url = await getWebsiteUrlById(user_id, website_id);

  if (!website_id || !user_id) {
    return res.status(400).json({ error: "Both 'url' and 'user_id' are required." });
  }

try {   
    console.log("fetching broken links");
    const brokenLinksResult = await checkBrokenLinks(user_id, website_id, website_url,maxDepth);
    if( brokenLinksResult) {
      console.log("Broken links fetched successfully:") }

    const totalBroken = brokenLinksResult.length;

    // Step 3: Save analysis to DB
    console.log("Saving broken link analysis to database...");
    const saved = await saveBrokenLinkAnalysis(user_id, website_id, brokenLinksResult, totalBroken);
    if (saved) {
      console.log("Broken link analysis saved successfully:", saved);

     const analysis = await prisma.brand_website_analysis.findFirst({
  where: { website_id },
  orderBy: { updated_at: "desc" },
  select: {
    audit_details: true,
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
    where : {website_id},
    select: {
      schema_analysis: true
    }
  }
)   

        await prisma.analysis_status.upsert({
    where: {
    user_id_website_id: {
      user_id,
      website_id,
    },
  },
  update: {
    technical_seo: saved.website_analysis_id,
  },
  create: {
    user_id,
    website_id,
    technical_seo: saved.website_analysis_id,
  },



});
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
          // website_id: website_id,
          // analysis_id: saved.website_analysis_id,
          totalBroken,
          brokenLinks: brokenLinksResult,
      }}
    });
    }
  }
  // Removed extra closing brace here

catch (err: any) {
    console.error("❌ handleBrokenLinks error:", err);
    return res.status(500).json({
      error: "Failed to check broken links.",
      detail: (err && typeof err === "object" && "message" in err) ? (err as Error).message : "Internal server error",
    });
  }
};