import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const createBrandProfile = async (
  user_id: string,
  website_id: string,
  data: {
    brand_offering?: string;
    usp?: string;
    target_location:string;
    industry?: string;
    location?: string;
    target_audience?: string;
    competitor_urls?: string[];
    focus_areas?: string;
    industry_size?: string;
     
  }
  
) => {
  const existing = await prisma.user_requirements.findFirst({
    where: { user_id, website_id },
  });

  const saveData: any = {
    user_id,
    website_id,
  };





  if (data.industry) saveData.industry = data.industry;
  if (data.target_location) {
    // saveData.region_of_operation = data.location;
    saveData.target_location = data.target_location;
  }
  if (data.target_audience) saveData.target_audience = data.target_audience;
  if (data.brand_offering) saveData.primary_offering = data.brand_offering;
  if (data.usp) saveData.USP = data.usp;
  if (data.competitor_urls) saveData.competitor_urls = data.competitor_urls;
  if (data.focus_areas) saveData.focus_areas = data.focus_areas;
  if (data.industry_size) saveData.industry_size = data.industry_size;
  if (existing) {
    return await prisma.user_requirements.update({
      where: { requirement_id: existing.requirement_id },
      data: saveData,
    });
  } else {
    return await prisma.user_requirements.create({ data: saveData });
  }
};




