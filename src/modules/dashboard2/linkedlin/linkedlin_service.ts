
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const API_KEY = process.env.SCRAPPER_CREATOR_APIKEY;
const linkedlin_PROFILE_URL = 'https://api.scrapecreators.com/v1/linkedin/company';

const headers = { 'x-api-key': API_KEY };



// export const getlinkedinProfileFromScrapedData = async (linkedin_handle: string) => {
//   try {
//     let cleanUrl = linkedin_handle.trim();

//     // --- Normalize LinkedIn URL ---
//     // Remove query params like ?feedView=all
//     cleanUrl = cleanUrl.split("?")[0];

//     // If it's a posts page → trim it to company home
//     cleanUrl = cleanUrl.replace(/\/posts\/?$/, "");

//     // Ensure https:// prefix
//     if (!/^https?:\/\//i.test(cleanUrl)) {
//       cleanUrl = `https://${cleanUrl}`;
//     }

//     const url = `${linkedlin_PROFILE_URL}?url=${encodeURIComponent(cleanUrl)}`;
//     console.log("LinkedIn company API URL:", url);

//     // --- Call Scraper ---
//     const response = await axios.get(url, { headers });
//     const data = response.data;

//     if (!data || typeof data !== "object") {
//       throw new Error("Unexpected response format");
//     }

//     const totalPosts = data?.posts?.length || 0;
//     return { linkedlin_data: { ...data, totalPosts, linkedin_handle } };

//   } catch (error: any) {
//     console.error("Error fetching linkedin profile:", error?.message);

//     // ScrapeCreators returns structured JSON on error
//     if (error.response?.data) {
//       return {
//         linkedlin_data: {
//           success: false,
//           error: error.response.data.error || "scrape_failed",
//           errorStatus: error.response.status || 500,
//           description: error.response.data.message || "Unknown error from scraper",
//           linkedin_handle:linkedin_handle,
//         }
//       };
//     }

//     // Fallback if no structured payload
//     return {
//       linkedlin_data: {
//         success: false,
//         error: "internal_error",
//         errorStatus: 500,
//         description: error.message || "Something went wrong fetching LinkedIn data",
//         linkedin_handle:linkedin_handle,

//       }
//     };
//   }
// };


export const getlinkedinProfileFromScrapedData = async (linkedin_handle: string) => {
  try {

    // --- Remove query params like ?feedView=all ---
    let cleanUrl = linkedin_handle.split("?")[0];

    // --- If URL contains a subpage (posts, about, people, life, etc.), trim back to company root ---
    cleanUrl = cleanUrl.replace(/\/(posts|about|people|life)(\/.*)?$/, "");

    // --- Ensure https:// prefix ---
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = `https://${cleanUrl}`;
    }

    const url = `${linkedlin_PROFILE_URL}?url=${encodeURIComponent(cleanUrl)}`;
    console.log("LinkedIn company API URL:", cleanUrl);

    // --- Call Scraper ---
    const response = await axios.get(url, { headers });
    const data = response.data;

    if (!data || typeof data !== "object") {
      throw new Error("Unexpected response format");
    }

    const totalPosts = data?.posts?.length || 0;
    return { linkedlin_data: { ...data, totalPosts, linkedin_handle,cleanUrl } };

  } catch (error: any) {
    console.error("Error fetching linkedin profile:", error?.message);

    if (error.response?.data) {
      return {
        linkedlin_data: {
          success: false,
          error: error.response.data.error || "scrape_failed",
          errorStatus: error.response.status || 500,
          description: `${error.response.data.message || "Unknown error from scraper"} (handle: ${linkedin_handle})`,
          linkedin_handle,
        }
      };
    }

    return {
      linkedlin_data: {
        success: false,
        error: "internal_error",
        errorStatus: 500,
        description: `${error.response.data.message || "Unknown error from scraper"} (handle: ${linkedin_handle})`,
        linkedin_handle,
      }
    };
  }
};




