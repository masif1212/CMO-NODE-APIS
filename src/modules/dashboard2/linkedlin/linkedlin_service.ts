
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const API_KEY = process.env.SCRAPPER_CREATOR_APIKEY;
const linkedlin_PROFILE_URL = 'https://api.scrapecreators.com/v1/linkedin/company';

const headers = { 'x-api-key': API_KEY };



// export const getlinkedinProfileFromScrapedData = async (linkedin_handle: string) => {
//   try {

//     // --- Remove query params like ?feedView=all ---
//     let cleanUrl = linkedin_handle.split("?")[0];

//     // --- If URL contains a subpage (posts, about, people, life, etc.), trim back to company root ---
//     cleanUrl = cleanUrl.replace(/\/(posts|about|people|life)(\/.*)?$/, "");

//     // --- Ensure https:// prefix ---
//     if (!/^https?:\/\//i.test(cleanUrl)) {
//       cleanUrl = `https://${cleanUrl}`;
//     }

//     const url = `${linkedlin_PROFILE_URL}?url=${encodeURIComponent(cleanUrl)}`;
//     console.log("LinkedIn company API URL:", cleanUrl);

//     // --- Call Scraper ---
//     const response = await axios.get(url, { headers });
//     const data = response.data;

//     if (!data || typeof data !== "object") {
//       throw new Error("Unexpected response format");
//     }

//     const totalPosts = data?.posts?.length || 0;
//     return { linkedlin_data: { ...data, totalPosts, linkedin_handle,cleanUrl } };

//   } catch (error: any) {
//     console.error("Error fetching linkedin profile:", error?.message);

//     if (error.response?.data) {
//       return {
//         linkedlin_data: {
//           success: false,
//           error: error.response.data.error || "scrape_failed",
//           errorStatus: error.response.status || 500,
//           description: `${error.response.data.message || "Unknown error from scraper"} (handle: ${linkedin_handle})`,
//           linkedin_handle,
//         }
//       };
//     }

//     return {
//       linkedlin_data: {
//         success: false,
//         error: "internal_error",
//         errorStatus: 500,
//         description: `${error.response.data.message || "Unknown error from scraper"} (handle: ${linkedin_handle})`,
//         linkedin_handle,
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

    // --- Resolve redirects (important for aliases) ---
    let finalUrl = cleanUrl;
    try {
      const redirectCheck = await axios.head(cleanUrl, { maxRedirects: 0, validateStatus: (s) => s >= 200 && s < 400 });
      if (redirectCheck.status >= 300 && redirectCheck.status < 400 && redirectCheck.headers.location) {
        finalUrl = redirectCheck.headers.location;
        // Sometimes LinkedIn returns relative paths
        if (!/^https?:\/\//i.test(finalUrl)) {
          const base = new URL(cleanUrl);
          finalUrl = `${base.origin}${finalUrl}`;
        }
        console.log(`Redirected LinkedIn handle: ${cleanUrl} → ${finalUrl}`);
      }
    } catch (redirectErr: any) {
      // If HEAD fails (403, 999 from LinkedIn), fall back to original
      console.warn(`Redirect check failed for ${cleanUrl}:`, redirectErr.message);
    }

    // --- Use final URL for scraper API ---
    const url = `${linkedlin_PROFILE_URL}?url=${encodeURIComponent(finalUrl)}`;
    console.log("LinkedIn company API URL:", finalUrl);

    // --- Call Scraper ---
    const response = await axios.get(url, { headers });
    const data = response.data;

    if (!data || typeof data !== "object") {
      throw new Error("Unexpected response format");
    }

    const totalPosts = data?.posts?.length || 0;
    return { linkedlin_data: { ...data, totalPosts, linkedin_handle, cleanUrl: finalUrl } };

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
        description: `Unknown error (handle: ${linkedin_handle})`,
        linkedin_handle,
      }
    };
  }
};
