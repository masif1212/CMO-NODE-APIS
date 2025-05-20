// export function parseCompetitorData(aiResponse: string) {
//      const pattern = /\d+\.\s*\*\*Competitor Name\*\*:\s*(.*?)\n\s*-\s*\*\*Website URL\*\*:\s*(https?:\/\/[^\s]+)\n\s*-\s*\*\*Industry\/Niche\*\*:\s*(.*?)\n\s*-\s*\*\*Region of Operation\*\*:\s*(.*?)\n\s*-\s*\*\*Target Audience\*\*:\s*(.*?)\n\s*-\s*\*\*Primary Offering\*\*:\s*(.*?)\n\s*-\s*\*\*Unique Selling Proposition \(USP\)\*\*:\s*(.*?)(?=\n\d+\.|\s*$)/gs;

//      const matches = [...aiResponse.matchAll(pattern)];
//           return matches.map(m => ({
//                name: m[1].trim(),
//                website_url: m[2].trim(),
//                industry: m[3].trim(),
//                region: m[4].trim(),
//                target_audience: m[5].trim(),
//                primary_offering: m[6].trim(),
//                usp: m[7].trim()
//           }));
// }