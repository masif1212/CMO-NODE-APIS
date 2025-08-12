
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const API_KEY = process.env.SCRAPPER_CREATOR_APIKEY;
const linkedlin_PROFILE_URL = 'https://api.scrapecreators.com/v1/linkedin/company';

const headers = { 'x-api-key': API_KEY };







export const getlinkedinProfileFromScrapedData = async (linkedlin_handle: any) => {
  const cleanUrl = linkedlin_handle.trim().replace(/^https?:\/\//, '');
  console.log("cleanUrl", cleanUrl);
  const url = `${linkedlin_PROFILE_URL}?url=https://${cleanUrl}`;
  console.log("url", url);

  try {
    console.log("calling linkedin company endpoint");
    const response = await axios.get(url, { headers });

    const data = response.data;

    // --- Calculate total post count & posting frequency ---
    if (Array.isArray(data)) {
      throw new Error("Unexpected response format");
    }


    const totalPosts = data?.posts.length;
    console.log("totalPosts", totalPosts);


    return {
      linkedlin_data: {
        ...data,
        totalPosts,
      }
    };

  } catch (error: any) {
    console.error("Error fetching linkedin profile:", error);
    return { error: `Failed to fetch profile: ${error.message}` };
  }
};




