import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { parse } from 'tldts'; // For root domain extraction
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const prisma = new PrismaClient();

const getDomainRoot = (url: string): string => {
  const parsed = parse(url);
  return parsed.domain || '';
};

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


   

   await prisma.llm_responses.upsert({
  where: { website_id },
  update: { geo_llm: websiteFound.toString() }, // converts boolean to "true"/"false"
  create: { website_id, geo_llm: websiteFound.toString() },
});
    const traffic = await prisma.brand_traffic_analysis.findFirst({
      where: { website_id },
      orderBy: { created_at: "desc" },
      select: {
        top_sources: true,
      },
    })

    const sources = traffic?.top_sources as any[]; // assuming it's JSON array
    // const bingSource = sources?.find(
    //   (src) => src.name?.toLowerCase().includes("bing.com"||"bing")
    // );  

    const bingSource = sources?.find((src) =>
      ["bing", "bing.com"].some((kw) => src.name?.toLowerCase().includes(kw))
    ) ?? { type: "source", name: "bing.com", sessions: 0 };

    const schema = await prisma.website_scraped_data.findUnique(
  {
    where : {website_id},
    select: {
      schema_analysis: true
    }
  }
) 
    return {


      AI_Discoverability: {
        found: websiteFound.toString()
      },

      SearchBotcrawlability: {
          message: schema && schema.schema_analysis
            ? (typeof schema.schema_analysis === "string"
                ? JSON.parse(schema.schema_analysis).message
                : (typeof schema.schema_analysis === "object" && schema.schema_analysis !== null && "message" in schema.schema_analysis
                  ? (schema.schema_analysis as { message?: string }).message
                  : undefined))
            : "No schema data found.",
          valid: schema?.schema_analysis
            ? (typeof schema.schema_analysis === "string"
                ? JSON.parse(schema.schema_analysis).schemas?.summary
                : (typeof schema.schema_analysis === "object" && schema.schema_analysis !== null && "schemas" in schema.schema_analysis
                    ? (schema.schema_analysis as { schemas?: { summary?: any } }).schemas?.summary
                    : null))
            : null
      },

      bingSource: bingSource

    };
  } catch (error: any) {
    throw new Error(`OpenAI Error: ${error.message}`);
  }
};
