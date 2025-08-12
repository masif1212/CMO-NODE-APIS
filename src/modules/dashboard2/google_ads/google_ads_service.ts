
import axios from 'axios';

const API_KEY = process.env.SCRAPPER_CREATOR_APIKEY;
const GOOGLE_ADS_URL = 'https://api.scrapecreators.com/v1/google/company/ads';
import { parse } from 'tldts';
const headers = { 'x-api-key': API_KEY };



function extractDomain(url: string): string {
  const parsed = parse(url);
  if (!parsed.domain) {
    throw new Error("Could not extract domain from URL: " + url);
  }
  return parsed.domain;
}

export const getgoogleAds = async (website_url: string) => {
  const domain = extractDomain(website_url);
  console.log("domain", domain);
  const url = `${GOOGLE_ADS_URL}?domain=${domain}`;
  console.log("google ads url", url);

  try {
    console.log("calling google ads endpoint");
    const response = await axios.get(url, { headers });

    const data = response.data;

    if (Array.isArray(data)) {
      throw new Error("Unexpected response format");
    }


    return {
      google_ads_data: {
        ...data,
      }
    };

  } catch (error: any) {
    console.error("Error fetching google ads:", error);
    return { error: `Failed to fetch google ads: ${error.message}` };
  }
};




