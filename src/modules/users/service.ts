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




// export async function add_userwebsite(user_id: string, website_url: string): Promise<{ website_id: string;}> {
//   const start = Date.now();

 
 

//   const responseTimeMs = Date.now() - start;
//   const newWebsite = await prisma.user_websites.create({
//     data: {
//       website_url: website_url,
//       users: { connect: { user_id } },
//     },
//     select: { website_id: true },
//   });

 
  
  

//   const website_id = newWebsite.website_id;
//   return {
//     website_id: website_id,
//     // responseTimeMs,
//   }
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

// export async function add_userwebsite( user_id: string,rawUrl: string) {
//   const websiteUrl = normalizeUrl(rawUrl);

//   // Step 1: Check if website exists
//   const existingWebsite = await prisma.user_websites.findFirst({
//     where: {
//       website_url: websiteUrl,
//       user_id,
//     },
//   });

//   let website_id: string;

//   if (existingWebsite) {
//     website_id = existingWebsite.website_id;

//     // Step 2: Check if a report already exists for this website
//     let existingReport = await prisma.report.findFirst({
//       where: { website_id },
//     });

//     if (existingReport) {
//       return { report_id: existingReport.report_id, website_id };
//     } else {
//       // Step 3: Create new report for existing website
//       const newReport = await prisma.report.create({
//         data: {
//           website_id,
//         },
//       });
//       return { report_id: newReport.report_id, website_id };
//     }
//   } else {
//     // Step 4: Create new website + report
//     const newWebsite = await prisma.user_websites.create({
//       data: {
//         website_url: websiteUrl,
//         user_id,
//         website_type: null,
//         website_name: null,
//       },
//     });

//     const newReport = await prisma.report.create({
//       data: {
//         website_id: newWebsite.website_id,
//       },
//     });

//     return { report_id: newReport.report_id, website_id: newWebsite.website_id };
//   }
// }




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

  // Step 3: Always create new report (even if website is reused)
  const newReport = await prisma.report.create({
    data: {
      website_id,
    },
  });

  return { report_id: newReport.report_id, website_id };
}
