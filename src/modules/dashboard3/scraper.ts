import axios from 'axios';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';



const prisma = new PrismaClient();

export async function scrapeWebsitecompetitos(url: string) {
  try {
    const res = await axios.get(url, { timeout: 10000 });
    const html = res.data;
    const $ = cheerio.load(html);

    const extractHandle = (platform: string) =>
      $(`a[href*="${platform}.com"]`).attr('href') || null;

    const otherLinks = $('a')
      .map((_, el) => $(el).attr('href'))
      .get()
      .filter(href => href && !href.includes(url))
      .filter((href, idx, self) => self.indexOf(href) === idx);


  const logoSelectors = [
  'link[rel="icon"]',
  'link[rel="shortcut icon"]',
  'link[rel="apple-touch-icon"]',
  'img[alt*="logo"]',
  'img[src*="logo"]'
];    
  let logoUrl: string | undefined = undefined;

   const imgTags = $("img");
  const totalImages = imgTags.length;
  const imagesWithAlt = imgTags.filter((_, el) => {
    const alt = $(el).attr("alt");
    return !!(alt && alt.trim().length > 0);
  }).length;

  const homepageAltTextCoverage = totalImages > 0 ? Math.round((imagesWithAlt / totalImages) * 100) : 0;

  for (const selector of logoSelectors) {
    const el = $(selector).first();
    let src = el.attr("href") || el.attr("src");
    if (src) {
      // Handle relative URLs
      if (src.startsWith("//")) src = "https:" + src;
      else if (src.startsWith("/")) src = new URL(src, url).href;
      logoUrl = src;
      console.log(`Found logo URL: ${logoUrl}`);
      break;
    }
  }
    return {
      website_url: url,
      page_title: $('title').text() || null,
      logo_url: logoUrl || null,
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
      homepageAltTextCoverage: homepageAltTextCoverage,
      tiktok_handle: extractHandle('tiktok') || null,
      other_links: otherLinks,
      raw_html: html,
    };
  } catch (err) {
    console.error(`Error scraping ${url}:`, err);
    return err instanceof Error ? err.message : 'Unknown error';
  }
}

