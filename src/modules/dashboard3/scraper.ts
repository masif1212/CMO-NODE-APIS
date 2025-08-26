import axios from 'axios';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';
import { validateComprehensiveSchema, SchemaOutput } from "../scraped_data/schema_validation";
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import {getRobotsTxtAndSitemaps,evaluateHeadingHierarchy,isLogoUrlValid,parseSitemap,isCrawlableByLLMBots} from "../scraped_data/service"
import {getDomainRoot} from "../../utils/extractDomain"

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });




const prisma = new PrismaClient();
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
    
  
let finalLogoUrl = schemaAnalysisData.logo ?? null;
console.log("finalLogoUrlfromschema",finalLogoUrl)
if (finalLogoUrl && !(await isLogoUrlValid(finalLogoUrl))) {
  console.log("Schema logo URL is invalid, falling back...");
  finalLogoUrl = null; // Clear it so fallback logic runs
}
const h1Text = $("h1").first().text().trim() || "Not Found";


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
        const h1Text = $("h1").first().text().trim() || "Not Found";
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

        return { url: pageUrl, title, meta_description, og_title, meta_keywords,h1Text };
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
   const domain = getDomainRoot(url)
   const website_name = domain.split(".")[0];
  // console.log("CTR_Loss_Percent",CTR_Loss_Percent)
    console.log("homepage_alt_text_coverage",homepage_alt_text_coverage)
    return {
      website_url: url,
      page_title: $('title').text() || null,
      logo_url:  finalLogoUrl|| null,
      H1_text:h1Text || null,
      website_name:website_name || null,
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

    
    


    

    await prisma.report.upsert({
      where: { report_id },
      update: { geo_llm: websiteFound.toString()},
      create: { website_id, geo_llm: websiteFound.toString() },
    });

    

    return websiteFound.toString()
  
  } catch (error: any) {
    throw new Error(`OpenAI Error: ${error.message}`);
  }
};

