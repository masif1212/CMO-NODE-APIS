import axios from 'axios';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';



const prisma = new PrismaClient();

export async function scrapeWebsite(url: string,website_id: string) {
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
      
    return {
      website_url: url,
      page_title: $('title').text() || null,
      meta_description: $('meta[name="description"]').attr('content') || null,
      meta_keywords: $('meta[name="keywords"]').attr('content') || null,
      og_title: $('meta[property="og:title"]').attr('content') || null,
      og_description: $('meta[property="og:description"]').attr('content') || null,
      og_image: $('meta[property="og:image"]').attr('content') || null,
      twitter_handle: extractHandle('twitter')|| null,
      facebook_handle: extractHandle('facebook') || null,
      instagram_handle: extractHandle('instagram')|| null,
      linkedin_handle: extractHandle('linkedin')|| null,
      youtube_handle: extractHandle('youtube')|| null,
      tiktok_handle: extractHandle('tiktok')|| null,
      other_links: otherLinks,
      raw_html: html,
    };
  } catch (err) {
    console.error(`Error scraping ${url}:`, err);
    return null;
  }
}



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
    
    return {
      website_url: url,
      page_title: $('title').text() || null,
      meta_description: $('meta[name="description"]').attr('content') || null,
      meta_keywords: $('meta[name="keywords"]').attr('content') || null,
      og_title: $('meta[property="og:title"]').attr('content') || null,
      og_description: $('meta[property="og:description"]').attr('content') || null,
      og_image: $('meta[property="og:image"]').attr('content') || null,
      twitter_handle: extractHandle('twitter')|| null,
      facebook_handle: extractHandle('facebook') || null,
      instagram_handle: extractHandle('instagram')|| null,
      linkedin_handle: extractHandle('linkedin')|| null,
      youtube_handle: extractHandle('youtube')|| null,
      tiktok_handle: extractHandle('tiktok')|| null,
      other_links: otherLinks,
      // raw_html: html,
    };
  } catch (err) {
    console.error(`Error scraping ${url}:`, err);
    return null;
  }
}

export async function scrapeAndSaveWebsite(website_url: string, website_id: string) {
  const scrapedMain = await scrapeWebsite(website_url, website_id);
  if (!scrapedMain) {
    throw new Error(`Failed to scrape main website: ${website_url}`);
  }

  // Upsert all scraped data into DB
  const upsertedData = await prisma.website_scraped_data.upsert({
    where: { website_id },
    update: {
      ...scrapedMain,
      updated_at: new Date(),
    },
    create: {
      website_id,
      ...scrapedMain,
      scraped_at: new Date(),
      updated_at: new Date(),
    },
  });

  // Pick only the fields you want to return (remove fields like 'other_links', etc)
  const cleanedData = {
    website_url: upsertedData.website_url,
    page_title: upsertedData.page_title,
    meta_description: upsertedData.meta_description,
    meta_keywords: upsertedData.meta_keywords,
    og_description: upsertedData.og_description,
    og_title: upsertedData.og_title,
    og_image: upsertedData.og_image,
    twitter_handle: upsertedData.twitter_handle,
    facebook_handle: upsertedData.facebook_handle,
    instagram_handle: upsertedData.instagram_handle,
    linkedin_handle: upsertedData.linkedin_handle,
    youtube_handle: upsertedData.youtube_handle,
    tiktok_handle: upsertedData.tiktok_handle,
    
    // add any other fields you want to keep in response
  };

  return cleanedData;
}
