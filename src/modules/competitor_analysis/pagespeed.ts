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

  ["performance", "seo", "accessibility", "best_practices", "pwa"].forEach((c) =>
    params.append("category", c)
  );

  try {
    const response = await axios.get(`${API_URL}?${params}`);
    const data = response.data;
    const lighthouse = data?.lighthouseResult;

    if (!lighthouse?.categories) {
      throw new Error("Missing Lighthouse categories in response");
    }

    const getScore = (cat: string) => lighthouse.categories[cat]?.score != null
      ? Math.round(lighthouse.categories[cat].score * 100)
      : null;

    const getAudit = (id: string) => {
      const audit = lighthouse.audits[id];
      return audit
        ? {
            display_value: audit.displayValue ?? null,
            score: audit.score ?? null,
          }
        : { display_value: null, score: null };
    };

    return {
      categories: {
        performance: getScore("performance"),
        seo: getScore("seo"),
        accessibility: getScore("accessibility"),
        best_practices: getScore("best-practices"),
      },
      audits: {
        speed_index: getAudit("speed-index"),
        first_contentful_paint: getAudit("first-contentful-paint"),
        total_blocking_time: getAudit("total-blocking-time"),
        interactive: getAudit("interactive"),
        largest_contentful_paint: getAudit("largest-contentful-paint"),
        cumulative_layout_shift: getAudit("cumulative-layout-shift"),
      },
    };
  } catch (err: any) {
    console.error(`PageSpeed fetch failed for ${url}:`, err.message);
    return null;
  }
}



