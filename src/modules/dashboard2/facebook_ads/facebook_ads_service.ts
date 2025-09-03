
import axios from 'axios';

const API_KEY = process.env.SCRAPPER_CREATOR_APIKEY;
const FACEBOOK_ADS_URL = 'https://api.scrapecreators.com/v1/facebook/adLibrary/company/ads';
import { parse } from 'tldts';
const headers = { 'x-api-key': API_KEY };



function extractCompanyName(url: string): string {
  const parsed = parse(url);
  if (!parsed.domain) {
    throw new Error("Could not extract domain from URL: " + url);
  }
  // remove the TLD (.com, .net, etc.)
  return parsed.domain.split(".")[0];
}

export const getfacebookAds = async (website_url: string) => {
  const name = extractCompanyName(website_url);
  console.log("name for facebook add", name);
  const url = `${FACEBOOK_ADS_URL}?companyName=${name}&media_type=ALL&trim=true`;
  console.log("facebook ads url", url);

  try {
    console.log("calling facebook ads endpoint");
    const response = await axios.get(url, { headers });

    const data = response.data;

    if (Array.isArray(data)) {
      throw new Error("Unexpected response format");
    }


    return {
      facebook_ads_data: {
        ...data,
      }
    };

  } catch (error: any) {
    console.error("Error fetching facebook ads:", error);
    return { error: `Failed to fetch facebook ads: ${error.message}` };
  }
};




