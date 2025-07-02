import axios from 'axios';


const API_KEY = process.env.PAGESPEED_API_KEY!;
const API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";








export async function getPageSpeedData(url: string) {
  const params = new URLSearchParams({
    url,
    key: API_KEY,
    strategy: "desktop",
    cacheBust: Date.now().toString(),
  });

  ["performance", "seo", "accessibility", "best-practices", "pwa"].forEach((c) =>
    params.append("category", c)
  );

  try {
    const response = await axios.get(`${API_URL}?${params}`);
    const data = response.data;
    const lighthouse = data?.lighthouseResult;

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
          title: audit.title ?? null,
          description: audit.description ?? null,
          display_value: audit.displayValue ?? null,
          score: audit.score ?? null,
          details: audit.details ?? null,
        }
        : {
          id,
          title: null,
          description: null,
          display_value: null,
          score: null,
          details: null,
        };
    };

    // All audits
    const allAuditIds = Object.keys(lighthouse.audits);
    const allAudits = allAuditIds.map(getAudit);

    // Optimization opportunities (e.g., low-score and has details with type = 'opportunity')
    const optimization_opportunities = allAuditIds
      .map((id) => lighthouse.audits[id])
      .filter(
        (audit) =>
          audit.details?.type === "opportunity" &&
          audit.score !== 1 &&
          audit.score !== null
      )
      .map((audit) => getAudit(audit.id));

    // User accessibility-related audits (score < 1 in accessibility category)
    const user_access_readiness = allAuditIds
      .map((id) => lighthouse.audits[id])
      .filter(
        (audit) =>
          audit.score !== 1 &&
          audit.score !== null &&
          audit.score !== undefined &&
          lighthouse.categories["accessibility"]?.auditRefs?.some((ref: any) => ref.id === audit.id)
      )
      .map((audit) => getAudit(audit.id));

    // SEO audits
    const seoAuditIds = lighthouse.categories["seo"]?.auditRefs?.map((ref: any) => ref.id) ?? [];
    const seoAudits = seoAuditIds.map(getAudit);

    return {
      categories: {
        performance: getScore("performance"),
        seo: getScore("seo"),
        accessibility: getScore("accessibility"),
        best_practices: getScore("best-practices"),
        pwa: getScore("pwa"),
      },
      audits: {
        speed_index: getAudit("speed-index"),
        first_contentful_paint: getAudit("first-contentful-paint"),
        total_blocking_time: getAudit("total-blocking-time"),
        interactive: getAudit("interactive"),
        largest_contentful_paint: getAudit("largest-contentful-paint"),
        cumulative_layout_shift: getAudit("cumulative-layout-shift"),
      },
      audit_details: {
        allAudits: allAudits,
        optimization_opportunities: optimization_opportunities,
        user_access_readiness: user_access_readiness,
        seoAudits: seoAudits,
      },
    };
  } catch (err: any) {
    console.error(`PageSpeed fetch failed for ${url}:`, err.message);
    return null;
  }
}




