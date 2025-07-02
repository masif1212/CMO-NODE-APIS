import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { scrapeWebsitecompetitos ,fetchBrands} from './scraper';
import { fetchCompetitorsFromLLM, extractCompetitorDataFromLLM, createComparisonPrompt } from './llm';
import { parseCompetitorData } from './parser';
import { getPageSpeedData } from './pagespeed';
import OpenAI from 'openai';
import 'dotenv/config';
import * as cheerio from "cheerio";
import axios from 'axios';


export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
const model = process.env.OPENAI_MODEL || 'gpt-4.1';

const prisma = new PrismaClient();



async function getWebsiteUrlById(user_id: string, website_id: string): Promise<string> {
  const website = await prisma.user_websites.findUnique({

    where: {
      user_id_website_id: {
        user_id,
        website_id,
      },
    },
    select: {
      website_url: true,
    },
  });

  if (!website?.website_url) {
    throw new Error(`No URL found for user_id: ${user_id} and website_id: ${website_id}`);
  }

  return website.website_url;
}


// function processSeoAudits(auditData: any[]): { passedAudits: { title: string; description: string }[]; failedAudits: { title: string; description: string }[] } {
//   const passedAudits: { title: string; description: string }[] = [];
//   const failedAudits: { title: string; description: string }[] = [];

//   if (!Array.isArray(auditData)) {
//     return { passedAudits: [], failedAudits: [] };
//   }

//   for (const audit of auditData) {
//     // Skip the structured-data audit
//     if (audit?.id === 'structured-data') {
//       continue;
//     }

//     // Define user-friendly titles and descriptions based on audit ID
//     let userFriendlyTitle: string;
//     let userFriendlyDescription: string;

//     switch (audit?.id) {
//       case 'is-crawlable':
//         userFriendlyTitle = 'Page is accessible to search engines';
//         userFriendlyDescription = 'Your page allows search engines to find and index it, making it visible in search results.';
//         break;
//       case 'document-title':
//         userFriendlyTitle = 'Page has a clear title';
//         userFriendlyDescription = 'Your page has a title that helps users and search engines understand its content.';
//         break;
//       case 'meta-description':
//         userFriendlyTitle = 'Page has a meta description';
//         userFriendlyDescription = 'Your page includes a short summary that appears in search results, helping users know what it’s about.';
//         break;
//       case 'http-status-code':
//         userFriendlyTitle = 'Page loads correctly';
//         userFriendlyDescription = 'Your page returns a successful status code, ensuring search engines can access it properly.';
//         break;
//       case 'link-text':
//         userFriendlyTitle = 'Links have clear text';
//         userFriendlyDescription = 'Your links use descriptive text, making it easier for users and search engines to understand them.';
//         break;
//       case 'crawlable-anchors':
//         userFriendlyTitle = 'Links are easy to follow';
//         userFriendlyDescription = 'Your links are set up correctly, allowing search engines to explore your website effectively.';
//         break;
//       case 'robots-txt':
//         userFriendlyTitle = 'Robots.txt file is correct';
//         userFriendlyDescription = 'Your robots.txt file is properly configured, guiding search engines on how to crawl your site.';
//         break;
//       case 'image-alt':
//         userFriendlyTitle = 'Images have descriptive alt text';
//         userFriendlyDescription = 'Your images include alt text, helping search engines and screen readers understand them.';
//         break;
//       case 'hreflang':
//         userFriendlyTitle = 'Language settings are correct';
//         userFriendlyDescription = 'Your page correctly specifies its language, helping search engines show it to the right audience.';
//         break;
//       case 'canonical':
//         userFriendlyTitle = 'Page has a canonical link';
//         userFriendlyDescription = 'Your page uses a canonical link to tell search engines the preferred version, avoiding duplicate content issues.';
//         break;
//       default:
//         userFriendlyTitle = audit?.title || 'Unknown Audit';
//         userFriendlyDescription = audit?.description || 'No description available';
//     }

//     // Create audit entry
//     const auditEntry = {
//       title: userFriendlyTitle,
//       description: userFriendlyDescription,
//     };

//     // Categorize based on score
//     if (audit?.score === 1) {
//       passedAudits.push(auditEntry);
//     } else if (audit?.score === 0) {
//       failedAudits.push(auditEntry);
//     }
//   }

//   return { passedAudits, failedAudits };
// }
// export class CompetitorService {
//   // Helper function to validate URLs (retained for other parts of the code)
//   static async isValidCompetitorUrl(url: string, competitorName?: string): Promise<boolean> {
//     try {
//       new URL(url);
//       if (!/^https?:\/\//.test(url)) return false;
//     } catch {
//       return false;
//     }

//     const blocklist = [
//       'facebook.com',
//       'twitter.com',
//       'google.com',
//       'youtube.com',
//       'instagram.com',
//       'linkedin.com',
//       'tiktok.com',
//       'example.com',
//       'nonexistent.com',
//     ];

//     const { hostname } = new URL(url);
//     if (blocklist.some(blocked => hostname.includes(blocked))) {
//       console.log(`URL ${url} is in blocklist`);
//       return false;
//     }

//     if (competitorName) {
//       const normalizedName = competitorName.toLowerCase().replace(/\s+/g, '');
//       if (!hostname.toLowerCase().includes(normalizedName)) {
//         console.log(`URL ${url} does not match competitor name ${competitorName}`);
//         return false;
//       }
//     }

//     try {
//       const response = await axios.head(url, { timeout: 5000 });
//       return response.status >= 200 && response.status < 400;
//     } catch (err) {
//       console.log(`URL ${url} is inaccessible: ${err instanceof Error ? err.message : err}`);
//       return false;
//     }
//   }

//   // Helper function to extract H1
//   static extractH1(rawHtml: string | null): string {
//     if (!rawHtml) return 'Not Found';
//     const $ = cheerio.load(rawHtml);
//     return $('h1').first().text().trim() || 'Not Found';
//   }
 


//   static async process(website_id: string, user_id: string) {
//     if (!website_id || !user_id) {
//       throw new Error('website_id and user_id are required');
//     }

//     console.log(`Getting website URL for user_id ${user_id}, website_id: ${website_id}`);
//     const website_url = await getWebsiteUrlById(user_id, website_id);
//     if (!website_url) {
//       throw new Error(`No website URL found for user_id: ${user_id} and website_id: ${website_id}`);
//     }
//     console.log('Website URL retrieved:', website_url);

//     const [scrapedMain, analysis, userRequirementRaw] = await Promise.all([
//       prisma.website_scraped_data.findUnique({ where: { website_id } }),
//       prisma.brand_website_analysis.findFirst({
//         where: { website_id },
//         orderBy: { created_at: 'desc' },
//       }),
//       prisma.user_requirements.findFirst({ where: { website_id } }),
//     ]);

//     // Extract H1
//     const h1Text = this.extractH1(scrapedMain?.raw_html ?? null);

//     // Fetch and save PageSpeed data if it doesn't exist
//     if (!analysis?.performance_score) {
//       console.log(`Fetching PageSpeed data for ${website_url}`);
//       const pageSpeed = await getPageSpeedData(website_url);
//       if (pageSpeed) {
//         await prisma.brand_website_analysis.create({
//           data: {
//             website_id,
//             performance_score: pageSpeed.categories.performance || null,
//             seo_score: pageSpeed.categories.seo || null,
//             accessibility_score: pageSpeed.categories.accessibility || null,
//             best_practices_score: pageSpeed.categories.best_practices || null,
//             first_contentful_paint: pageSpeed.audits?.first_contentful_paint?.display_value || null,
//             largest_contentful_paint: pageSpeed.audits?.largest_contentful_paint?.display_value || null,
//             total_blocking_time: pageSpeed.audits?.total_blocking_time?.display_value || null,
//             speed_index: pageSpeed.audits?.speed_index?.display_value || null,
//             cumulative_layout_shift: pageSpeed.audits?.cumulative_layout_shift?.display_value || null,
//             time_to_interactive: pageSpeed.audits?.interactive?.display_value || null,
//             audit_details:pageSpeed.audit_details
//           },
//         });
//       }
//     } else {
//       console.log(`PageSpeed data already exists for ${website_url}`);
//     }

//     const userRequirement = {
//       industry: userRequirementRaw?.industry ?? 'Unknown',
//       region_of_operation: userRequirementRaw?.region_of_operation ?? 'Unknown',
//       target_location: userRequirementRaw?.target_location ?? 'Unknown',
//       target_audience: userRequirementRaw?.target_audience ?? 'Unknown',
//       primary_offering: userRequirementRaw?.primary_offering ?? 'Unknown',
//       USP: userRequirementRaw?.USP ?? 'Unknown',
//       competitor_urls: Array.isArray(userRequirementRaw?.competitor_urls)
//         ? userRequirementRaw.competitor_urls
//         : [],
//     };

//     const competitorUrls: string[] = Array.isArray(userRequirement.competitor_urls)
//       ? (userRequirement.competitor_urls.filter((url): url is string => typeof url === 'string'))
//       : [];
//     const competitorResults = [];
//     const processedUrls = new Set<string>();
//     const processedNames = new Set<string>();

//     // Helper function to handle schema_markup_status
//     const getSchemaMarkupStatus = (scraped: any) => {
//       if (typeof scraped === 'object' && scraped !== null && 'schema_analysis' in scraped) {
//         const schema = scraped.schema_analysis;
//         if (typeof schema === 'string') {
//           try {
//             return JSON.parse(schema);
//           } catch (error) {
//             console.error(`Failed to parse schema_analysis for ${scraped.website_url}: ${error instanceof Error ? error.message : String(error)}`);
//             return schema;
//           }
//         } else if (schema !== undefined && schema !== null) {
//           return schema;
//         }
//       }
//       return null;
//     };

    
//     // const result = await fetchBrands(user_id, website_id);
//    const llmResponse = await prisma.llm_responses.findUnique({
//     where: { website_id: website_id },
//     select:{
//     geo_llm : true
//     }
//   });

//   let result: any;
//   if (llmResponse?.geo_llm === null) {
//     console.log("no geo llm response found")
//     result = await fetchBrands(user_id, website_id);
//     await prisma.analysis_status.upsert({
//   where: {
//     user_id_website_id: {
//       user_id: user_id ?? '',
//       website_id: website_id,
//     },
//   },
//   update: { geo_llm: result },
//   create: {
//     user_id: user_id ?? '',
//     website_id: website_id,
//     geo_llm: result,
//   },
// })
//   } else {
//     result = llmResponse?.geo_llm;
//     console.log("geo llm found")
//   }
   
  
//     // Process user-provided competitor URLs
//     const competitorPromises = competitorUrls.filter(u => u.startsWith('http')).map(async (compUrl) => {
//       try {
//         const scraped = await scrapeWebsitecompetitos(compUrl);
//         if (!scraped || typeof scraped !== 'object') throw new Error('Scrape failed');

//         const competitorData = await extractCompetitorDataFromLLM(scraped);
//         if (!competitorData) throw new Error('LLM parsing failed');

//         const competitorName = competitorData.name || scraped.page_title || compUrl;

//         if (processedUrls.has(compUrl) || processedNames.has(competitorName)) {
//           console.log(`Skipping duplicate competitor: ${competitorName} (${compUrl})`);
//           return null;
//         }

//         const competitor_id = uuidv4();
//         const savedCompetitor = await prisma.competitor_details.create({
//           data: {
//             competitor_id,
//             website_id,
//             name: competitorName,
//             competitor_website_url: compUrl,
//             industry: competitorData.industry || userRequirement.industry || 'Unknown',
//             region: competitorData.region || userRequirement.region_of_operation || 'Unknown',
//             target_audience: competitorData.target_audience || userRequirement.target_audience || 'Unknown',
//             primary_offering: competitorData.primary_offering || userRequirement.primary_offering || 'Unknown',
//             usp: competitorData.usp || 'No clear USP identified',
//           },
//         });

//         await prisma.competitor_data.upsert({
//           where: { competitor_id },
//           update: {
//             ...(typeof scraped === 'object' && scraped !== null
//               ? {
//                   ...scraped,
//                   schema_analysis:
//                     scraped.schema_analysis && typeof scraped.schema_analysis === 'object'
//                       ? JSON.stringify(scraped.schema_analysis)
//                       : scraped.schema_analysis,
//                 }
//               : {}),
//             updated_at: new Date(),
//           },
//           create: {
//             competitor_id,
//             website_id,
//             ...(typeof scraped === 'object' && scraped !== null
//               ? {
//                   ...scraped,
//                   schema_analysis:
//                     scraped.schema_analysis && typeof scraped.schema_analysis === 'object'
//                       ? JSON.stringify(scraped.schema_analysis)
//                       : scraped.schema_analysis,
//                 }
//               : {}),
//             website_url: scraped.website_url ?? compUrl,
//           },
//         });

//         const pageSpeedData = await getPageSpeedData(compUrl);
//         if (pageSpeedData) {
//           await prisma.competitor_data.update({
//             where: { competitor_id },
//             data: { page_speed: pageSpeedData },
//           });
//         }

//         const h1_Text = (typeof scraped === 'object' && scraped !== null && 'raw_html' in scraped && scraped.raw_html)
//           ? cheerio.load(scraped.raw_html)('h1').first().text().trim() || null
//           : null;

//         processedUrls.add(compUrl);
//         processedNames.add(competitorName);

//         return {
//           brand_profile: {
//             title: competitorName,
//             industry: competitorData.industry || userRequirement.industry || 'Unknown',
//             unique_selling_point: competitorData.usp || 'No clear USP identified',
//             primary_offering: competitorData.primary_offering || userRequirement.primary_offering || 'Unknown',
//             logo_url: (typeof scraped === 'object' && scraped !== null && 'logo_url' in scraped) ? scraped.logo_url : null,

//             website_url:competitorData.competitor_website_url || '', 
//             meta_description: (typeof scraped === 'object' && scraped !== null && 'meta_description' in scraped) ? scraped.meta_description : null,

//           },
//           website_audit: pageSpeedData ? {
//                 performance_insights: {
//                   performance: pageSpeedData.categories.performance || null,
//                   seo: pageSpeedData.categories.seo || null,
//                   accessibility: pageSpeedData.categories.accessibility || null,
//                   best_practices: pageSpeedData.categories.best_practices || null,
//                 },
//                 website_health_matrix: {
//                   speed_index: {
//                       display_value: pageSpeedData.audits?.speed_index?.display_value || 'N/A',
//                       score: pageSpeedData.audits?.speed_index?.score || null,
//                     },
//                   total_blocking_time: {
//                     display_value: pageSpeedData.audits?.total_blocking_time?.display_value || 'N/A',
//                     score: pageSpeedData.audits?.total_blocking_time?.score || null,
//                   },
//                   first_contentful_paint: {
//                     display_value: pageSpeedData.audits?.first_contentful_paint?.display_value || 'N/A',
//                     score: pageSpeedData.audits?.first_contentful_paint?.score || null,
//                   },
//                   largest_contentful_paint: {
//                     display_value: pageSpeedData.audits?.largest_contentful_paint?.display_value || 'N/A',
//                     score: pageSpeedData.audits?.largest_contentful_paint?.score || null,
//                   },
//                   cumulative_layout_shift: {
//                     display_value: pageSpeedData.audits?.cumulative_layout_shift?.display_value || 'N/A',
//                     score: pageSpeedData.audits?.cumulative_layout_shift?.score || null,
//                   },
//                 },
//               }
//             : null,
//           seo_audit: {
//             h1_heading: h1_Text,
//             meta_title: (typeof scraped === 'object' && scraped !== null && 'page_title' in scraped) ? scraped.page_title : null,
//             meta_description: (typeof scraped === 'object' && scraped !== null && 'meta_description' in scraped) ? scraped.meta_description : null,
//             alt_text_coverage: (typeof scraped === 'object' && scraped !== null && 'homepage_alt_text_coverage' in scraped) ? scraped.homepage_alt_text_coverage : null,
//             schema_markup_status: getSchemaMarkupStatus(scraped),
//             AI_Discoverability: "true",
//             // brandAuditseo: pageSpeedData && pageSpeedData.brandAuditseo ? pageSpeedData.brandAuditseo.seo || null : null,
//              brandAuditseo: pageSpeedData && pageSpeedData.audit_details.seoAudits ? pageSpeedData.audit_details.seoAudits || null : null,


//           },
//         };
//       } catch (err) {
//         console.error(`Failed processing competitor ${compUrl}: ${err instanceof Error ? err.message : err}`);
//         return null;
//       }
//     });

//     const results = await Promise.allSettled(competitorPromises);
//     for (const res of results) {
//       if (res.status === 'fulfilled' && res.value) {
//         competitorResults.push(res.value);
//       }
//     }

//     // Ensure at least 3 unique, valid competitors
//     const MIN_COMPETITORS = 3;
//     const MAX_RETRIES = 4;
//     let retryCount = 0;

//     while (competitorResults.length < MIN_COMPETITORS && retryCount < MAX_RETRIES) {
//       try {
//         const competitorsToGenerate = 6;
//         console.log(`Fetching ${competitorsToGenerate} additional competitors (Retry ${retryCount + 1})`);

//         const aiResponse = await fetchCompetitorsFromLLM(
//           scrapedMain,
//           userRequirement,
//           competitorsToGenerate,
//           Array.from(processedUrls),
//           Array.from(processedNames)
//         );

//         await prisma.website_scraped_data.update({
//           where: { website_id },
//           data: { ai_response: aiResponse },
//         });

//         const parsedCompetitors = parseCompetitorData(aiResponse);

//         interface ParsedCompetitor {
//           competitor_website_url: string;
//           website_url: string;
//           name: string;
//           industry?: string;
//           region?: string;
//           target_audience?: string;
//           primary_offering?: string;
//           usp?: string;
//         }
//         for (const comp of parsedCompetitors.slice(0, MIN_COMPETITORS - competitorResults.length) as ParsedCompetitor[]) {
//           const url: string = (comp as ParsedCompetitor).website_url;
//           const name: string = (comp as ParsedCompetitor).name;

//           if (processedUrls.has(url) || processedNames.has(name) || competitorUrls.includes(url) || competitorResults.some(r => r.brand_profile.title === name)) {
//             console.log(`Skipping duplicate competitor: ${name} (${url})`);
//             continue;
//           }

//           try {
//             const competitor_id = uuidv4();
//             const savedCompetitor = await prisma.competitor_details.create({
//               data: {
//                 competitor_id,
//                 website_id,
//                 name,
//                 competitor_website_url: url,
//                 industry: comp.industry,
//                 region: comp.region,
//                 target_audience: comp.target_audience,
//                 primary_offering: comp.primary_offering,
//                 usp: comp.usp,
//               },
//             });

//             const scraped = await scrapeWebsitecompetitos(url);
//             if (scraped) {
//               await prisma.competitor_data.upsert({
//                 where: { competitor_id },
//                 update: {
//                   ...(typeof scraped === 'object' && scraped !== null
//                     ? {
//                         ...scraped,
//                         schema_analysis:
//                           scraped.schema_analysis && typeof scraped.schema_analysis === 'object'
//                             ? JSON.stringify(scraped.schema_analysis)
//                             : scraped.schema_analysis,
//                       }
//                     : {}),
//                   updated_at: new Date(),
//                 },
//                 create: {
//                   competitor_id,
//                   website_id,
//                   ...(typeof scraped === 'object' && scraped !== null
//                     ? {
//                         ...scraped,
//                         schema_analysis:
//                           scraped.schema_analysis && typeof scraped.schema_analysis === 'object'
//                             ? JSON.stringify(scraped.schema_analysis)
//                             : scraped.schema_analysis,
//                       }
//                     : {}),
//                   website_url: (typeof scraped === 'object' && scraped !== null && 'website_url' in scraped) ? scraped.website_url : url,
//                 },
//               });

//               const pageSpeedData = await getPageSpeedData(url);
//               if (pageSpeedData) {
//                 await prisma.competitor_data.update({
//                   where: { competitor_id },
//                   data: { page_speed: pageSpeedData },
//                 });
//               }

//               const h1_Text = (typeof scraped === 'object' && scraped !== null && 'raw_html' in scraped && scraped.raw_html)
//                 ? cheerio.load(scraped.raw_html)('h1').first().text().trim() || null
//                 : null;

//               competitorResults.push({
//                 brand_profile: {
//                   title: name,
//                   industry: comp.industry || userRequirement.industry || 'Unknown',
//                   unique_selling_point: comp.usp || 'No clear USP identified',
//                   primary_offering: comp.primary_offering || userRequirement.primary_offering || 'Unknown',
//                   logo_url: (typeof scraped === 'object' && scraped !== null && 'logo_url' in scraped) ? scraped.logo_url : null,
//                   website_url:comp.website_url || '', 
//                   meta_description: (typeof scraped === 'object' && scraped !== null && 'meta_description' in scraped) ? scraped.meta_description : null,

//                 },
//                 website_audit: pageSpeedData ? {
//                   performance_insights: {
//                     performance: pageSpeedData.categories.performance || null,
//                     seo: pageSpeedData.categories.seo || null,
//                     accessibility: pageSpeedData.categories.accessibility || null,
//                     best_practices: pageSpeedData.categories.best_practices || null,
//                   },
//                   website_health_matrix: {
//                     speed_index: {
//                       display_value: pageSpeedData.audits?.speed_index?.display_value || 'N/A',
//                       score: pageSpeedData.audits?.speed_index?.score || null,
//                     },

//                     total_blocking_time: {
//                       display_value: pageSpeedData.audits?.total_blocking_time?.display_value || 'N/A',
//                       score: pageSpeedData.audits?.total_blocking_time?.score || null,
//                     },
//                     first_contentful_paint: {
//                       display_value: pageSpeedData.audits?.first_contentful_paint?.display_value || 'N/A',
//                       score: pageSpeedData.audits?.first_contentful_paint?.score || null,
//                     },

                    
//                     largest_contentful_paint: {
//                       display_value: pageSpeedData.audits?.largest_contentful_paint?.display_value || 'N/A',
//                       score: pageSpeedData.audits?.largest_contentful_paint?.score || null,
//                     },
//                     cumulative_layout_shift: {
//                       display_value: pageSpeedData.audits?.cumulative_layout_shift?.display_value || 'N/A',
//                       score: pageSpeedData.audits?.cumulative_layout_shift?.score || null,
//                     },
//                   },  } : null,
//                   seo_audit: {
//                     h1_heading: h1_Text,
//                     meta_title: (typeof scraped === 'object' && scraped !== null && 'page_title' in scraped) ? scraped.page_title : null,
//                     meta_description: (typeof scraped === 'object' && scraped !== null && 'meta_description' in scraped) ? scraped.meta_description : null,
//                     alt_text_coverage: (typeof scraped === 'object' && scraped !== null && 'homepage_alt_text_coverage' in scraped) ? scraped.homepage_alt_text_coverage : null,
//                     schema_markup_status: getSchemaMarkupStatus(scraped),
//                     AI_Discoverability: "true",
//                     brandAuditseo: pageSpeedData && pageSpeedData.audit_details.seoAudits ? pageSpeedData.audit_details.seoAudits || null : null,
//                   },
              
//               });

//               processedUrls.add(url);
//               processedNames.add(name);
//             }
//           } catch (err) {
//             console.error(`AI fallback competitor error for ${url}: ${err instanceof Error ? err.message : err}`);
//           }
//         }

//         retryCount++;
//         if (competitorResults.length < MIN_COMPETITORS && retryCount >= MAX_RETRIES) {
//           console.warn(`Could not find ${MIN_COMPETITORS} unique, valid competitors after ${MAX_RETRIES} retries. Returning ${competitorResults.length} competitors.`);
//         }
//       } catch (err) {
//         console.error(`Error during AI fallback competitor fetch (Retry ${retryCount + 1}): ${err instanceof Error ? err.message : err}`);
//         retryCount++;
//       }
//     }

//     const labeledResults: Record<string, any> = {};
//     competitorResults.forEach((result, idx) => {
//       labeledResults[`competitor${idx + 1}`] = result;
//     });

//     const brandWebsiteAnalysis = await prisma.brand_website_analysis.findFirst({
//       where: { website_id },
//       orderBy: { created_at: 'desc' },
//     });

//     let schema_markup_status = null;
//     if (scrapedMain?.schema_analysis) {
//       schema_markup_status = typeof scrapedMain.schema_analysis === "string"
//         ? JSON.parse(scrapedMain.schema_analysis)
//         : scrapedMain.schema_analysis;
//     }

//     let performance_insight = {
//       performance: brandWebsiteAnalysis?.performance_score ?? 0,
//       seo: brandWebsiteAnalysis?.seo_score ?? 0,
//       accessibility: brandWebsiteAnalysis?.accessibility_score ?? 0,
//       best_practices: brandWebsiteAnalysis?.best_practices_score ?? 0,

      
      
//     };

//     // let auditDetails: any = brandWebsiteAnalysis?.audit_details?? {};
//     // if (typeof auditDetails === 'string') {
//     //   try {
//     //     auditDetails = JSON.parse(auditDetails);
//     //   } catch {
//     //     auditDetails = {};
//     //   }
//     // }

//     // let website_health_matrix = {

//     //   speed_index: {
//     //     display_value: brandWebsiteAnalysis?.speed_index ?? "N/A",
//     //     score: auditDetails?.metrics?.speed_index?.score ?? null,
//     //   },
      
//     //   total_blocking_time: {
//     //     display_value: brandWebsiteAnalysis?.total_blocking_time ?? "N/A",
//     //     score: auditDetails?.metrics?.total_blocking_time?.score ?? null,
//     //   },
//     //   first_contentful_paint: {
//     //     display_value: brandWebsiteAnalysis?.first_contentful_paint ?? "N/A",
//     //     score: auditDetails?.metrics?.first_contentful_paint?.score ?? null,
//     //   },
//     //   largest_contentful_paint: {
//     //     display_value: brandWebsiteAnalysis?.largest_contentful_paint ?? "N/A",
//     //     score: auditDetails?.metrics?.largest_contentful_paint?.score ?? null,
//     //   },
//     //   cumulative_layout_shift: {
//     //     display_value: brandWebsiteAnalysis?.cumulative_layout_shift ?? "N/A",
//     //     score: auditDetails?.metrics?.cumulative_layout_shift?.score ?? null,
//     //   },
//     // };



//     let auditDetails: any = brandWebsiteAnalysis?.audit_details ?? {};
// if (typeof auditDetails === 'string') {
//   try {
//     auditDetails = JSON.parse(auditDetails);
//   } catch {
//     auditDetails = {};
//   }
// }

// // Helper function to get audit by ID from allAudits
// function getAuditById(id: string) {
//   // console.log("All Audits:", auditDetails?.allAudits);
//   return auditDetails?.allAudits?.find((a: any) => a.id === id) ?? {};
  
// }

// let website_health_matrix = {
//   speed_index: {
//     display_value: getAuditById("speed-index").display_value ?? "N/A",
//     score: getAuditById("speed-index").score ?? null,
//   },
//   total_blocking_time: {
//     display_value: getAuditById("total-blocking-time").display_value ?? "N/A",
//     score: getAuditById("total-blocking-time").score ?? null,
//   },
//   first_contentful_paint: {
//     display_value: getAuditById("first-contentful-paint").display_value ?? "N/A",
//     score: getAuditById("first-contentful-paint").score ?? null,
//   },
//   largest_contentful_paint: {
//     display_value: getAuditById("largest-contentful-paint").display_value ?? "N/A",
//     score: getAuditById("largest-contentful-paint").score ?? null,
//   },
//   cumulative_layout_shift: {
//     display_value: getAuditById("cumulative-layout-shift").display_value ?? "N/A",
//     score: getAuditById("cumulative-layout-shift").score ?? null,
//   },
// };


//     const { raw_html, other_links, ctr_loss_percent, sitemap_pages, ai_response, ...scrapedMainWithoutRawHtml } = scrapedMain ?? {};

//     labeledResults['mainWebsite'] = {
//       brand_profile: {
//         title: 'page_title' in scrapedMainWithoutRawHtml && scrapedMainWithoutRawHtml.page_title
//           ? scrapedMainWithoutRawHtml.page_title
//           : 'Unknown',
//         industry: userRequirement.industry || 'Unknown',
//         unique_selling_point: userRequirement.USP || 'Unknown',
//         primary_offering: userRequirement.primary_offering || 'Unknown',
//         logo_url: scrapedMain?.logo_url || null,
//         meta_description: 'meta_description' in scrapedMainWithoutRawHtml ? scrapedMainWithoutRawHtml.meta_description : null,
//         website_url: website_url


        
//       },
//       website_audit: {
        
//           performance_insight,
//           website_health_matrix,
//         },
//       seo_audit: {
//         h1_heading: h1Text,
//         meta_title: ('page_title' in scrapedMainWithoutRawHtml && scrapedMainWithoutRawHtml.page_title) ? scrapedMainWithoutRawHtml.page_title : null,
//         meta_description: 'meta_description' in scrapedMainWithoutRawHtml ? scrapedMainWithoutRawHtml.meta_description : null,
//         alt_text_coverage: 'homepage_alt_text_coverage' in scrapedMainWithoutRawHtml ? scrapedMainWithoutRawHtml.homepage_alt_text_coverage : null,
//         schema_markup_status: schema_markup_status,
//         AI_Discoverability: result,
//         // brandAuditseo: brandWebsiteAnalysis && brandWebsiteAnalysis.audit_details ? brandWebsiteAnalysis.audit_details : null,
//         brandAuditseo: (() => {
//           if (brandWebsiteAnalysis && brandWebsiteAnalysis.audit_details) {
//             let auditDetailsObj: any = brandWebsiteAnalysis.audit_details;
//             if (typeof auditDetailsObj === 'string') {
//               try {
//                 auditDetailsObj = JSON.parse(auditDetailsObj);
//               } catch {
//                 return null;
//               }
//             }
//             return auditDetailsObj && auditDetailsObj.seoAudits ? auditDetailsObj.seoAudits : null;
//           }
//           return null;
//         })(),

       

//       },
//     };

//     await prisma.llm_responses.upsert({
//       where: { website_id },
//       update: {
//         dashboard3_competi_camparison: JSON.stringify(labeledResults),
//       },
//       create: {
//         website_id,
//         dashboard3_competi_camparison: JSON.stringify(labeledResults),
//       },
//     });

//     await prisma.analysis_status.upsert({
//   where: {
//     user_id_website_id: {
//       user_id,
//       website_id,
//     },
//   },
//   update: {
//     geo_llm: result,
//   },
//   create: {
//     user_id,
//     website_id,
//     geo_llm: result,
//   },
// });

//     return labeledResults;
// }



// Helper function to process SEO audits with user-friendly titles and descriptions
function processSeoAudits(auditData: any[]): { passedAudits: { title: string; description: string }[]; failedAudits: { title: string; description: string }[] } {
  const passedAudits: { title: string; description: string }[] = [];
  const failedAudits: { title: string; description: string }[] = [];

  if (!Array.isArray(auditData)) {
    return { passedAudits: [], failedAudits: [] };
  }

  for (const audit of auditData) {
    // Skip the structured-data audit
    if (audit?.id === 'structured-data') {
      continue;
    }

    // Define user-friendly titles and descriptions based on audit ID
    let userFriendlyTitle: string;
    let passedDescription: string;
    let failedDescription: string;

    switch (audit?.id) {
      case 'is-crawlable':
        userFriendlyTitle = 'Page is accessible to search engines';
        passedDescription = ' Page allows search engines to find and index it, making it visible in search results.';
        failedDescription = ' Page is blocked from search engines, which may prevent it from appearing in search results. Check for noindex tags or robots.txt restrictions.';
        break;
      case 'document-title':
        userFriendlyTitle = 'Page has a clear title';
        passedDescription = ' Page has a title that helps users and search engines understand its content.';
        failedDescription = ' Page is missing a title or has an unclear one, which can confuse users and search engines. Add a descriptive title tag.';
        break;
      case 'meta-description':
        userFriendlyTitle = 'Page has a meta description';
        passedDescription = ' Page includes a short summary that appears in search results, helping users know what it’s about.';
        failedDescription = ' Page lacks a meta description, which may reduce click-through rates. Add a concise summary of the Page’s content.';
        break;
      case 'http-status-code':
        userFriendlyTitle = 'Page loads correctly';
        passedDescription = ' Page returns a successful status code, ensuring search engines can access it properly.';
        failedDescription = ' Page returns an error status code, preventing search engines from accessing it. Fix server or redirect issues.';
        break;
      case 'link-text':
        userFriendlyTitle = 'Links have clear text';
        passedDescription = 'links use descriptive text, making it easier for users and search engines to understand them.';
        failedDescription = 'Some links lack descriptive text , which can confuse users and search engines. Use meaningful link text.';
        break;
      case 'crawlable-anchors':
        userFriendlyTitle = 'Links are easy to follow';
        passedDescription = ' links are set up correctly, allowing search engines to explore  website effectively.';
        failedDescription = 'Some links are not crawlable due to improper setup (e.g., JavaScript-based links). Ensure links use proper HTML anchor tags.';
        break;
      case 'robots-txt':
        userFriendlyTitle = 'Robots.txt file is correct';
        passedDescription = ' robots.txt file is properly configured, guiding search engines on how to crawl  site.';
        failedDescription = ' robots.txt file is missing or incorrectly configured, which may block search engines. Create or fix the robots.txt file.';
        break;
      case 'image-alt':
        userFriendlyTitle = 'Images have descriptive alt text';
        passedDescription = ' Images include alt text, helping search engines and screen readers understand them.';
        failedDescription = 'Some images lack alt text, making them less accessible and harder for search engines to understand. Add descriptive alt text to all images.';
        break;
      case 'hreflang':
        userFriendlyTitle = 'Language settings are correct';
        passedDescription = 'Page correctly specifies its language, helping search engines show it to the right audience.';
        failedDescription = 'Page has missing or incorrect language settings, which may show it to the wrong audience. Add correct hreflang tags.';
        break;
      case 'canonical':
        userFriendlyTitle = 'Page has a canonical link';
        passedDescription = 'Page uses a canonical link to tell search engines the preferred version, avoiding duplicate content issues.';
        failedDescription = 'Page lacks a canonical link, which may cause duplicate content issues. Add a canonical tag to specify the preferred URL.';
        break;
      default:
        userFriendlyTitle = audit?.title || 'Unknown Audit';
        passedDescription = audit?.description || 'No description available';
        failedDescription = audit?.description || 'This audit failed, but no specific guidance is available. Review the page configuration.';
    }

    // Create audit entry
    const auditEntry = {
      title: userFriendlyTitle,
      description: audit?.score === 1 ? passedDescription : failedDescription,
    };

    // Categorize based on score
    if (audit?.score === 1) {
      passedAudits.push(auditEntry);
    } else if (audit?.score === 0) {
      failedAudits.push(auditEntry);
    }
  }

  return { passedAudits, failedAudits };
}

export class CompetitorService {
  // Helper function to validate URLs
  static async isValidCompetitorUrl(url: string, competitorName?: string): Promise<boolean> {
    try {
      new URL(url);
      if (!/^https?:\/\//.test(url)) return false;
    } catch {
      return false;
    }

    const blocklist = [
      'facebook.com',
      'twitter.com',
      'google.com',
      'youtube.com',
      'instagram.com',
      'linkedin.com',
      'tiktok.com',
      'example.com',
      'nonexistent.com',
    ];

    const { hostname } = new URL(url);
    if (blocklist.some(blocked => hostname.includes(blocked))) {
      console.log(`URL ${url} is in blocklist`);
      return false;
    }

    if (competitorName) {
      const normalizedName = competitorName.toLowerCase().replace(/\s+/g, '');
      if (!hostname.toLowerCase().includes(normalizedName)) {
        console.log(`URL ${url} does not match competitor name ${competitorName}`);
        return false;
      }
    }

    try {
      const response = await axios.head(url, { timeout: 5000 });
      return response.status >= 200 && response.status < 400;
    } catch (err) {
      console.log(`URL ${url} is inaccessible: ${err instanceof Error ? err.message : err}`);
      return false;
    }
  }

  // Helper function to extract H1
  static extractH1(rawHtml: string | null): string {
    if (!rawHtml) return 'Not Found';
    const $ = cheerio.load(rawHtml);
    return $('h1').first().text().trim() || 'Not Found';
  }

  static async process(website_id: string, user_id: string) {
    if (!website_id || !user_id) {
      throw new Error('website_id and user_id are required');
    }

    console.log(`Getting website URL for user_id ${user_id}, website_id: ${website_id}`);
    const website_url = await getWebsiteUrlById(user_id, website_id);
    if (!website_url) {
      throw new Error(`No website URL found for user_id: ${user_id} and website_id: ${website_id}`);
    }
    console.log('Website URL retrieved:', website_url);

    const [scrapedMain, analysis, userRequirementRaw] = await Promise.all([
      prisma.website_scraped_data.findUnique({ where: { website_id } }),
      prisma.brand_website_analysis.findFirst({
        where: { website_id },
        orderBy: { created_at: 'desc' },
      }),
      prisma.user_requirements.findFirst({ where: { website_id } }),
    ]);

    // Extract H1
    const h1Text = this.extractH1(scrapedMain?.raw_html ?? null);

    // Fetch and save PageSpeed data if it doesn't exist
    if (!analysis?.performance_score) {
      console.log(`Fetching PageSpeed data for ${website_url}`);
      const pageSpeed = await getPageSpeedData(website_url);
      if (pageSpeed) {
        await prisma.brand_website_analysis.create({
          data: {
            website_id,
            performance_score: pageSpeed.categories.performance || null,
            seo_score: pageSpeed.categories.seo || null,
            accessibility_score: pageSpeed.categories.accessibility || null,
            best_practices_score: pageSpeed.categories.best_practices || null,
            first_contentful_paint: pageSpeed.audits?.first_contentful_paint?.display_value || null,
            largest_contentful_paint: pageSpeed.audits?.largest_contentful_paint?.display_value || null,
            total_blocking_time: pageSpeed.audits?.total_blocking_time?.display_value || null,
            speed_index: pageSpeed.audits?.speed_index?.display_value || null,
            cumulative_layout_shift: pageSpeed.audits?.cumulative_layout_shift?.display_value || null,
            time_to_interactive: pageSpeed.audits?.interactive?.display_value || null,
            audit_details: pageSpeed.audit_details,
          },
        });
      }
    } else {
      console.log(`PageSpeed data already exists for ${website_url}`);
    }

    const userRequirement = {
      industry: userRequirementRaw?.industry ?? 'Unknown',
      region_of_operation: userRequirementRaw?.region_of_operation ?? 'Unknown',
      target_location: userRequirementRaw?.target_location ?? 'Unknown',
      target_audience: userRequirementRaw?.target_audience ?? 'Unknown',
      primary_offering: userRequirementRaw?.primary_offering ?? 'Unknown',
      USP: userRequirementRaw?.USP ?? 'Unknown',
      competitor_urls: Array.isArray(userRequirementRaw?.competitor_urls)
        ? userRequirementRaw.competitor_urls
        : [],
    };

    const competitorUrls: string[] = Array.isArray(userRequirement.competitor_urls)
      ? userRequirement.competitor_urls.filter((url): url is string => typeof url === 'string')
      : [];
    const competitorResults = [];
    const processedUrls = new Set<string>();
    const processedNames = new Set<string>();

    // Helper function to handle schema_markup_status
    const getSchemaMarkupStatus = (scraped: any) => {
      if (typeof scraped === 'object' && scraped !== null && 'schema_analysis' in scraped) {
        const schema = scraped.schema_analysis;
        if (typeof schema === 'string') {
          try {
            return JSON.parse(schema);
          } catch (error) {
            console.error(`Failed to parse schema_analysis for ${scraped.website_url}: ${error instanceof Error ? error.message : String(error)}`);
            return schema;
          }
        } else if (schema !== undefined && schema !== null) {
          return schema;
        }
      }
      return null;
    };

    const llmResponse = await prisma.llm_responses.findUnique({
      where: { website_id: website_id },
      select: { geo_llm: true },
    });

    let result: any;
    if (!llmResponse || llmResponse.geo_llm === null) {
      console.log('no geo llm response found');
      result = await fetchBrands(user_id, website_id);
      await prisma.analysis_status.upsert({
        where: {
          user_id_website_id: {
            user_id: user_id ?? '',
            website_id: website_id,
          },
        },
        update: { geo_llm: result },
        create: {
          user_id: user_id ?? '',
          website_id: website_id,
          geo_llm: result,
        },
      });
    } else {
      result = llmResponse?.geo_llm;
      console.log('geo llm found');
    }

    // Process user-provided competitor URLs
    const competitorPromises = competitorUrls.filter(u => u.startsWith('http')).map(async (compUrl) => {
      try {
        const scraped = await scrapeWebsitecompetitos(compUrl);
        if (!scraped || typeof scraped !== 'object') throw new Error('Scrape failed');

        const competitorData = await extractCompetitorDataFromLLM(scraped);
        if (!competitorData) throw new Error('LLM parsing failed');

        const competitorName = competitorData.name || scraped.page_title || compUrl;

        if (processedUrls.has(compUrl) || processedNames.has(competitorName)) {
          console.log(`Skipping duplicate competitor: ${competitorName} (${compUrl})`);
          return null;
        }

        const competitor_id = uuidv4();
        const savedCompetitor = await prisma.competitor_details.create({
          data: {
            competitor_id,
            website_id,
            name: competitorName,
            competitor_website_url: compUrl,
            industry: competitorData.industry || userRequirement.industry || 'Unknown',
            region: competitorData.region || userRequirement.region_of_operation || 'Unknown',
            target_audience: competitorData.target_audience || userRequirement.target_audience || 'Unknown',
            primary_offering: competitorData.primary_offering || userRequirement.primary_offering || 'Unknown',
            usp: competitorData.usp || 'No clear USP identified',
          },
        });

        await prisma.competitor_data.upsert({
          where: { competitor_id },
          update: {
            ...(typeof scraped === 'object' && scraped !== null
              ? {
                  ...scraped,
                  schema_analysis:
                    scraped.schema_analysis && typeof scraped.schema_analysis === 'object'
                      ? JSON.stringify(scraped.schema_analysis)
                      : scraped.schema_analysis,
                }
              : {}),
            updated_at: new Date(),
          },
          create: {
            competitor_id,
            website_id,
            ...(typeof scraped === 'object' && scraped !== null
              ? {
                  ...scraped,
                  schema_analysis:
                    scraped.schema_analysis && typeof scraped.schema_analysis === 'object'
                      ? JSON.stringify(scraped.schema_analysis)
                      : scraped.schema_analysis,
                }
              : {}),
            website_url: scraped.website_url ?? compUrl,
          },
        });

        const pageSpeedData = await getPageSpeedData(compUrl);
        if (pageSpeedData) {
          await prisma.competitor_data.update({
            where: { competitor_id },
            data: { page_speed: pageSpeedData },
          });
        }

        const h1_Text = (typeof scraped === 'object' && scraped !== null && 'raw_html' in scraped && scraped.raw_html)
          ? cheerio.load(scraped.raw_html)('h1').first().text().trim() || null
          : null;

        processedUrls.add(compUrl);
        processedNames.add(competitorName);

        return {
          brand_profile: {
            title: competitorName,
            industry: competitorData.industry || userRequirement.industry || 'Unknown',
            unique_selling_point: competitorData.usp || 'No clear USP identified',
            primary_offering: competitorData.primary_offering || userRequirement.primary_offering || 'Unknown',
            logo_url: (typeof scraped === 'object' && scraped !== null && 'logo_url' in scraped) ? scraped.logo_url : null,
            website_url: competitorData.competitor_website_url || '',
            meta_description: (typeof scraped === 'object' && scraped !== null && 'meta_description' in scraped) ? scraped.meta_description : null,
          },
          website_audit: pageSpeedData ? {
            performance_insights: {
              performance: pageSpeedData.categories.performance || null,
              seo: pageSpeedData.categories.seo || null,
              accessibility: pageSpeedData.categories.accessibility || null,
              best_practices: pageSpeedData.categories.best_practices || null,
            },
            website_health_matrix: {
              speed_index: {
                display_value: pageSpeedData.audits?.speed_index?.display_value || 'N/A',
                score: pageSpeedData.audits?.speed_index?.score || null,
              },
              total_blocking_time: {
                display_value: pageSpeedData.audits?.total_blocking_time?.display_value || 'N/A',
                score: pageSpeedData.audits?.total_blocking_time?.score || null,
              },
              first_contentful_paint: {
                display_value: pageSpeedData.audits?.first_contentful_paint?.display_value || 'N/A',
                score: pageSpeedData.audits?.first_contentful_paint?.score || null,
              },
              largest_contentful_paint: {
                display_value: pageSpeedData.audits?.largest_contentful_paint?.display_value || 'N/A',
                score: pageSpeedData.audits?.largest_contentful_paint?.score || null,
              },
              cumulative_layout_shift: {
                display_value: pageSpeedData.audits?.cumulative_layout_shift?.display_value || 'N/A',
                score: pageSpeedData.audits?.cumulative_layout_shift?.score || null,
              },
            },
          } : null,
          seo_audit: {
            h1_heading: h1_Text,
            meta_title: (typeof scraped === 'object' && scraped !== null && 'page_title' in scraped) ? scraped.page_title : null,
            meta_description: (typeof scraped === 'object' && scraped !== null && 'meta_description' in scraped) ? scraped.meta_description : null,
            alt_text_coverage: (typeof scraped === 'object' && scraped !== null && 'homepage_alt_text_coverage' in scraped) ? scraped.homepage_alt_text_coverage : null,
            schema_markup_status: getSchemaMarkupStatus(scraped),
            AI_Discoverability: 'true',
            brandAuditseo: pageSpeedData && pageSpeedData.audit_details?.seoAudits
              ? processSeoAudits(pageSpeedData.audit_details.seoAudits)
              : { passedAudits: [], failedAudits: [] },
          },
        };
      } catch (err) {
        console.error(`Failed processing competitor ${compUrl}: ${err instanceof Error ? err.message : err}`);
        return null;
      }
    });

    const results = await Promise.allSettled(competitorPromises);
    for (const res of results) {
      if (res.status === 'fulfilled' && res.value) {
        competitorResults.push(res.value);
      }
    }

    // Ensure at least 3 unique, valid competitors
    const MIN_COMPETITORS = 3;
    const MAX_RETRIES = 4;
    let retryCount = 0;

    while (competitorResults.length < MIN_COMPETITORS && retryCount < MAX_RETRIES) {
      try {
        const competitorsToGenerate = 6;
        console.log(`Fetching ${competitorsToGenerate} additional competitors (Retry ${retryCount + 1})`);

        const aiResponse = await fetchCompetitorsFromLLM(
          scrapedMain,
          userRequirement,
          competitorsToGenerate,
          Array.from(processedUrls),
          Array.from(processedNames)
        );

        await prisma.website_scraped_data.update({
          where: { website_id },
          data: { ai_response: aiResponse },
        });

        const parsedCompetitors = parseCompetitorData(aiResponse);

        interface ParsedCompetitor {
          competitor_website_url: string;
          website_url: string;
          name: string;
          industry?: string;
          region?: string;
          target_audience?: string;
          primary_offering?: string;
          usp?: string;
        }
        for (const comp of parsedCompetitors.slice(0, MIN_COMPETITORS - competitorResults.length) as ParsedCompetitor[]) {
          const url: string = (comp as ParsedCompetitor).website_url;
          const name: string = (comp as ParsedCompetitor).name;

          if (processedUrls.has(url) || processedNames.has(name) || competitorUrls.includes(url) || competitorResults.some(r => r.brand_profile.title === name)) {
            console.log(`Skipping duplicate competitor: ${name} (${url})`);
            continue;
          }

          try {
            const competitor_id = uuidv4();
            const savedCompetitor = await prisma.competitor_details.create({
              data: {
                competitor_id,
                website_id,
                name,
                competitor_website_url: url,
                industry: comp.industry,
                region: comp.region,
                target_audience: comp.target_audience,
                primary_offering: comp.primary_offering,
                usp: comp.usp,
              },
            });

            const scraped = await scrapeWebsitecompetitos(url);
            if (scraped) {
              await prisma.competitor_data.upsert({
                where: { competitor_id },
                update: {
                  ...(typeof scraped === 'object' && scraped !== null
                    ? {
                        ...scraped,
                        schema_analysis:
                          scraped.schema_analysis && typeof scraped.schema_analysis === 'object'
                            ? JSON.stringify(scraped.schema_analysis)
                            : scraped.schema_analysis,
                      }
                    : {}),
                  updated_at: new Date(),
                },
                create: {
                  competitor_id,
                  website_id,
                  ...(typeof scraped === 'object' && scraped !== null
                    ? {
                        ...scraped,
                        schema_analysis:
                          scraped.schema_analysis && typeof scraped.schema_analysis === 'object'
                            ? JSON.stringify(scraped.schema_analysis)
                            : scraped.schema_analysis,
                      }
                    : {}),
                  website_url: (typeof scraped === 'object' && scraped !== null && 'website_url' in scraped) ? scraped.website_url : url,
                },
              });

              const pageSpeedData = await getPageSpeedData(url);
              if (pageSpeedData) {
                await prisma.competitor_data.update({
                  where: { competitor_id },
                  data: { page_speed: pageSpeedData },
                });
              }

              const h1_Text = (typeof scraped === 'object' && scraped !== null && 'raw_html' in scraped && scraped.raw_html)
                ? cheerio.load(scraped.raw_html)('h1').first().text().trim() || null
                : null;

              competitorResults.push({
                brand_profile: {
                  title: name,
                  industry: comp.industry || userRequirement.industry || 'Unknown',
                  unique_selling_point: comp.usp || 'No clear USP identified',
                  primary_offering: comp.primary_offering || userRequirement.primary_offering || 'Unknown',
                  logo_url: (typeof scraped === 'object' && scraped !== null && 'logo_url' in scraped) ? scraped.logo_url : null,
                  website_url: comp.website_url || '',
                  meta_description: (typeof scraped === 'object' && scraped !== null && 'meta_description' in scraped) ? scraped.meta_description : null,
                },
                website_audit: pageSpeedData ? {
                  performance_insights: {
                    performance: pageSpeedData.categories.performance || null,
                    seo: pageSpeedData.categories.seo || null,
                    accessibility: pageSpeedData.categories.accessibility || null,
                    best_practices: pageSpeedData.categories.best_practices || null,
                  },
                  website_health_matrix: {
                    speed_index: {
                      display_value: pageSpeedData.audits?.speed_index?.display_value || 'N/A',
                      score: pageSpeedData.audits?.speed_index?.score || null,
                    },
                    total_blocking_time: {
                      display_value: pageSpeedData.audits?.total_blocking_time?.display_value || 'N/A',
                      score: pageSpeedData.audits?.total_blocking_time?.score || null,
                    },
                    first_contentful_paint: {
                      display_value: pageSpeedData.audits?.first_contentful_paint?.display_value || 'N/A',
                      score: pageSpeedData.audits?.first_contentful_paint?.score || null,
                    },
                    largest_contentful_paint: {
                      display_value: pageSpeedData.audits?.largest_contentful_paint?.display_value || 'N/A',
                      score: pageSpeedData.audits?.largest_contentful_paint?.score || null,
                    },
                    cumulative_layout_shift: {
                      display_value: pageSpeedData.audits?.cumulative_layout_shift?.display_value || 'N/A',
                      score: pageSpeedData.audits?.cumulative_layout_shift?.score || null,
                    },
                  },
                } : null,
                seo_audit: {
                  h1_heading: h1_Text,
                  meta_title: (typeof scraped === 'object' && scraped !== null && 'page_title' in scraped) ? scraped.page_title : null,
                  meta_description: (typeof scraped === 'object' && scraped !== null && 'meta_description' in scraped) ? scraped.meta_description : null,
                  alt_text_coverage: (typeof scraped === 'object' && scraped !== null && 'homepage_alt_text_coverage' in scraped) ? scraped.homepage_alt_text_coverage : null,
                  schema_markup_status: getSchemaMarkupStatus(scraped),
                  AI_Discoverability: 'true',
                  brandAuditseo: pageSpeedData && pageSpeedData.audit_details?.seoAudits
                    ? processSeoAudits(pageSpeedData.audit_details.seoAudits)
                    : { passedAudits: [], failedAudits: [] },
                },
              });

              processedUrls.add(url);
              processedNames.add(name);
            }
          } catch (err) {
            console.error(`AI fallback competitor error for ${url}: ${err instanceof Error ? err.message : err}`);
          }
        }

        retryCount++;
        if (competitorResults.length < MIN_COMPETITORS && retryCount >= MAX_RETRIES) {
          console.warn(`Could not find ${MIN_COMPETITORS} unique, valid competitors after ${MAX_RETRIES} retries. Returning ${competitorResults.length} competitors.`);
        }
      } catch (err) {
        console.error(`Error during AI fallback competitor fetch (Retry ${retryCount + 1}): ${err instanceof Error ? err.message : err}`);
        retryCount++;
      }
    }

    const labeledResults: Record<string, any> = {};
    competitorResults.forEach((result, idx) => {
      labeledResults[`competitor${idx + 1}`] = result;
    });

    const brandWebsiteAnalysis = await prisma.brand_website_analysis.findFirst({
      where: { website_id },
      orderBy: { created_at: 'desc' },
    });

    let schema_markup_status = null;
    if (scrapedMain?.schema_analysis) {
      schema_markup_status = typeof scrapedMain.schema_analysis === 'string'
        ? JSON.parse(scrapedMain.schema_analysis)
        : scrapedMain.schema_analysis;
    }

    let performance_insight = {
      performance: brandWebsiteAnalysis?.performance_score ?? 0,
      seo: brandWebsiteAnalysis?.seo_score ?? 0,
      accessibility: brandWebsiteAnalysis?.accessibility_score ?? 0,
      best_practices: brandWebsiteAnalysis?.best_practices_score ?? 0,
    };

    let auditDetails: any = brandWebsiteAnalysis?.audit_details ?? {};
    if (typeof auditDetails === 'string') {
      try {
        auditDetails = JSON.parse(auditDetails);
      } catch {
        auditDetails = {};
      }
    }

    // Helper function to get audit by ID from allAudits
    function getAuditById(id: string) {
      return auditDetails?.allAudits?.find((a: any) => a.id === id) ?? {};
    }

    let website_health_matrix = {
      speed_index: {
        display_value: getAuditById('speed-index').display_value ?? 'N/A',
        score: getAuditById('speed-index').score ?? null,
      },
      total_blocking_time: {
        display_value: getAuditById('total-blocking-time').display_value ?? 'N/A',
        score: getAuditById('total-blocking-time').score ?? null,
      },
      first_contentful_paint: {
        display_value: getAuditById('first-contentful-paint').display_value ?? 'N/A',
        score: getAuditById('first-contentful-paint').score ?? null,
      },
      largest_contentful_paint: {
        display_value: getAuditById('largest-contentful-paint').display_value ?? 'N/A',
        score: getAuditById('largest-contentful-paint').score ?? null,
      },
      cumulative_layout_shift: {
        display_value: getAuditById('cumulative-layout-shift').display_value ?? 'N/A',
        score: getAuditById('cumulative-layout-shift').score ?? null,
      },
    };

    const { raw_html, other_links, ctr_loss_percent, sitemap_pages, ai_response, ...scrapedMainWithoutRawHtml } = scrapedMain ?? {};

    labeledResults['mainWebsite'] = {
      brand_profile: {
        title: 'page_title' in scrapedMainWithoutRawHtml && scrapedMainWithoutRawHtml.page_title
          ? scrapedMainWithoutRawHtml.page_title
          : 'Unknown',
        industry: userRequirement.industry || 'Unknown',
        unique_selling_point: userRequirement.USP || 'Unknown',
        primary_offering: userRequirement.primary_offering || 'Unknown',
        logo_url: scrapedMain?.logo_url || null,
        meta_description: 'meta_description' in scrapedMainWithoutRawHtml ? scrapedMainWithoutRawHtml.meta_description : null,
        website_url: website_url,
      },
      website_audit: {
        performance_insight,
        website_health_matrix,
      },
      seo_audit: {
        h1_heading: h1Text,
        meta_title: ('page_title' in scrapedMainWithoutRawHtml && scrapedMainWithoutRawHtml.page_title) ? scrapedMainWithoutRawHtml.page_title : null,
        meta_description: 'meta_description' in scrapedMainWithoutRawHtml ? scrapedMainWithoutRawHtml.meta_description : null,
        alt_text_coverage: 'homepage_alt_text_coverage' in scrapedMainWithoutRawHtml ? scrapedMainWithoutRawHtml.homepage_alt_text_coverage : null,
        schema_markup_status: schema_markup_status,
        AI_Discoverability: result,
        brandAuditseo: (() => {
          if (brandWebsiteAnalysis && brandWebsiteAnalysis.audit_details) {
            let auditDetailsObj: any = brandWebsiteAnalysis.audit_details;
            if (typeof auditDetailsObj === 'string') {
              try {
                auditDetailsObj = JSON.parse(auditDetailsObj);
              } catch {
                return { passedAudits: [], failedAudits: [] };
              }
            }
            return auditDetailsObj && auditDetailsObj.seoAudits
              ? processSeoAudits(auditDetailsObj.seoAudits)
              : { passedAudits: [], failedAudits: [] };
          }
          return { passedAudits: [], failedAudits: [] };
        })(),
      },
    };

    await prisma.llm_responses.upsert({
      where: { website_id },
      update: {
        dashboard3_competi_camparison: JSON.stringify(labeledResults),
      },
      create: {
        website_id,
        dashboard3_competi_camparison: JSON.stringify(labeledResults),
      },
    });

    await prisma.analysis_status.upsert({
      where: {
        user_id_website_id: {
          user_id,
          website_id,
        },
      },
      update: {
        geo_llm: result,
      },
      create: {
        user_id,
        website_id,
        geo_llm: result,
      },
    });

    return labeledResults;
  }


  static async getComparisonRecommendations(website_id: string) {
    if (!website_id) {
      throw new Error('website_id is required');
    } else (console.log("website id get ", website_id));

    const mainWebsite = await prisma.user_websites.findUnique({

      where: { website_id },
      include: {
        website_scraped_data: true,
        brand_website_analysis: {
          orderBy: { created_at: 'desc' },
          take: 1,
        }
      },
    });

    if (!mainWebsite) {
      throw new Error('Website not found');
    }

    // Fetch user requirements for use in the prompt
    const userRequirementRaw = await prisma.user_requirements.findFirst({
      where: { website_id },
    });

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
        facebook_handle: mainWebsite.website_scraped_data?.facebook_handle || 'N/A',
        twitter_handle: mainWebsite.website_scraped_data?.twitter_handle || 'N/A',
        youtube_handle: mainWebsite.website_scraped_data?.youtube_handle || 'N/A',
        instagram_handle: mainWebsite.website_scraped_data?.instagram_handle || 'N/A',
        linkedin_handle: mainWebsite.website_scraped_data?.linkedin_handle || 'N/A',
        tiktok_handle: mainWebsite.website_scraped_data?.tiktok_handle || 'N/A',
        og_title: mainWebsite.website_scraped_data?.og_title || 'N/A',
        og_image: mainWebsite.website_scraped_data?.og_image || 'N/A',
        homepage_alt_text_coverage: mainWebsite.website_scraped_data?.homepage_alt_text_coverage || 'N/A',
        logo_url: mainWebsite.website_scraped_data?.logo_url || 'N/A',
        schema_analysis: mainWebsite.website_scraped_data?.schema_analysis || 'N/A',

        

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

            },
    };

    // console.log("main website data", main);
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
          meta_keywords: scraped?.meta_keywords || 'N/A',
          meta_description: scraped?.meta_description || 'N/A',
          og_description: scraped?.og_description || 'N/A',
          facbook_handler: scraped?.facebook_handle || 'N/A',
          instagram_handler: scraped?.instagram_handle || 'N/A',
          twitter_hanlder: scraped?.twitter_handle || 'N/A',
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
    // console.log("competitors data", comps);
    const prompt = await createComparisonPrompt(website_id);
    // console.log('Generated prompt for LLM:', prompt);
    if (!prompt) {
      throw new Error('Failed to generate prompt for LLM');
    } 
    const response = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: model,
      temperature: 0.7,
      max_tokens: 3000,
    });

   const raw = response.choices?.[0]?.message?.content || '{}';

let parsed;
try {
  parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  // console.log("parsed",parsed)
  await prisma.llm_responses.upsert({
      where: { website_id },
      update: {
        recommendation_by_mo_dashboard3: JSON.stringify(parsed),
      },
      create: {
        website_id,
        recommendation_by_mo_dashboard3: JSON.stringify(parsed),
      },
    });
   await prisma.analysis_status.upsert({
      where: {
        user_id_website_id: {
          user_id: userRequirementRaw?.user_id ?? '',
          website_id: website_id,
        },
      },
      update: {
        recommendation_by_mo3: "true",
      },
      create: {
        website_id: website_id,
        user_id: userRequirementRaw?.user_id ?? '', // Provide the correct user_id here
        recommendation_by_mo3: "true",
      },
    });
    console.log("LLM response saved successfully for website_id:", website_id);
} catch (err) {
  console.error("Error parsing JSON response:", err);
  parsed = { recommendations: [] }; // fail-safe fallback
}

return parsed;
  }
}
