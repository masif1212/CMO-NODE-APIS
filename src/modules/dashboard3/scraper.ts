import axios from 'axios';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';
import { validateComprehensiveSchema, SchemaOutput } from "./schema_validation";
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import { parse } from 'tldts'; // For root domain extraction
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const getDomainRoot = (url: string): string => {
  const parsed = parse(url);
  return parsed.domain || '';
};



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

    const homepage_alt_text_coverage = totalImages > 0 ? Math.round((imagesWithAlt / totalImages) * 100) : 0;
    const schemaAnalysisData: SchemaOutput = await validateComprehensiveSchema(url);
    console.log("schemaAnalysisData",schemaAnalysisData)
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
      homepage_alt_text_coverage:   homepage_alt_text_coverage,
      tiktok_handle: extractHandle('tiktok') || null,
      other_links: otherLinks,
      schema_analysis:schemaAnalysisData || null,
      raw_html: html,
    };
  } catch (err) {
    console.error(`Error scraping ${url}:`, err);
    return err instanceof Error ? err.message : 'Unknown error';
  }
}


export const fetchBrands = async (
  user_id: string,
  website_id: string
): Promise<any> => {
  const websiteEntry = await prisma.user_websites.findUnique({
    where: {
      user_id_website_id: { user_id, website_id },
    },
  });

  if (!websiteEntry) {
    throw new Error(`Website entry not found for this user and website.`);
  }
  console.log('Website Entry in geo', websiteEntry);
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
      await prisma.llm_responses.upsert({
        where: { website_id },
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

    await prisma.llm_responses.upsert({
      where: { website_id },
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

