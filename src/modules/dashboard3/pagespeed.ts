import axios from 'axios';

import lighthouse from "lighthouse";

const API_KEY = process.env.PAGESPEED_API_KEY!;
const API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

import puppeteer from "puppeteer";


const mobileFriendlyAudits = [
  "viewport",
  "font-size",
  "tap-targets",
  "mobile-friendly",
];




// export async function getPageSpeedData(url: string) {
//   const params = new URLSearchParams({
//     url,
//     key: API_KEY,
//     strategy: "desktop",
//     cacheBust: Date.now().toString(),
//   });

//   ["performance", "seo", "accessibility", "best-practices", "pwa"].forEach((c) =>
//     params.append("category", c)
//   );

//   try {
//     const response = await axios.get(`${API_URL}?${params}`);
//     const data = response.data;
//     const lighthouse = data?.lighthouseResult;

//     if (!lighthouse?.categories || !lighthouse.audits) {
//       throw new Error("Missing Lighthouse categories or audits in response");
//     }

//     const getScore = (cat: string) =>
//       lighthouse.categories[cat]?.score != null
//         ? Math.round(lighthouse.categories[cat].score * 100)
//         : null;

//     const getAudit = (id: string) => {
//       const audit = lighthouse.audits[id];
//       return audit
//         ? {
//           id,
//           title: audit.title ?? null,
//           description: audit.description ?? null,
//           display_value: audit.displayValue ?? null,
//           score: audit.score ?? null,
//           details: audit.details ?? null,
//         }
//         : {
//           id,
//           title: null,
//           description: null,
//           display_value: null,
//           score: null,
//           details: null,
//         };
//     };

//     // All audits
//     const allAuditIds = Object.keys(lighthouse.audits);
//     const allAudits = allAuditIds.map(getAudit);

//     // Optimization opportunities (e.g., low-score and has details with type = 'opportunity')
//     const optimization_opportunities = allAuditIds
//       .map((id) => lighthouse.audits[id])
//       .filter(
//         (audit) =>
//           audit.details?.type === "opportunity" &&
//           audit.score !== 1 &&
//           audit.score !== null
//       )
//       .map((audit) => getAudit(audit.id));

//     // User accessibility-related audits (score < 1 in accessibility category)
//     const user_access_readiness = allAuditIds
//       .map((id) => lighthouse.audits[id])
//       .filter(
//         (audit) =>
//           audit.score !== 1 &&
//           audit.score !== null &&
//           audit.score !== undefined &&
//           lighthouse.categories["accessibility"]?.auditRefs?.some((ref: any) => ref.id === audit.id)
//       )
//       .map((audit) => getAudit(audit.id));

//     // SEO audits
//     const seoAuditIds = lighthouse.categories["seo"]?.auditRefs?.map((ref: any) => ref.id) ?? [];
//     const seoAudits = seoAuditIds.map(getAudit);




//   const LCP = lighthouse?.audits["largest-contentful-paint"]?.numericValue;
//   const TBT = lighthouse?.audits["total-blocking-time"]?.numericValue;
//   const CLS = lighthouse?.audits["cumulative-layout-shift"]?.numericValue;

//   const lcpSeconds = LCP / 1000;
//   // const revenueLossPercent = ((lcpSeconds - 2.5) * 7) + (((TBT - 200) / 100) * 3) + (CLS * 10).toFixed(2);


//     const rawRevenueLoss = ((lcpSeconds - 2.5) * 7) + (((TBT - 200) / 100) * 3) + (CLS * 10);
// const revenueLossPercent = Number(rawRevenueLoss.toFixed(2));
//   const fullExpression = `((${lcpSeconds} - 2.5) * 7) + (((${TBT} - 200) / 100) * 3) + (${CLS} * 10) = ${revenueLossPercent}`;

//     console.log("Revenue Loss Formula:");
//     console.log(fullExpression);
  
//   // console.log("revenueLossPercent",revenueLossPercent)

    
//     return {
//       categories: {
//         performance: getScore("performance"),
//         seo: getScore("seo"),
//         accessibility: getScore("accessibility"),
//         best_practices: getScore("best-practices"),
//         pwa: getScore("pwa"),
//       },
//       audits: {
//         speed_index: getAudit("speed-index"),
//         first_contentful_paint: getAudit("first-contentful-paint"),
//         total_blocking_time: getAudit("total-blocking-time"),
//         interactive: getAudit("interactive"),
//         largest_contentful_paint: getAudit("largest-contentful-paint"),
//         cumulative_layout_shift: getAudit("cumulative-layout-shift"),
//       },
//       audit_details: {
//         allAudits: allAudits,
//         optimization_opportunities: optimization_opportunities,
//         user_access_readiness: user_access_readiness,
//         seoAudits: seoAudits,
//       },

//       revenueLossPercent:revenueLossPercent
//     };
//   } catch (err: any) {
//     console.error(`PageSpeed fetch failed for ${url}:`, err.message);
//     return null;
//   }
// }





export async function getPageSpeedData(url: string) {
  // const url = await getWebsiteUrlById(user_id, website_id);
  console.log("url fetch", url);
  const API_KEY = process.env.PAGESPEED_API_KEY || '';
  const API_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

  const params = new URLSearchParams({
    url,
    key: API_KEY,
    strategy: "desktop",
    cacheBust: Date.now().toString(),
  });

  ["performance", "seo", "accessibility", "best-practices", "pwa"].forEach((c) =>
    params.append("category", c)
  );

  // Helper function to process Lighthouse results
  const processLighthouseResult = (lighthouse: any) => {
    if (!lighthouse?.categories || !lighthouse.audits) {
      throw new Error("Missing Lighthouse categories or audits in response");
    }

    const getScore = (cat: string) =>
      lighthouse.categories[cat]?.score != null
        ? Math.round(lighthouse.categories[cat].score * 100)
        : null;

    const getAudit = (id: string) => {
      const audit = lighthouse.audits[id];
      return audit
        ? {
            id,
            title: audit.title || "Unnamed audit",
            description: audit.description ?? null,
            display_value: audit.displayValue ?? null,
            score: audit.score ?? null,
            details: audit.details ?? null,
            scoreDisplayMode: audit.scoreDisplayMode ?? null,
          }
        : {
            id,
            title: "Unnamed audit",
            description: null,
            display_value: null,
            score: null,
            details: null,
            scoreDisplayMode: null,
          };
    };

    const allAuditIds = Object.keys(lighthouse.audits);
    const detailedAuditResults = allAuditIds.map(getAudit);

    const accessibilityAuditIds =
      lighthouse.categories["accessibility"]?.auditRefs?.map((ref: any) => ref.id) ?? [];

    const accessibilityAudits = detailedAuditResults.filter((audit) =>
      accessibilityAuditIds.includes(audit.id)
    );

    const mobileFriendliness = mobileFriendlyAudits.map(getAudit);

    // --- Friendly accessibility mappings and types ---
    type AccessibilityGroupKey =
      | "critical"
      | "enhancements"
      | "passed"
      | "notApplicable";

    type AccessibilityStatus =
      | "critical"
      | "recommended"
      | "passed"
      | "notApplicable";

    const customAccessibilityContent: Record<
      string,
      { title: string; description: string }
    > = {
      "color-contrast": {
        title: "Text has sufficient color contrast",
        description:
          "Text should have enough contrast against its background to be easily readable by everyone, including users with visual impairments.",
      },
      "image-alt": {
        title: "Images have meaningful alt text",
        description:
          "Images should include descriptive alt text to support screen readers and make content accessible to all users.",
      },
      // ... (keeping all your existing accessibility content mappings)
      "use-landmarks": {
        title: "Use HTML5 landmark elements for better accessibility",
        description:
          "Landmark elements like `<main>`, `<nav>`, `<header>`, and `<footer>` help screen reader users navigate content more efficiently. For example: `<nav aria-label=\"Main navigation\">...</nav>`.",
      },
    };

    const classifyAccessibilityAudit = (
      audit: any
    ): {
      group: AccessibilityGroupKey;
      friendlyTitle: string;
      friendlyDescription: string;
      status: AccessibilityStatus;
    } => {
      const content = customAccessibilityContent[audit.id];
      const friendlyTitle = content?.title || audit.title || "Unnamed Audit";
      const friendlyDescription =
        content?.description || audit.description || null;

      let group: AccessibilityGroupKey;
      let status: AccessibilityStatus;

      if (audit.scoreDisplayMode === "notApplicable") {
        group = "notApplicable";
        status = "notApplicable";
      } else if (audit.score === 1) {
        group = "passed";
        status = "passed";
      } else if (audit.score === 0) {
        group = "critical";
        status = "critical";
      } else {
        group = "enhancements";
        status = "recommended";
      }

      return {
        group,
        friendlyTitle,
        friendlyDescription,
        status,
      };
    };

    const user_access_readiness: Record<AccessibilityGroupKey, any[]> = {
      critical: [],
      enhancements: [],
      passed: [],
      notApplicable: [],
    };

    for (const audit of accessibilityAudits) {
      const { group, friendlyTitle, friendlyDescription, status } =
        classifyAccessibilityAudit(audit);

      user_access_readiness[group].push({
        ...audit,
        title: friendlyTitle,
        description: friendlyDescription,
        status,
      });
    }

    // SEO audits
    const seoAuditIds = lighthouse.categories["seo"]?.auditRefs?.map((ref: any) => ref.id) ?? [];
    const seoAudits = seoAuditIds.map(getAudit);

    // Best practices
    const TRUST_AND_SAFETY_IDS = [
      "is-on-https",
      "uses-http2",
      "x-content-type-options",
      "x-frame-options",
      "xss-protection",
      "bypass",
    ];

    const bestPracticeAuditIds =
      lighthouse.categories?.["best-practices"]?.auditRefs?.map((ref: any) => ref.id) ?? [];

    const bestPracticeAudits = detailedAuditResults.filter((audit) =>
      bestPracticeAuditIds.includes(audit.id)
    );

    const bestPracticeGroups = {
      trustAndSafety: [] as any[],
      general: [] as any[],
      passed: [] as any[],
      notApplicable: [] as any[],
    };

    for (const audit of bestPracticeAudits) {
      if (TRUST_AND_SAFETY_IDS.includes(audit.id)) {
        bestPracticeGroups.trustAndSafety.push(audit);
      } else if (audit.id === "js-libraries") {
        bestPracticeGroups.general.push(audit);
      } else if (audit.scoreDisplayMode === "notApplicable") {
        bestPracticeGroups.notApplicable.push(audit);
      } else if (audit.score === 1) {
        bestPracticeGroups.passed.push(audit);
      } else if (audit.score === 0) {
        bestPracticeGroups.general.push(audit);
      }
    }

    // Revenue loss estimation
    const LCP = lighthouse?.audits["largest-contentful-paint"]?.numericValue;
    const TBT = lighthouse?.audits["total-blocking-time"]?.numericValue;
    const CLS = lighthouse?.audits["cumulative-layout-shift"]?.numericValue;

    const lcpSeconds = LCP / 1000;
    const rawRevenueLoss =
      (lcpSeconds - 2.5) * 7 + ((TBT - 200) / 100) * 3 + (CLS * 10);
    const revenueLossPercent = Number(rawRevenueLoss.toFixed(2));
    const fullExpression = `((${lcpSeconds} - 2.5) * 7) + (((${TBT} - 200) / 100) * 3) + (${CLS} * 10) = ${revenueLossPercent}`;

    console.log("Revenue Loss Formula:", fullExpression);

    return {
      audits: {
        speed_index: getAudit("speed-index"),
        first_contentful_paint: getAudit("first-contentful-paint"),
        total_blocking_time: getAudit("total-blocking-time"),
        interactive: getAudit("interactive"),
        largest_contentful_paint: getAudit("largest-contentful-paint"),
        cumulative_layout_shift: getAudit("cumulative-layout-shift"),
      },
      categories: {
        performance: getScore("performance"),
        seo: getScore("seo"),
        accessibility: getScore("accessibility"),
        best_practices: getScore("best-practices"),
        pwa: getScore("pwa"),
      },
      
      audit_details: {
        allAudits: detailedAuditResults,
        optimization_opportunities: bestPracticeGroups,
        user_access_readiness,
        seoAudits,
        categoryScores: {
          performance: getScore("performance"),
          seo: getScore("seo"),
          accessibility: getScore("accessibility"),
          best_practices: getScore("best-practices"),
          mobileFriendliness: mobileFriendliness
        },
      },
      revenueLossPercent,
    };
  };

  // Try PageSpeed API first
  try {
    const response = await axios.get(`${API_URL}?${params}`);
    const data = response.data;
    const lighthouseResult = data?.lighthouseResult;

    return processLighthouseResult(lighthouseResult);
  } catch (err: any) {
    console.error(`PageSpeed fetch failed for ${url}:`, err.message);
    const mode = process.env.MODE;

    // Fallback to direct Lighthouse run
    try {
      let browser;

      if (mode === 'production') {
        const launchOptions = {
          executablePath: "/usr/bin/google-chrome-stable",
          headless: false, // Running full browser in cloud
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu"
          ],
        };

        console.log("[brandprofile] Launching Puppeteer with full browser for Cloud Run...");
        browser = await puppeteer.launch(launchOptions);
      } 
        else if (mode === 'development') {
      const localLaunchOptions = {
        headless: "new" as any,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      };

      console.log("[brandprofile] Launching Puppeteer in headless mode for local environment...");
      browser = await puppeteer.launch(localLaunchOptions);
      } else {
        console.error(`[brandprofile] ERROR: Invalid MODE '${mode}'. Expected 'production' or 'development'.`);
        throw new Error(`Invalid MODE: ${mode}. Expected 'production' or 'development'.`);
      }

      console.log("[brandprofile] Puppeteer browser launched successfully.");

      const lighthouseConfig = {
        extends: 'lighthouse:default',
        settings: {
          onlyCategories: ['performance', 'seo', 'accessibility', 'best-practices', 'pwa'],
        },
      };

      const result = await lighthouse(url, {
        port: parseInt((new URL(browser.wsEndpoint())).port), // Convert string to number
        output: 'json',
        logLevel: 'info',
      }, lighthouseConfig);

      if (!result?.lhr) {
        throw new Error("Lighthouse run did not return valid results");
      }

      await browser.close();
      return processLighthouseResult(result.lhr);
    } catch (lighthouseErr: any) {
      console.error(`Lighthouse fallback failed for ${url}:`, lighthouseErr.message);
      return null;
    }
  }
}




