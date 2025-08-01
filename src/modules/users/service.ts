import { PrismaClient } from "@prisma/client";
import { CreateUserDto, UpdateUserDto } from "./schema";

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


function normalizeUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    u.pathname = u.pathname.replace(/\/+$/, ""); // Remove trailing slashes
    return u.origin + u.pathname;
  } catch (e) {
    throw new Error("Invalid URL: " + url);
  }
}

export async function add_userwebsite(user_id: string, rawUrl: string) {
  const websiteUrl = normalizeUrl(rawUrl);

  // Step 1: Check if website already exists
  let existingWebsite = await prisma.user_websites.findFirst({
    where: {
      website_url: websiteUrl,
      user_id,
    },
  });

  let website_id: string;

  if (existingWebsite) {
    website_id = existingWebsite.website_id;
  } else {
    // Step 2: Create new website
    const newWebsite = await prisma.user_websites.create({
      data: {
        website_url: websiteUrl,
        user_id,
        website_type: null,
        website_name: null,
      },
    });

    website_id = newWebsite.website_id;
  }
   const matchingRequirement = await prisma.user_requirements.findFirst({
    where: {
      website_id,
      
    },
    select :{
      target_location:true,
      USP:true,
      primary_offering:true,
      industry:true,
      competitor_urls:true,
      target_audience:true
      


      },
  });
  // Step 3: Always create new report (even if website is reused)
  const newReport = await prisma.report.create({
    data: {
      website_id,
    },
  });

  return { report_id: newReport.report_id, website_id,matchingRequirement };
}
