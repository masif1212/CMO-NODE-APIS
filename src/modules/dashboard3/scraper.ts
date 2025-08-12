import axios from 'axios';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';
import { validateComprehensiveSchema, SchemaOutput } from "./schema_validation";
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import { parseStringPromise } from "xml2js";

import { parse } from 'tldts'; // For root domain extraction
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const getDomainRoot = (url: string): string => {
  const parsed = parse(url);
  return parsed.domain || '';
};



const prisma = new PrismaClient();

async function getRobotsTxtAndSitemaps(baseUrl: string): Promise<string[]> {
  try {
    // console.log("getRobotsTxtAndSitemaps")
    const robotsUrl = new URL("/robots.txt", baseUrl).href;
    const { data } = await axios.get(robotsUrl);
    const sitemapUrls: string[] = [];

    for (const line of data.split("\n")) {
      if (line.toLowerCase().startsWith("sitemap:")) {
        const parts = line.split(":");
        const sitemapUrl = parts.slice(1).join(":").trim();
        if (sitemapUrl) sitemapUrls.push(sitemapUrl);
      }
    }

    if (sitemapUrls.length === 0) {
      const guesses = ["/sitemap.xml", "/sitemap_index.xml"];
      for (const guess of guesses) {
        sitemapUrls.push(new URL(guess, baseUrl).href);
      }
    }

    return sitemapUrls;
  } catch {
    return [];
  }
}

async function parseSitemap(sitemapUrl: string): Promise<string[]> {
  try {
    // console.log("parseSitemap")
    const { data } = await axios.get(sitemapUrl);
    const parsed = await parseStringPromise(data);
    const urls: string[] = [];

    if (parsed.sitemapindex?.sitemap) {
      for (const entry of parsed.sitemapindex.sitemap) {
        if (entry.loc?.[0]) {
          const nestedUrls = await parseSitemap(entry.loc[0]);
          urls.push(...nestedUrls);
        }
      }
    }

    if (parsed.urlset?.url) {
      for (const entry of parsed.urlset.url) {
        if (entry.loc?.[0]) urls.push(entry.loc[0]);
      }
    }

    return urls;
  } catch {
    return [];
  }
}

async function isLogoUrlValid(logoUrl: string): Promise<boolean> {
  try {
    const response = await axios.head(logoUrl, {
      timeout: 10000,
      validateStatus: () => true // Don't throw on 404/500
    });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

function evaluateHeadingHierarchy($: cheerio.CheerioAPI): {
  hasH1: boolean;
  totalHeadings: number;
  headingLevelsUsed: string[];
  headingOrderUsed: string[];
  hasMultipleH1s: boolean;
  skippedHeadingLevels: boolean;
  reversedHeadingOrder: boolean;
  headingHierarchyIssues: boolean;
  message: string;
} {
  const headings = $("h1, h2, h3, h4, h5, h6");
  const levels: number[] = [];
  const headingOrderUsed: string[] = [];
  const headingLevelsUsed: string[] = [];

  headings.each((_, el) => {
    const tag = $(el)[0].tagName.toLowerCase();
    const level = parseInt(tag.replace("h", ""));
    if (!isNaN(level)) {
      levels.push(level);
      headingOrderUsed.push(tag);
      if (!headingLevelsUsed.includes(tag)) {
        headingLevelsUsed.push(tag);
      }
    }
  });

  const totalHeadings = levels.length;
  const hasH1 = headingLevelsUsed.includes("h1");
  const hasMultipleH1s = levels.filter((l) => l === 1).length > 1;

  // Check for skipped heading levels (e.g., h2 → h4 without h3)
  let skippedHeadingLevels = false;
  for (let i = 1; i < levels.length; i++) {
    const prev = levels[i - 1];
    const curr = levels[i];
    if (curr - prev > 1) {
      skippedHeadingLevels = true;
      break;
    }
  }

  // Check for reversed order (e.g., h3 before h2)
  let reversedHeadingOrder = false;
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] < levels[i - 1]) {
      reversedHeadingOrder = true;
      break;
    }
  }

  const headingHierarchyIssues =
    !hasH1 || hasMultipleH1s || skippedHeadingLevels || reversedHeadingOrder;

  let message = "Heading structure looks good.";
  if (!hasH1) {
    message = "Missing <h1> tag — every page should have a main heading.";
  } else if (hasMultipleH1s) {
    message = "Multiple <h1> tags found — should only have one main heading.";
  } else if (skippedHeadingLevels) {
    message = "Heading levels are skipped — e.g., <h2> followed by <h4>.";
  } else if (reversedHeadingOrder) {
    message = "Improper heading order — higher-level headings (e.g., <h3>) appear before <h2>.";
  }

  return {
    hasH1,
    totalHeadings,
    headingLevelsUsed,
    headingOrderUsed,
    hasMultipleH1s,
    skippedHeadingLevels,
    reversedHeadingOrder,
    headingHierarchyIssues,
    message,
  };
}



async function isCrawlableByLLMBots(baseUrl: string): Promise<boolean> {
  try {
    const robotsUrl = new URL("/robots.txt", baseUrl).href;
    const { data: robotsTxt } = await axios.get(robotsUrl);

    const disallowedAgents = ["*", "GPTBot", "CCBot", "AnthropicBot", "ClaudeBot", "ChatGPT-User", "googlebot"];
    const lines = robotsTxt.split("\n").map((line: string) => line.trim());
    let currentAgent: string | null = null;
    const disallowedMap: Record<string, string[]> = {};

    for (const line of lines) {
      if (line.toLowerCase().startsWith("user-agent:")) {
        currentAgent = line.split(":")[1].trim();
      } else if (line.toLowerCase().startsWith("disallow:") && currentAgent) {
        const path = line.split(":")[1].trim();
        if (!disallowedMap[currentAgent]) disallowedMap[currentAgent] = [];
        disallowedMap[currentAgent].push(path);
      }
    }

    for (const agent of disallowedAgents) {
      const disallows = disallowedMap[agent];
      if (disallows && disallows.some(path => path === "/" || path === "/*")) {
        return false;
      }
    }

    return true;
  } catch {
    return true;
  }
}


export async function scrapeWebsiteCompetitors(url: string) {
  try {
    const res = await axios.get(url, { timeout: 10000 });
    const html = res.data;
    const $ = cheerio.load(html);
    const headingAnalysis = evaluateHeadingHierarchy($);
    const extractHandle = (platform: string) =>
      $(`a[href*="${platform}.com"]`).attr('href') || null;

    const otherLinks = $('a')
      .map((_, el) => $(el).attr('href'))
      .get()
      .filter(href => href && !href.includes(url))
      .filter((href, idx, self) => self.indexOf(href) === idx);


  

    const imgTags = $("img");
    const totalImages = imgTags.length;
    const imagesWithAlt = imgTags.filter((_, el) => {
      const alt = $(el).attr("alt");
      return !!(alt && alt.trim().length > 0);
    }).length;

    const homepage_alt_text_coverage = totalImages > 0 ? Math.round((imagesWithAlt / totalImages) * 100) : 0;
     const schemaAnalysisData: SchemaOutput = await validateComprehensiveSchema(url);
        const isCrawlable = await isCrawlableByLLMBots(url);
    
    // Fallback logo detection if needed
   // Step 1: Try to use logo from schema
let finalLogoUrl = schemaAnalysisData.logo ?? null;
console.log("finalLogoUrlfromschema",finalLogoUrl)
if (finalLogoUrl && !(await isLogoUrlValid(finalLogoUrl))) {
  console.log("Schema logo URL is invalid, falling back...");
  finalLogoUrl = null; // Clear it so fallback logic runs
}

// Step 2: If no valid schema logo, try scraping from HTML
if (!finalLogoUrl) {
  const logoSelectors = [
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="apple-touch-icon"]',
    'img[alt*="logo"]',
    'img[src*="logo"]',
  ];

  const $ = cheerio.load(html);
  for (const selector of logoSelectors) {
    const el = $(selector).first();
    let src = el.attr("href") || el.attr("src");
    if (src) {
      if (src.startsWith("//")) src = "https:" + src;
      else if (src.startsWith("/")) src = new URL(src, url).href;

      if (await isLogoUrlValid(src)) {
        finalLogoUrl = src;
        console.log("finalLogoUrlscrape",finalLogoUrl)
        break;
      }
    }
  }
}
  const sitemapUrls = await getRobotsTxtAndSitemaps(url);
  const sitemapLinks = (await Promise.all(sitemapUrls.map(parseSitemap))).flat();
  // const uniqueUrls = [...new Set<string>([url, ...sitemapLinks.map((u) => u.trim())])];
  const allSitemapUrls = [...new Set<string>([url, ...sitemapLinks.map((u) => u.trim())])];

  let selectedKeyPages: string[];
  if (allSitemapUrls.length > 7) {
    const homepage = url;
    const importantKeywords = [
      "about", "services", "service", "contact", "pricing", "plans",
      "blog", "insights", "team", "company", "features", "why", "how-it-works", "careers"
    ];

    const keywordMatched = allSitemapUrls.filter((link) => {
      try {
        const path = new URL(link).pathname.toLowerCase();
        return importantKeywords.some((kw) => path.includes(kw));
      } catch {
        return false;
      }
    });

    const shallowPages = allSitemapUrls.filter((link) => {
      try {
        const path = new URL(link).pathname;
        const segments = path.split("/").filter(Boolean);
        return segments.length === 1;
      } catch {
        return false;
      }
    });

    const merged = [homepage, ...keywordMatched, ...shallowPages]
      .filter((v, i, self) => self.indexOf(v) === i)
      .slice(0, 7);

    selectedKeyPages = merged;
  } else {
    selectedKeyPages = allSitemapUrls;
  }
  // let affectedPagesCount = 0;
  // const keyPages = await Promise.all(
  //   selectedKeyPages.map(async (pageUrl) => {
  //     try {
  //       const res = await axios.get(pageUrl);
  //       if (res.status >= 200 && res.status < 400) {
  //         const $$ = cheerio.load(res.data);
  //         const titles = $$("title").map((_, el) => $$(el).text().trim()).get().filter(Boolean);
  //         const title =
  //           titles.length > 1
  //             ? `${titles.join(" || ")} - needs attention - multiple title tags found`
  //             : titles[0] || "not found";
  //         const meta_description = $$('meta[name="description"]').attr("content") || "not found";
  //         const og_title = $$('meta[property="og:title"]').attr("content") || "not found";
  //         const meta_keywords = $$('meta[name="keywords"]').attr("content") || "not found";

  //         const missingAny = !(title && meta_description && og_title && meta_keywords);
  //         if (missingAny) affectedPagesCount++;

  //         return { url: pageUrl, title, meta_description, og_title, meta_keywords };
  //       }
  //     } catch {
  //       return null;
  //     }
  //   })
  // );


  let affectedPagesCount = 0;
const keyPages = await Promise.all(
  selectedKeyPages.map(async (pageUrl) => {
    try {
      const res = await axios.get(pageUrl);
      if (res.status >= 200 && res.status < 400) {
        const $$ = cheerio.load(res.data);
        const titles = $$("title")
          .map((_, el) => $$(el).text().trim())
          .get()
          .filter(Boolean);

        const title =
          titles.length > 1
            ? `${titles.join(" || ")} - needs attention - multiple title tags found`
            : titles[0] || "not found";

        const meta_description = $$('meta[name="description"]').attr("content")?.trim() || "not found";
        const og_title = $$('meta[property="og:title"]').attr("content")?.trim() || "not found";
        const meta_keywords = $$('meta[name="keywords"]').attr("content")?.trim() || "not found";

        const isMultipleTitle = title.includes("needs attention");
        const isMissing = [title, meta_description, og_title, meta_keywords].some(
          (v) => !v || v.trim().toLowerCase() === "not found"
        ) || isMultipleTitle;

        if (isMissing) {
          affectedPagesCount++;
          console.log("Missing metadata on:", pageUrl, {
            title,
            meta_description,
            og_title,
            meta_keywords,
          });
        }

        return { url: pageUrl, title, meta_description, og_title, meta_keywords };
      }
    } catch (err : any) {
      console.warn("Error fetching key page:", pageUrl, err.message);
      return null;
    }
  })
);


  const filteredPages = keyPages
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => ({
      url: p.url,
      title: p.title ?? "not found",
      meta_description: p.meta_description ?? "not found",
      og_title: p.og_title ?? null,
      meta_keywords: p.meta_keywords ?? "not found",
    }));
  const totalKeyPages = filteredPages.length;
  const CTR_Loss_Percent = {
    total_key_pages: totalKeyPages,
    total_affected_pages: affectedPagesCount,
    CTR_Loss_Percent: totalKeyPages > 0 ? Number(((affectedPagesCount / totalKeyPages) * 0.37).toFixed(4)) : 0,
    extract_message: sitemapLinks.length > 0 ? "Sitemap found" : "Sitemap not found",
  };

  // console.log("CTR_Loss_Percent",CTR_Loss_Percent)
    console.log("homepage_alt_text_coverage",homepage_alt_text_coverage)
    return {
      website_url: url,
      page_title: $('title').text() || null,
      logo_url:  finalLogoUrl|| null,
      meta_description: $('meta[name="description"]').attr('content') || null,
      meta_keywords: $('meta[name="keywords"]').attr('content') || null,
      og_title: $('meta[property="og:title"]').attr('content') || null,
      og_description: $('meta[property="og:description"]').attr('content') || null,
      og_image: $('meta[property="og:image"]').attr('content') || null,
      twitter_handle: extractHandle('twitter') || null,
      facebook_handle: extractHandle('facebook') || null,
      instagram_handle: extractHandle('instagram') || null,
      linkedin_handle: extractHandle('linkedin') || null,
      youtube_handle: extractHandle('youtube') || null,
      homepage_alt_text_coverage:   homepage_alt_text_coverage,
      isCrawlable:isCrawlable,
      tiktok_handle: extractHandle('tiktok') || null,
      headingAnalysis:headingAnalysis,
      other_links: otherLinks,
      schema_analysis:schemaAnalysisData || null,
      raw_html: html,
      ctr_loss_percent:CTR_Loss_Percent
    };
  } catch (err) {
    console.error(`Error scraping ${url}:`, err);
    return err instanceof Error ? err.message : 'Unknown error';
  }
}





export const fetchBrands = async (
  user_id: string,
  website_id: string,
  report_id:string
): Promise<any> => {
  const websiteEntry = await prisma.user_websites.findUnique({
    where: {
      user_id_website_id: { user_id, website_id },
    },
  });

  if (!websiteEntry) {
    throw new Error(`Website entry not found for this user and website.`);
  }
  // console.log('Website Entry in geo', websiteEntry);
  const websiteUrl = websiteEntry.website_url;

  let userReq = await prisma.user_requirements.findFirst({
    where: {
      user_id,
      website_id,
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  if (!userReq) {
    userReq = await prisma.user_requirements.create({
      data: {
        user_id,
        website_id,
        industry: '',
        region_of_operation: '',
        target_location: '',
        target_audience: '',
        primary_offering: '',
        USP: '',


      },
    });
  }

  const {
    industry,
    region_of_operation,
    target_location,
    target_audience,
    USP,
    primary_offering,

  } = userReq;

  const parts = [];
  if (industry) parts.push(`in the industry : ${industry} sector`);
  if (region_of_operation) parts.push(`operating in ${region_of_operation}`);
  if (target_location) parts.push(`targeting users in ${target_location}`);
  if (target_audience) parts.push(`serving ${target_audience}`);
  if (USP) parts.push(`, usp  :  ${USP}`);
  if (primary_offering) parts.push(`and their brand primary_offering :   ${primary_offering}`);
  const context = parts.length > 0 ? parts.join(', ') : '';

  const prompt = `
You are a business research assistant.

List the top 10  technology brands${context ? ` that are ${context}` : ''}.

Only include brands that have their **own official homepage URLs** — do NOT include blog posts, review articles, directories, or aggregator websites.

For each brand, provide ONLY:
1. Brand Name
2. Official homepage URL

Respond with ONLY a valid JSON array of objects. No markdown, no explanation.

Format:

[
  {
    "brand_name": "Example Brand",
    "website": "https://www.example.com"
  }
]
`.trim();

  // console.log('Prompt:', prompt);

  try {
    const res = await openai.responses.create({
      model: 'gpt-4o',
      input: prompt,
      tools: [
        {
          type: 'web_search_preview',
          search_context_size: 'medium',
          user_location: {
            type: 'approximate',
            region: target_location || 'Unknown',
          },
        },
      ],
    });

    let content = res.output_text?.trim();
    if (!content) throw new Error('Empty OpenAI response');
    else ("OpenAI response received successfully");

    if (content.startsWith('```')) {
      content = content.replace(/```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    let parsedBrands: any[] = [];
    try {
      parsedBrands = JSON.parse(content);
      if (!Array.isArray(parsedBrands)) throw new Error();
    } catch {
      await prisma.report.upsert({
        where: { report_id },
        update: { geo_llm: content },
        create: { website_id, geo_llm: content },
      });

      return {
        raw: content,
        website_found: false,
        message: 'Unable to parse brands list from AI response.',
      };
    }

    const normalizedUserDomain = getDomainRoot(websiteUrl);

    const websiteFound = parsedBrands.some((brand: any) => {
      if (typeof brand.website !== 'string') return false;
      const brandDomain = getDomainRoot(brand.website);
      return brandDomain === normalizedUserDomain;
    });


  


    // const saveData = JSON.stringify({/*  */
    //   // brands: parsedBrands,
    //   website_found: websiteFound,

    // });

    await prisma.report.upsert({
      where: { report_id },
      update: { geo_llm: websiteFound.toString()},
      create: { website_id, geo_llm: websiteFound.toString() },
    });

    

    return websiteFound.toString()
    // return {


    //   AI_Discoverability: {
        
    //     ...response 
        
    //   },



    // };
  } catch (error: any) {
    throw new Error(`OpenAI Error: ${error.message}`);
  }
};

