
import axios from 'axios';
import {getDomainRoot} from "../../../utils/extractDomain"
const API_KEY = process.env.SCRAPPER_CREATOR_APIKEY;
const GOOGLE_ADS_URL = 'https://api.scrapecreators.com/v1/google/company/ads';
const headers = { 'x-api-key': API_KEY };



export const getgoogleAds = async (website_url: string) => {
  const domain = getDomainRoot(website_url);
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




