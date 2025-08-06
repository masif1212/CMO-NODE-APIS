import { PrismaClient } from "@prisma/client";
import { CreateUserDto, UpdateUserDto } from "./schema";
import { parse } from 'tldts';
const prisma = new PrismaClient();

export const createUser = async (data: CreateUserDto) => {
  return prisma.users.create({
    data: {
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
    },
    select: {
      user_id: true,
      email: true,
      first_name: true,
      last_name: true,
      created_at: true,
    },
  });
};

export const updateUser = async (userId: string, data: UpdateUserDto) => {
  return prisma.users.update({
    where: { user_id: userId },
    data,
    select: {
      user_id: true,
      email: true,
      first_name: true,
      last_name: true,
      account_status: true,
      updated_at: true,
    },
  });
};

export const getUserById = async (userId: string) => {
  return prisma.users.findUnique({
    where: { user_id: userId },
    select: {
      user_id: true,
      email: true,
      first_name: true,
      last_name: true,
      account_status: true,
      is_email_verified: true,
      created_at: true,
      last_login: true,
    },
  });
};


// function normalizeUrl(url: string): string {
//   try {
//     const u = new URL(url.trim());
//     u.pathname = u.pathname.replace(/\/+$/, ""); // Remove trailing slashes
//     return u.origin + u.pathname;
//   } catch (e) {
//     throw new Error("Invalid URL: " + url);
//   }
// }

// export async function add_userwebsite(user_id: string, rawUrl: string) {
//   const websiteUrl = normalizeUrl(rawUrl);

//   // Step 1: Check if website already exists
//   let existingWebsite = await prisma.user_websites.findFirst({
//     where: {
//       website_url: websiteUrl,
//       user_id,
//     },
//   });

//   let website_id: string;

//   if (existingWebsite) {
//     website_id = existingWebsite.website_id;
//   } else {
//     // Step 2: Create new website
//     const newWebsite = await prisma.user_websites.create({
//       data: {
//         website_url: websiteUrl,
//         user_id,
//         website_type: null,
//         website_name: null,
//       },
//     });

//     website_id = newWebsite.website_id;
//   }
//    const matchingRequirement = await prisma.user_requirements.findFirst({
//     where: {
//       website_id,
      
//     },
//     select :{
//       target_location:true,
//       USP:true,
//       primary_offering:true,
//       industry:true,
//       competitor_urls:true,
//       target_audience:true
      


//       },
//   });
//   // Step 3: Always create new report (even if website is reused)
//   const newReport = await prisma.report.create({
//     data: {
//       website_id,
//     },
//   });

//   return { report_id: newReport.report_id, website_id,matchingRequirement };
// }





function normalizeUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    u.pathname = u.pathname.replace(/\/+$/, ""); // Remove trailing slashes
    return u.origin + u.pathname;
  } catch (e) {
    throw new Error("Invalid URL: " + url);
  }
}

function extractDomain(url: string): string {
  const parsed = parse(url);
  if (!parsed.domain) {
    throw new Error("Could not extract domain from URL: " + url);
  }
  return parsed.domain;
}

export async function add_userwebsite(user_id: string, rawUrl: string) {
  const websiteUrl = normalizeUrl(rawUrl);
  const domain = extractDomain(websiteUrl);
  console.log("domain",domain)
  // Step 1: Check if website with same domain exists for this user
  let existingWebsite = await prisma.user_websites.findFirst({
    where: {
      domain: domain,
      user_id,
    },
  });

  let website_id: string;

  if (existingWebsite) {
    // 🔹 Skip adding, reuse existing website
    website_id = existingWebsite.website_id;
    console.log("website exits already..")
  } else {
    console.log("website does not exits already..")
    // 🔹 Create new website if not already added
    const newWebsite = await prisma.user_websites.create({
      data: {
        website_url: websiteUrl,
        domain: domain,
        user_id,
        website_type: null,
        website_name: null,
      },
    });
    website_id = newWebsite.website_id;
  }

  // Step 2: Optionally fetch matching requirement (optional logic preserved)
  const matchingRequirement = await prisma.user_requirements.findFirst({
    where: { website_id },
    select: {
      target_location: true,
      USP: true,
      primary_offering: true,
      industry: true,
      competitor_urls: true,
      target_audience: true,
    },
  });

  // Step 3: Always create new report
  const newReport = await prisma.report.create({
    data: {
      website_id,
    },
  });

  return { report_id: newReport.report_id, website_id, matchingRequirement };
}
