import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const createBrandProfile = async (
  user_id: string,
  website_id: string,
  data: {
    brand_offering?: string;
    usp?: string;
    industry?: string;
    location?: string;
    target_audience?: string;
    competitor_urls?: string[];
    
  
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
  if (data.location) {
    saveData.region_of_operation = data.location;
    saveData.target_location = data.location;
  }
  if (data.target_audience) saveData.target_audience = data.target_audience;
  if (data.brand_offering) saveData.primary_offering = data.brand_offering;
  if (data.usp) saveData.USP = data.usp;
  if (data.competitor_urls) saveData.competitor_urls = data.competitor_urls;

  if (existing) {
    return await prisma.user_requirements.update({
      where: { requirement_id: existing.requirement_id },
      data: saveData,
    });
  } else {
    return await prisma.user_requirements.create({ data: saveData });
  }
};


export const createuserType = async (
  user_id: string,
  
    user_type?: string,
    
 
  
) => {
  const existing = await prisma.users.findFirst({
    where: { user_id},
  });

  const saveData: any = {
    user_type: user_type,
  };


  if (existing) {
    return await prisma.users.update({
      where: { user_id: existing.user_id },
      data: saveData,
    });
  } else {
    return await prisma.user_requirements.create({ data: saveData });
  }
};

