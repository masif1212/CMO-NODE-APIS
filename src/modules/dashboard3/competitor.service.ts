import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { scrapeWebsitecompetitos,scrapeAndSaveWebsite } from './scraper';
import { fetchCompetitorsFromLLM, extractCompetitorDataFromLLM,createComparisonPrompt } from './llm';
import { parseCompetitorData } from './parser';
import { getPageSpeedData } from './pagespeed';
import OpenAI from 'openai';
import 'dotenv/config';

export const openai = new OpenAI({
     apiKey: process.env.OPENAI_API_KEY
});


const prisma = new PrismaClient();

export class CompetitorService {
  static async process(website_url: string, user_id: string) {
    if (!website_url || !user_id) {
      throw new Error('website_url and user_id are required');
    }

    const website_id = uuidv4();
    await prisma.user_websites.create({
      data: {
        website_id,
        user_id,
        website_url,
      },
    });

    const scrapedMain = await scrapeAndSaveWebsite(website_url,website_id);
    if (!scrapedMain) {
      throw new Error(`Failed to scrape main website: ${website_url}`);
    }

    // const mainWebsiteData = await prisma.website_scraped_data.upsert({
    //   where: { website_id },
    //   update: { ...scrapedMain, updated_at: new Date() },
    //   create: { website_id, ...scrapedMain },
    //   include: { competitor_details: true },
    // });

    // 🔥 Get PageSpeed and Save to brand_website_analysis
    const pageSpeed = await getPageSpeedData(website_url);
    if (pageSpeed) {
      await prisma.brand_website_analysis.create({
        data: {
          website_id,
          performance_score: pageSpeed.categories.performance || null,
          seo_score: pageSpeed.categories.seo || null,
          accessibility_score: pageSpeed.categories.accessibility || null,
          best_practices_score: pageSpeed.categories.best_practices || null,
          // pwa_score: pageSpeed.categories.pwa || null, // Removed because 'pwa' does not exist on type
          first_contentful_paint: pageSpeed.audits?.first_contentful_paint?.display_value || null,
          largest_contentful_paint: pageSpeed.audits?.largest_contentful_paint?.display_value || null,
          total_blocking_time: pageSpeed.audits?.total_blocking_time?.display_value || null,
          speed_index: pageSpeed.audits?.speed_index?.display_value || null,
          cumulative_layout_shift: pageSpeed.audits?.cumulative_layout_shift?.display_value || null,
          time_to_interactive: pageSpeed.audits?.interactive?.display_value || null,
          // total_broken_links: pageSpeed.total_broken_links || null,
          // broken_links: pageSpeed.broken_links || [],
        },
      });
    }

const userRequirementRaw = await prisma.user_requirements.findFirst({
  where: { website_id },
});

const userRequirement = {
  industry: userRequirementRaw?.industry ?? 'Unknown',
  region_of_operation: userRequirementRaw?.region_of_operation ?? 'Unknown',
  target_location: userRequirementRaw?.target_location ?? 'Unknown',
  target_audience: userRequirementRaw?.target_audience ?? 'Unknown',
  primary_offering: userRequirementRaw?.primary_offering ?? 'Unknown',
  USP: userRequirementRaw?.USP ?? 'Unknown',
  competitor_urls: userRequirementRaw?.competitor_urls ?? '',
};

    const competitorUrls: string[] = userRequirement?.competitor_urls
      ? userRequirement.competitor_urls.split(',').map(u => u.trim()).filter(Boolean)
      : [];

    const competitorResults = [];

    const competitorPromises = competitorUrls.filter(u => u.startsWith('http')).map(async (compUrl) => {
      try {
        const scraped = await scrapeWebsitecompetitos(compUrl);
        if (!scraped) throw new Error('Scrape failed');

        const competitorData = await extractCompetitorDataFromLLM(scraped);
        if (!competitorData) throw new Error('LLM parsing failed');

        const competitor_id = uuidv4();
        const savedCompetitor = await prisma.competitor_details.create({
          data: {
            competitor_id,
            website_id,
            name: competitorData.name || scraped.page_title || compUrl,
            competitor_website_url: compUrl,
            industry: competitorData.industry || userRequirement?.industry || 'Unknown',
            region: competitorData.region || userRequirement?.region_of_operation || 'Unknown',
            target_audience: competitorData.target_audience || userRequirement?.target_audience || 'Unknown',
            primary_offering: competitorData.primary_offering || userRequirement?.primary_offering || 'Unknown',
            usp: competitorData.usp || 'No clear USP identified',
          },
        });

        await prisma.competitor_data.upsert({
          where: { competitor_id },
          update: { ...scraped, updated_at: new Date() },
          create: { competitor_id, website_id, ...scraped },
        });

        const pageSpeedData = await getPageSpeedData(compUrl);
        if (pageSpeedData) {
          await prisma.competitor_data.update({
            where: { competitor_id },
            data: { page_speed: pageSpeedData },
          });
        }

        // Save additional scraped fields to competitor_data if needed
        await prisma.competitor_data.update({
          where: { competitor_id },
          data: {
            // Add any additional fields you want to persist
            page_title: scraped.page_title,
            meta_description: scraped.meta_description,
            og_description: scraped.og_description,
            og_title: scraped.og_title,
            og_image: scraped.og_image,
          },
        });

        return {
          ...savedCompetitor,
          page_speed: pageSpeedData || null,
          meta: {
            page_title: scraped.page_title,
            meta_description: scraped.meta_description,
            og_description: scraped.og_description,
            og_title: scraped.og_title,
            og_image: scraped.og_image,
            
          },
        };
      } catch (err: any) {
        console.error(`Failed processing competitor ${compUrl}: ${err.message}`);
        return null;
      }
    });

    const results = await Promise.allSettled(competitorPromises);
    for (const res of results) {
      if (res.status === 'fulfilled' && res.value) {
        competitorResults.push(res.value);
      }
    }

    const competitorsToGenerate = Math.max(0, 3 - competitorResults.length);
    if (competitorsToGenerate > 0) {
      try {
        const aiResponse = await fetchCompetitorsFromLLM(scrapedMain, userRequirement, competitorsToGenerate);

        await prisma.website_scraped_data.update({
          where: { website_id },
          data: { ai_response: aiResponse },
        });

        const parsedCompetitors = parseCompetitorData(aiResponse);
        for (const comp of parsedCompetitors) {
          if (!comp.website_url?.startsWith('http')) continue;
          if (
            competitorUrls.includes(comp.website_url) ||
            competitorResults.some(r => r.competitor_website_url === comp.website_url)
          ) continue;

          try {
            const competitor_id = uuidv4();
            const savedCompetitor = await prisma.competitor_details.create({
              data: {
                competitor_id,
                website_id,
                name: comp.name,
                competitor_website_url: comp.website_url,
                industry: comp.industry,
                region: comp.region,
                target_audience: comp.target_audience,
                primary_offering: comp.primary_offering,
                usp: comp.usp,
              },
            });

            const scraped = await scrapeWebsitecompetitos(comp.website_url);
            if (scraped) {
              await prisma.competitor_data.upsert({
                where: { competitor_id },
                update: { ...scraped, updated_at: new Date() },
                create: { competitor_id, website_id, ...scraped },
              });

              const pageSpeedData = await getPageSpeedData(comp.website_url);
              if (pageSpeedData) {
                await prisma.competitor_data.update({
                  where: { competitor_id },
                  data: { page_speed: pageSpeedData },
                });
              }

              competitorResults.push({
                ...savedCompetitor,
                page_speed: pageSpeedData || null,
                meta_data: {
                  page_title: scraped.page_title,
                  meta_keywords: scraped.meta_keywords,
                  meta_description: scraped.meta_description,
                  og_description: scraped.og_description,
                  og_title: scraped.og_title,
                  og_image: scraped.og_image,
                  facebook_handler: scraped.facebook_handle,
                  twitter_handler:scraped.twitter_handle,
                  tikok_handler:scraped.tiktok_handle,
                  youtube_handler:scraped.youtube_handle,
                  linkedin_handle:scraped.linkedin_handle,
                  instagram_handle:scraped.instagram_handle,




              
                },
              });
            }
          } catch (err: any) {
            console.error(`AI fallback competitor error for ${comp.website_url}:`, err.message);
          }
        }
      } catch (err: any) {
        console.error(`Error during AI fallback competitor fetch: ${err.message}`);
      }
    }

    const labeledResults: Record<string, any> = {};
    competitorResults.forEach((result, idx) => {
      labeledResults[`competitor${idx + 1}`] = result;
    });

    // ✅ Fetch and include brand website analysis
    const brandWebsiteAnalysis = await prisma.brand_website_analysis.findFirst({
      where: { website_id },
      orderBy: { created_at: 'desc' },
    });

    labeledResults['mainWebsite'] = {
      website: scrapedMain,
      brandWebsiteAnalysis: brandWebsiteAnalysis ?? null,
    };

    await prisma.analysis_status.upsert({
      where: {
        user_id_website_id: {
          user_id,
          website_id,
        },
      },
      update: {
        competitor_analysis: "1",
      },
      create: {
        user_id,
        website_id,
        competitor_analysis: "1",
      },
    });

    return labeledResults;
  }




static async getComparisonRecommendations(website_id: string) {
  const mainWebsite = await prisma.user_websites.findUnique({
    where: { website_id },
    include: {
      website_scraped_data: true,
      brand_website_analysis: {
        orderBy: { created_at: 'desc' },
        take: 1,
      },
    },
  });

  if (!mainWebsite) {
    throw new Error('Website not found');
  }

  const competitors = await prisma.competitor_details.findMany({
    where: { website_id },
    include: {
      competitor_data: true,
    },
  });

  const main = {
    website_url: mainWebsite.website_url,
    meta: {
      title: mainWebsite.website_scraped_data?.page_title || 'N/A',
      meta_keywords: mainWebsite.website_scraped_data?.meta_keywords || 'N/A',
      meta_description: mainWebsite.website_scraped_data?.meta_description || 'N/A',
      og_description: mainWebsite.website_scraped_data?.og_description || 'N/A',
      facebook_handle:mainWebsite.website_scraped_data?.facebook_handle || 'N/A',
      twitter_handle: mainWebsite.website_scraped_data?.twitter_handle || 'N/A',
      youtube_handle: mainWebsite.website_scraped_data?.youtube_handle || 'N/A',
      instagram_handle: mainWebsite.website_scraped_data?.instagram_handle || 'N/A',
      linkedin_handle: mainWebsite.website_scraped_data?.linkedin_handle || 'N/A',
      tiktok_handle: mainWebsite.website_scraped_data?.tiktok_handle || 'N/A',
      og_title: mainWebsite.website_scraped_data?.og_title || 'N/A',
      og_image: mainWebsite.website_scraped_data?.og_image || 'N/A',
      
    },
    page_speed: {
      performance_score: mainWebsite.brand_website_analysis?.[0]?.performance_score ?? 'N/A',
      seo_score: mainWebsite.brand_website_analysis?.[0]?.seo_score ?? 'N/A',
      accessibility_score: mainWebsite.brand_website_analysis?.[0]?.accessibility_score ?? 'N/A',
      best_practices_score: mainWebsite.brand_website_analysis?.[0]?.best_practices_score ?? 'N/A',
      time_to_interactive: mainWebsite.brand_website_analysis?.[0]?.time_to_interactive ?? 'N/A',
      speed_index: mainWebsite.brand_website_analysis?.[0]?.speed_index ?? 'N/A',
      largest_contentful_paint: mainWebsite.brand_website_analysis?.[0]?.largest_contentful_paint ?? 'N/A',
      total_blocking_time: mainWebsite.brand_website_analysis?.[0]?.total_blocking_time ?? 'N/A',
      cumulative_layout_shift: mainWebsite.brand_website_analysis?.[0]?.cumulative_layout_shift ?? 'N/A',
      // total_broken_links: mainWebsite.brand_website_analysis?.[0]?.total_broken_links ?? 'N/A',
      // broken_links: mainWebsite.brand_website_analysis?.[0]?.broken_links ?? [],
      // audit_details: mainWebsite.brand_website_analysis?.[0]?.audit_details ?? [],
      
    },
  };

  const comps = competitors.map(comp => {
    const scraped = comp.competitor_data;
    let ps: any = scraped?.page_speed ?? {};
    if (typeof ps === 'string') {
      try {
        ps = JSON.parse(ps);
      } catch {
        ps = {};
      }
    }
    const audits = ps.audits ?? {};
    const categories = ps.categories ?? {};

    return {
      name: comp.name,
      website_url: comp.competitor_website_url,
      meta: {
        title: scraped?.page_title || 'N/A',
        meta_keywords:scraped?.meta_keywords || 'N/A',
        meta_description: scraped?.meta_description || 'N/A',
        og_description: scraped?.og_description || 'N/A',
        facbook_handler:scraped?.facebook_handle || 'N/A',
        instagram_handler:scraped?.instagram_handle || 'N/A',
        twitter_hanlder:scraped?.twitter_handle || 'N/A',
        youtube_handle: scraped?.youtube_handle || 'N/A',
        instagram_handle: scraped?.instagram_handle || 'N/A',
        linkedin_handle: scraped?.linkedin_handle || 'N/A',
        tiktok_handle: scraped?.tiktok_handle || 'N/A',
        og_title: scraped?.og_title || 'N/A',
        og_image: scraped?.og_image || 'N/A',


      },
      page_speed: {
        performance_score: categories.performance ?? 'N/A',
        seo_score: categories.seo ?? 'N/A',
        accessibility_score: categories.accessibility ?? 'N/A',
        best_practices_score: categories.best_practices ?? 'N/A',
        time_to_interactive: audits.interactive?.display_value ?? 'N/A',
        speed_index: audits.speed_index?.display_value ?? 'N/A',
        largest_contentful_paint: audits.largest_contentful_paint?.display_value ?? 'N/A',
        total_blocking_time: audits.total_blocking_time?.display_value ?? 'N/A',
        cumulative_layout_shift: audits.cumulative_layout_shift?.display_value ?? 'N/A',
      },
    };
  });

  const prompt = createComparisonPrompt(main, comps);
  console.log('Generated prompt for LLM:', prompt);

  const response = await openai.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'gpt-4o',
    temperature: 0.7,
    max_tokens: 3000,
  });

  return {
    recommendations: response.choices[0].message.content,
  };
}


}


