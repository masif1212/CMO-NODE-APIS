// import { OpenAI } from 'openai';
// import dotenv from 'dotenv';
// import { PrismaClient } from '@prisma/client';

// dotenv.config();

// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// const prisma = new PrismaClient();

// export const fetchLegalAIBrands = async (
//   user_id: string,
//   website_id: string
// ): Promise<any> => {
//   // Step 1: Validate website exists for user and get website URL
//   const websiteEntry = await prisma.user_websites.findUnique({
//     where: {
//       user_id_website_id: { user_id, website_id },
//     },
//   });

//   if (!websiteEntry) {
//     throw new Error(`Website entry not found for this user and website.`);
//   }

//   const websiteUrl = websiteEntry.website_url;

//   // Step 2: Get or create user_requirements
//   let userReq = await prisma.user_requirements.findFirst({
//     where: {
//       user_id,
//       website_id,
//     },
//     orderBy: {
//       created_at: 'desc',
//     },
//   });

//   if (!userReq) {
//     userReq = await prisma.user_requirements.create({
//       data: {
//         user_id,
//         website_id,
//         industry: '',
//         region_of_operation: '',
//         target_location: '',
//         target_audience: '',
//         property_id: '',
//         access_token: '',
//       },
//     });
//   }

//   const {
//     industry,
//     region_of_operation,
//     target_location,
//     target_audience,
//   } = userReq;

//   // Step 3: Build natural language context phrase
//   const parts = [];
//   if (region_of_operation) parts.push(`in ${region_of_operation}`);
//   if (industry) parts.push(`in the ${industry} industry`);
//   if (target_location) parts.push(`targeting ${target_location}`);
//   if (target_audience) parts.push(`for the ${target_audience}`);
//   const contextPhrase = parts.length > 0 ? parts.join(', ') : '';

//   // Step 4: Create prompt
//   const prompt = `
// You are a business research assistant.

// List the top 10 brands${contextPhrase ? ' ' + contextPhrase : ''}.

// For each brand, provide:
// 1. Brand Name
// 2. Official website URL

// Respond with a JSON array of objects with the keys:
// - brand_name
// - website
// `.trim();
//   console.log('Prompt:', prompt); // Debugging line
//   try {
//     // Step 5: Call OpenAI API
//     const response = await openai.chat.completions.create({
//       model: 'gpt-4',
//       messages: [{ role: 'user', content: prompt }],
//     });

//     const content = response.choices[0]?.message?.content?.trim();
//     if (!content) throw new Error('Empty OpenAI response');

//     // Step 6: Try parsing the JSON from the response
//     let parsedBrands = [];
//     try {
//       parsedBrands = JSON.parse(content);
//       if (!Array.isArray(parsedBrands)) {
//         throw new Error('Parsed content is not an array');
//       }
//     } catch {
//       // If parsing fails, store raw content and exit early
//       await prisma.llm_responses.upsert({
//         where: { website_id },
//         update: { geo_llm: content },
//         create: { website_id, geo_llm: content },
//       });
//       return { raw: content, website_found: false };
//     }

//     // Step 7: Check if user's website URL is in any brand website URLs
//     const normalizedUserUrl = websiteUrl.toLowerCase().replace(/\/$/, '');
//     const websiteFound = parsedBrands.some((brand: any) => {
//       if (typeof brand.website !== 'string') return false;
//       const normalizedBrandUrl = brand.website.toLowerCase().replace(/\/$/, '');
//       return normalizedBrandUrl === normalizedUserUrl;
//     });

//     // Step 8: Save combined info to geo_llm column (JSON string with extra field)
//     const saveData = JSON.stringify({
//       brands: parsedBrands,
//       user_website_found: websiteFound,
//     });

//     await prisma.llm_responses.upsert({
//       where: { website_id },
//       update: { geo_llm: saveData },
//       create: { website_id, geo_llm: saveData },
//     });

//     return { data: parsedBrands, website_found: websiteFound };
//   } catch (error: any) {
//     throw new Error(`OpenAI Error: ${error.message}`);
//   }
// };



import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const prisma = new PrismaClient();

export const fetchLegalAIBrands = async (
  user_id: string,
  website_id: string
): Promise<any> => {
  // Step 1: Validate website exists for user and get website URL
  const websiteEntry = await prisma.user_websites.findUnique({
    where: {
      user_id_website_id: { user_id, website_id },
    },
  });

  if (!websiteEntry) {
    throw new Error(`Website entry not found for this user and website.`);
  }

  const websiteUrl = websiteEntry.website_url;

  // Step 2: Get or create user_requirements
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
        property_id: '',
        access_token: '',
      },
    });
  }

  const {
    industry,
    region_of_operation,
    target_location,
    target_audience,
  } = userReq;

  // Step 3: Build natural language context phrase
  const parts = [];
  if (region_of_operation) parts.push(`in ${region_of_operation}`);
  if (industry) parts.push(`in the ${industry} industry`);
  if (target_location) parts.push(`targeting ${target_location}`);
  if (target_audience) parts.push(`for the ${target_audience}`);
  const contextPhrase = parts.length > 0 ? parts.join(', ') : '';

  // Step 4: Create prompt
  const prompt = `
You are a business research assistant.

List the top 10 brands${contextPhrase ? ' ' + contextPhrase : ''}.

For each brand, provide:
1. Brand Name
2. Official website URL

Respond with a JSON array of objects with the keys:
- brand_name
- website
`.trim();
  
  console.log('Prompt:', prompt); // Debugging line

  try {
    // Step 5: Call OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) throw new Error('Empty OpenAI response');

    // Step 6: Try parsing the JSON from the response
    let parsedBrands = [];
    try {
      parsedBrands = JSON.parse(content);
      if (!Array.isArray(parsedBrands)) {
        throw new Error('Parsed content is not an array');
      }
    } catch {
      // If parsing fails, store raw content and exit early
      await prisma.llm_responses.upsert({
        where: { website_id },
        update: { geo_llm: content },
        create: { website_id, geo_llm: content },
      });
      return { raw: content, website_found: false, message: 'Unable to parse brands list from AI response.' };
    }

    // Step 7: Check if user's website URL is in any brand website URLs
    const normalizedUserUrl = websiteUrl.toLowerCase().replace(/\/$/, '');
    const websiteFound = parsedBrands.some((brand: any) => {
      if (typeof brand.website !== 'string') return false;
      const normalizedBrandUrl = brand.website.toLowerCase().replace(/\/$/, '');
      return normalizedBrandUrl === normalizedUserUrl;
    });

    // Step 8: Save combined info to geo_llm column (JSON string with extra field)
    const saveData = JSON.stringify({
      brands: parsedBrands,
      user_website_found: websiteFound,
    });

    await prisma.llm_responses.upsert({
      where: { website_id },
      update: { geo_llm: saveData },
      create: { website_id, geo_llm: saveData },
    });

    // Step 9: Return data with a user-friendly message
    const message = websiteFound
      ? 'Congratulations! Your brand is listed among the top brands.'
      : 'Sorry, your brand does not appear in the top brands. You might want to improve your marketing strategy or online presence.';

    return { data: parsedBrands, website_found: websiteFound, message };
  } catch (error: any) {
    throw new Error(`OpenAI Error: ${error.message}`);
  }
};
