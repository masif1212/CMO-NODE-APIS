import { parse } from 'tldts'; // For root domain extraction

import puppeteer from "puppeteer";
const mode = process.env.MODE;

export const getDomainRoot = (url: string): string => {
  try {
    const parsed = parse(url);
    return parsed.domain || '';
  } catch {
    return '';
  }
};




export async function fetchSocialLinksFromDom(url: string) {
  // const browser = await puppeteer.launch({ headless: true });
   let browser : any;

      if (mode === "production") {
        const launchOptions = {
          executablePath: "/usr/bin/google-chrome-stable",
          headless: "new" as any,
          args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
        };

        console.log("[brandprofile] Launching Puppeteer with full browser for Cloud Run...");
        browser = await puppeteer.launch(launchOptions);
      } else if (mode === "development") {
        const localLaunchOptions = {
          headless: "new" as any,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        };

        console.log("[brandprofile] Launching Puppeteer in headless mode for local environment...");
        browser = await puppeteer.launch(localLaunchOptions);
      } else {
        console.error(`[brandprofile] ERROR: Invalid MODE '${mode}'. Expected 'production' or 'development'.`);
        throw new Error(`Invalid MODE: ${mode}. Expected 'cloud' or 'development'.`);
      }

      console.log("[brandprofile] Puppeteer browser launched successfully.");

  const page = await browser.newPage();

  const links: Record<string, string | null> = {
    twitter: null,
    facebook: null,
    instagram: null,
    linkedin: null,
    youtube: null,
    tiktok: null,
  };

  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 80000 });

    const hrefs = await page.evaluate(() =>
      Array.from(document.querySelectorAll("a"))
        .map((a) => a.getAttribute("href") || "")
        .filter(Boolean)
    );

    for (const href of hrefs) {
      const link = href.toLowerCase();
      if (link.includes("twitter.com")) links.twitter ||= href;
      else if (link.includes("facebook.com")) links.facebook ||= href;
      else if (link.includes("instagram.com")) links.instagram ||= href;
      else if (link.includes("linkedin.com")) links.linkedin ||= href;
      else if (link.includes("youtube.com")) links.youtube ||= href;
      else if (link.includes("tiktok.com")) links.tiktok ||= href;
    }
  } finally {
    await browser.close();
  }

  return links;
}