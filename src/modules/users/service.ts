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

function normalizeUrl(url: string): string {
  try {
    let cleanUrl = url.trim();

    // If URL doesn't start with http:// or https://, add https://
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = "https://" + cleanUrl;
    }

    const u = new URL(cleanUrl);
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

function extractCompanyName(url: string): string {
  const parsed = parse(url);
  if (!parsed.domain) {
    throw new Error("Could not extract domain from URL: " + url);
  }
  // remove the TLD (.com, .net, etc.)
  return parsed.domain.split(".")[0];
}

export async function add_userwebsite(user_id: string, rawUrl: string) {
  const websiteUrl = normalizeUrl(rawUrl);
  const website_name = extractCompanyName(rawUrl);
  const domain = extractDomain(websiteUrl);
  console.log("domain", domain);

  let existingWebsite = await prisma.user_websites.findFirst({
    where: {
      domain,
      user_id,
    },
  });

  let website_id: string;
  let website_exists = false;
  let matchingRequirement = null;
  let social_media_handlers = null;
  if (existingWebsite) {
    website_exists = true;
    website_id = existingWebsite.website_id;
    console.log("website exists already..");
  } else {
    console.log("website does not exist already , adding domain..");
    const newWebsite = await prisma.user_websites.create({
      data: {
        website_url: websiteUrl,
        domain,
        user_id,
        website_type: null,
        website_name: website_name,
      },
    });
    website_id = newWebsite.website_id;
  }

  // Step 2: fetch matching requirement if website exists
  if (website_exists) {
  const Requirement = await prisma.user_requirements.findUnique({
    where: { website_id },
    select: {
      target_location: true,
      USP: true,
      primary_offering: true,
      industry: true,
      competitor_urls: true,
      target_audience: true,
      facebook_handle: true,
      instagram_handle: true,
      twitter_handle: true,
      youtube_handle: true,
      linkedin_handle: true,
      tiktok_handle: true,
    },
  });

  matchingRequirement = {
    target_location: Requirement?.target_location,
    USP: Requirement?.USP,
    primary_offering: Requirement?.primary_offering,
    industry: Requirement?.industry,
    competitor_urls: Requirement?.competitor_urls,
    target_audience: Requirement?.target_audience,
  };

  social_media_handlers = {
    facebook_handle: Requirement?.facebook_handle,
    instagram_handle: Requirement?.instagram_handle,
    // twitter_handle: Requirement?.twitter_handle,
    youtube_handle: Requirement?.youtube_handle,
    // linkedin_handle: Requirement?.linkedin_handle,
    // tiktok_handle: Requirement?.tiktok_handle,
  };
  }
  // Step 3: Always create new report
  const newReport = await prisma.report.create({
    data: { website_id },
  });

  return {
    // message: website_exists
    //   ? "Website already exists for this user."
    //   : "New website successfully added.",
    website_exists,
    report_id: newReport.report_id,
    website_id,
  
    matchingRequirement,
    social_media_handlers,
  };
}
