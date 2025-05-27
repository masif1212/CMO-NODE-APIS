import axios from 'axios';
import * as cheerio from 'cheerio';

export async function scrapeWebsite(url: string) {
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
      // twitter_handle: extractHandle('twitter'),
      // facebook_handle: extractHandle('facebook'),
      // instagram_handle: extractHandle('instagram'),
      // linkedin_handle: extractHandle('linkedin'),
      // youtube_handle: extractHandle('youtube'),
      // tiktok_handle: extractHandle('tiktok'),
      // other_links: otherLinks,
      // raw_html: html,
    };
  } catch (err) {
    console.error(`Error scraping ${url}:`, err);
    return null;
  }
}
