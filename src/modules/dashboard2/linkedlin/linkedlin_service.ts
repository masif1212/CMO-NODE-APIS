
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const API_KEY = process.env.SCRAPPER_CREATOR_APIKEY;
const linkedin_PROFILE_URL = 'https://api.scrapecreators.com/v1/linkedin/company';

const headers = { 'x-api-key': API_KEY };


// export const getlinkedinProfileFromScrapedData = async (linkedin_handle: string) => {
//   try {
//     // --- Remove query params like ?feedView=all ---
//     // let cleanUrl = linkedin_handle.split("?")[0];

//     // --- If URL contains a subpage (posts, about, people, life, etc.), trim back to company root ---
//     // cleanUrl = cleanUrl.replace(/\/(posts|about|people|life)(\/.*)?$/, "");
//     // cleanUrl = cleanUrl.replace(/\/(posts|about|people|life|admin|feed)(\/.*)?$/, "");

//     // // --- Ensure https:// prefix ---
//     // if (!/^https?:\/\//i.test(cleanUrl)) {
//     //   cleanUrl = `https://${cleanUrl}`;
//     // }

//     // // --- Resolve redirects (important for aliases) ---
//     // let finalUrl = cleanUrl;
//     // try {
//     //   const redirectCheck = await axios.head(cleanUrl, { maxRedirects: 0, validateStatus: (s) => s >= 200 && s < 400 });
//     //   if (redirectCheck.status >= 300 && redirectCheck.status < 400 && redirectCheck.headers.location) {
//     //     finalUrl = redirectCheck.headers.location;
//     //     // Sometimes LinkedIn returns relative paths
//     //     if (!/^https?:\/\//i.test(finalUrl)) {
//     //       const base = new URL(cleanUrl);
//     //       finalUrl = `${base.origin}${finalUrl}`;
//     //     }
//     //     console.log(`Redirected LinkedIn handle: ${cleanUrl} → ${finalUrl}`);
//     //   }
//     // } catch (redirectErr: any) {
//     //   // If HEAD fails (403, 999 from LinkedIn), fall back to original
//     //   console.warn(`Redirect check failed for ${cleanUrl}:`, redirectErr.message);
//     // }

//     // --- Normalize LinkedIn company URL ---
// let cleanUrl = linkedin_handle.split("?")[0];

// // Remove known subpages
// cleanUrl = cleanUrl.replace(/\/(posts|about|people|life|admin|feed)(\/.*)?$/, "");

// // Ensure https:// prefix
// if (!/^https?:\/\//i.test(cleanUrl)) {
//   cleanUrl = `https://${cleanUrl}`;
// }
// console.log("Normalized LinkedIn URL:", cleanUrl);
// let finalUrl = cleanUrl;

// try {
//   const redirectCheck = await axios.head(cleanUrl, {
//     maxRedirects: 0,
//     validateStatus: (s) => s >= 200 && s < 400,
//   });
//   console.log("Redirect check status:", redirectCheck.status);
//   if (
//     redirectCheck.status >= 300 &&
//     redirectCheck.status < 400 &&
//     redirectCheck.headers.location
//   ) {
//     console.log("Redirect location:", redirectCheck.headers.location);
//     const redirectUrl = redirectCheck.headers.location;

//     if (/\/uas\/login/i.test(redirectUrl)) {
//       // Redirected to login → keep original clean URL
//       finalUrl = cleanUrl;
//     } else if (/linkedin\.com\/company\//i.test(redirectUrl)) {
//       // Redirected to another company handle → follow
//       finalUrl = redirectUrl.startsWith("http")
//         ? redirectUrl
//         : new URL(redirectUrl, new URL(cleanUrl).origin).toString();
//     }
//   }
// } catch (redirectErr: any) {
//   console.warn(`Redirect check failed for ${cleanUrl}:`, redirectErr.message);
//   // fallback stays as cleanUrl
// }
//   console.log("Final LinkedIn URL for scraping:", finalUrl);
//     // --- Use final URL for scraper API ---
//     const url = `${linkedlin_PROFILE_URL}?url=${encodeURIComponent(finalUrl)}`;
//     // console.log("LinkedIn company API URL:", finalUrl);

//     // --- Call Scraper ---
//     const response = await axios.get(url, { headers });
//     const data = response.data;

//     if (!data || typeof data !== "object") {
//       throw new Error("Unexpected response format");
//     }

//     const totalPosts = data?.posts?.length || 0;
//     return { linkedlin_data: { ...data, totalPosts, linkedin_handle, cleanUrl: finalUrl } };

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
//         description: `Unknown error (handle: ${linkedin_handle})`,
//         linkedin_handle,
//       }
//     };
//   }
// };




export const getlinkedinProfileFromScrapedData = async (linkedin_handle: string) => {
  try {
    if (!linkedin_handle) {
      throw new Error("LinkedIn handle is required");
    }

    // --- Step 1: Normalize LinkedIn URL ---
    let cleanUrl = linkedin_handle.split("?")[0];

    // Remove subpages like /about, /posts, /people, /life, /feed, /admin
    cleanUrl = cleanUrl.replace(/\/(posts|about|people|life|admin|feed)(\/.*)?$/, "");

    // Ensure https:// prefix
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = `https://${cleanUrl}`;
    }

    // Ensure it's a LinkedIn company URL
    if (!/linkedin\.com\/company\//i.test(cleanUrl)) {
      return {
        linkedlin_data: {
          success: false,
          error: "invalid_company_url",
          errorStatus: 400,
          description: `Not a valid LinkedIn company URL (handle: ${linkedin_handle})`,
          linkedin_handle,
        },
      };
    }

    let finalUrl = cleanUrl;
    console.log("Normalized LinkedIn URL:", cleanUrl);

    // --- Step 2: Resolve redirects (but avoid login trap) ---
    try {
      const redirectCheck = await axios.get(cleanUrl, {
        maxRedirects: 0,
        validateStatus: (s) => s >= 200 && s < 400,
      });

      if (
        redirectCheck.status >= 300 &&
        redirectCheck.status < 400 &&
        redirectCheck.headers.location
      ) {
        const redirectUrl = redirectCheck.headers.location;
        console.log("Redirect location:", redirectUrl);

        if (/\/uas\/login/i.test(redirectUrl)) {
          console.warn("Redirected to login → blocking");
          return {
            linkedlin_data: {
              success: false,
              error: "blocked_by_login",
              errorStatus: 403,
              description: `LinkedIn requires login for this handle (handle: ${linkedin_handle})`,
              linkedin_handle,
            },
          };
        } else if (/linkedin\.com\/company\//i.test(redirectUrl)) {
          // Redirected to another valid company handle
          finalUrl = redirectUrl.startsWith("http")
            ? redirectUrl
            : new URL(redirectUrl, new URL(cleanUrl).origin).toString();
          console.log(`Redirected LinkedIn handle: ${cleanUrl} → ${finalUrl}`);
        }
      }
    } catch (redirectErr: any) {
      console.warn(`Redirect check failed for ${cleanUrl}:`, redirectErr.message);
      // fallback stays as cleanUrl
    }

    console.log("Final LinkedIn URL for scraping:", finalUrl);

    // --- Step 3: Call Scraper API ---
    const apiUrl = `${linkedin_PROFILE_URL}?url=${encodeURIComponent(finalUrl)}`;

    try {
      const response = await axios.get(apiUrl, { headers });
      const data = response.data;

      if (!data || typeof data !== "object") {
        throw new Error("Unexpected response format from scraper");
      }

      const totalPosts = data?.posts?.length || 0;
      return {
        linkedlin_data: {
          ...data,
          totalPosts,
          linkedin_handle,
          cleanUrl: finalUrl,
          success: true,
        },
      };
    } catch (scrapeErr: any) {
      return {
        linkedlin_data: {
          success: false,
          error: "scrape_failed",
          errorStatus: scrapeErr.response?.status || 500,
          description: `Scraper failed: ${
            scrapeErr.response?.data || scrapeErr.message
          } (handle: ${linkedin_handle})`,
          linkedin_handle,
        },
      };
    }
  } catch (error: any) {
    console.error("Error fetching LinkedIn profile:", error?.message);
    return {
      linkedlin_data: {
        success: false,
        error: "internal_error",
        errorStatus: 500,
        description: `${error.message} (handle: ${linkedin_handle})`,
        linkedin_handle,
      },
    };
  }
};
