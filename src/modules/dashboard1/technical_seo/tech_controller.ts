import { Request, Response } from "express";
import { checkBrokenLinks ,getWebsiteUrlById} from "./tech_service";
import { saveBrokenLinkAnalysis} from "../technical_seo/brokenLink.service";
import { PrismaClient } from "@prisma/client";
import * as cheerio from "cheerio";
import { validateComprehensiveSchema, SchemaOutput } from "./schema_validation";


const prisma = new PrismaClient();


export const handleBrokenLinks = async (req: Request, res: Response) => {

  const { website_id, user_id, maxDepth = 1 } = req.body;
  const website_url = await getWebsiteUrlById(user_id, website_id);

  if (!website_id || !user_id) {
    return res.status(400).json({ error: "Both 'url' and 'user_id' are required." });
  }

  try {   
    const brokenLinksResult = await checkBrokenLinks(user_id, website_id, website_url,maxDepth);

    const totalBroken = brokenLinksResult.length;

    // Step 3: Save analysis to DB
    const saved = await saveBrokenLinkAnalysis(user_id, website_id, brokenLinksResult, totalBroken);

     const analysis = await prisma.brand_website_analysis.findFirst({
  where: { website_id },
  orderBy: { updated_at: "desc" },
  select: {
    audit_details: true,
  },
});

let userAccessReadiness = null;
if (analysis?.audit_details) {
  let auditDetailsObj: any = analysis.audit_details;
  if (typeof auditDetailsObj === "string") {
    try {
      auditDetailsObj = JSON.parse(auditDetailsObj);
    } catch (e) {
      auditDetailsObj = {};
    }
  }
  userAccessReadiness = auditDetailsObj.user_access_readiness || null;
}

   
    
    await prisma.analysis_status.upsert({
    where: {
    user_id_website_id: {
      user_id,
      website_id,
    },
  },
  update: {
    broken_links: saved.website_analysis_id,
  },
  create: {
    user_id,
    website_id,
    broken_links: saved.website_analysis_id,
  },
});
     const schemaResult: SchemaOutput = await validateComprehensiveSchema(website_url);



    return res.status(201).json({
      Schema_Markup_Status: {
          message: schemaResult.message,
          valid: schemaResult.schemas.summary
      },

      Link_Health: {
          message: totalBroken ? "Broken links found and saved." : "No broken links found.",
          website_id: website_id,
          analysis_id: saved.website_analysis_id,
          totalBroken,
          brokenLinks: brokenLinksResult,
      }
    });
  } catch (err: any) {
    console.error("❌ handleBrokenLinks error:", err);
    return res.status(500).json({
      error: "Failed to check broken links.",
      detail: err?.message || "Internal server error",
    });
  }
};