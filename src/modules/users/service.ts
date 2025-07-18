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




export async function add_userwebsite(user_id: string, website_url: string): Promise<{ website_id: string;}> {
  const start = Date.now();

 
 

  const responseTimeMs = Date.now() - start;
  const newWebsite = await prisma.user_websites.create({
    data: {
      website_url: website_url,
      users: { connect: { user_id } },
    },
    select: { website_id: true },
  });

 
  
  

  const website_id = newWebsite.website_id;
  return {
    website_id: website_id,
    // responseTimeMs,
  }
}