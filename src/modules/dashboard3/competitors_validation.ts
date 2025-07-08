import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { fetchCompetitorsFromLLM, extractCompetitorDataFromLLM, createComparisonPrompt } from './llm';
import { parseCompetitorData } from './parser';
import { getPageSpeedData } from './pagespeed';
import OpenAI from 'openai';
import 'dotenv/config';
import * as cheerio from "cheerio";
import axios from 'axios';
import { promisify } from 'util';
import dns from 'dns'; // Node.js built-in DNS module
const resolve4 = promisify(dns.resolve4);
import puppeteer from 'puppeteer';
import { url } from 'inspector';
import { string, boolean } from 'zod';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
const model = process.env.OPENAI_MODEL || 'gpt-4.1';

const prisma = new PrismaClient();






export  function processSeoAudits(auditData: any[]): { passedAudits: { title: string; description: string }[]; failedAudits: { title: string; description: string }[] } {
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
        userFriendlyTitle = 'Search Engines Can Find This Page';
        passedDescription = 'Page allows search engines to find and index it, making it visible in search results.';
        failedDescription = 'Page is blocked from search engines, which may prevent it from appearing in search results. Check for noindex tags or robots.txt restrictions.';
        break;
      case 'document-title':
        userFriendlyTitle = 'Page Has a Clear and Useful Title';
        passedDescription = 'Page has a title that helps users and search engines understand its content.';
        failedDescription = 'Page is missing a title or has an unclear one, which can confuse users and search engines. Add a descriptive title tag.';
        break;
      case 'meta-description':
        userFriendlyTitle = 'Page Has a Helpful Description';
        passedDescription = 'Page includes a short summary that appears in search results, helping users know what it’s about.';
        failedDescription = 'Page lacks a meta description, which may reduce click-through rates. Add a concise summary of the Page’s content.';
        break;
      case 'http-status-code':
        userFriendlyTitle = 'Page Loads Without Errors';
        passedDescription = 'Page returns a successful status code, ensuring search engines can access it properly.';
        failedDescription = 'Page returns an error status code, preventing search engines from accessing it. Fix server or redirect issues.';
        break;
      case 'link-text':
        userFriendlyTitle = 'Links Use Clear and Descriptive Text';
        passedDescription = 'links use descriptive text, making it easier for users and search engines to understand them.';
        failedDescription = 'Some links lack descriptive text , which can confuse users and search engines. Use meaningful link text.';
        break;
      case 'crawlable-anchors':
        userFriendlyTitle = 'Links Can Be Followed by Search Engines';
        passedDescription = 'Links are set up correctly, allowing search engines to explore  website effectively.';
        failedDescription = 'Some links are not crawlable due to improper setup (e.g., JavaScript-based links). Ensure links use proper HTML anchor tags.';
        break;
      case 'robots-txt':
        userFriendlyTitle = 'Robots.txt File Is Set Up Correctly';
        passedDescription = 'Robots.txt file is properly configured, guiding search engines on how to crawl  site.';
        failedDescription = 'Robots.txt file is missing or incorrectly configured, which may block search engines. Create or fix the robots.txt file.';
        break;
      case 'image-alt':
        userFriendlyTitle = 'Images Have Descriptive Alt Text';
        passedDescription = 'Images include alt text, helping search engines and screen readers understand them.';
        failedDescription = 'Some images lack alt text, making them less accessible and harder for search engines to understand. Add descriptive alt text to all images.';
        break;
      case 'hreflang':
        userFriendlyTitle = 'Page Shows the Right Language to the Right Users';
        passedDescription = 'Page correctly specifies its language, helping search engines show it to the right audience.';
        failedDescription = 'Page has missing or incorrect language settings, which may show it to the wrong audience. Add correct hreflang tags.';
        break;
      case 'canonical':
        userFriendlyTitle = 'Page Shows Its Preferred URL';
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
async function extractMetaRedirect(html: string): Promise<string | null> {
    const $ = cheerio.load(html);
    const metaRefresh = $('meta[http-equiv="refresh" i]');
    if (metaRefresh.length > 0) {
      const content = metaRefresh.attr('content');
      if (content) {
        const match = content.match(/url=(.+)/i);
        if (match && match[1]) {
          console.log(`Found meta refresh redirect to: ${match[1]}`);
          return match[1].trim();
        }
      }
    }
    return null;
  }

  // Helper function to resolve DNS
async function resolveDns(hostname: string): Promise<string[]> {
  try {
    const addresses = await resolve4(hostname);
    console.log(`DNS resolved for ${hostname}: ${addresses.join(', ')}`);
    return addresses;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`DNS resolution failed for ${hostname}: ${errorMessage}`);
    return [];
  }
}

  // Helper function to validate URLs
export async function isValidCompetitorUrl(
  url: string,
  competitorName?: string
): Promise<{ isValid: boolean; preferredUrl?: string }> {
  try {
    console.log(`Validating URL format for ${url}`);
    const parsedUrl = new URL(url);
    if (!/^https?:\/\//.test(url)) {
      console.log(`URL ${url} failed format validation`);
      return { isValid: false };
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

    const { hostname, pathname } = parsedUrl;

    if (blocklist.some(blocked => hostname.includes(blocked))) {
      console.log(`URL ${url} is in blocklist`);
      return { isValid: false };
    }

    if (competitorName) {
      const normalizedName = competitorName.toLowerCase().replace(/\s+/g, '');
      if (!hostname.toLowerCase().includes(normalizedName)) {
        console.log(`URL ${url} does not match competitor name ${competitorName}`);
        return { isValid: false };
      }
    }

    const allowedPaths = ['/', '/login', '/signup'];
    const normalizedPath = pathname.endsWith('/') ? pathname : `${pathname}/`;
    const normalizedAllowedPaths = allowedPaths.map(path => path.endsWith('/') ? path : `${path}/`);

    if (!normalizedAllowedPaths.includes(normalizedPath)) {
      console.log(`URL ${url} does not point to homepage, /login, or /signup`);
      return { isValid: false };
    }

    await resolveDns(hostname);

    let nonWwwUrl: string;
    let wwwUrl: string;
    if (hostname.startsWith('www.')) {
      nonWwwUrl = url.replace('www.', '');
      wwwUrl = url;
      await resolveDns(nonWwwUrl.replace(/^https?:\/\//, ''));
    } else {
      nonWwwUrl = url;
      wwwUrl = url.replace(/^https?:\/\/([^/]+)/, 'https://www.$1');
      await resolveDns(wwwUrl.replace(/^https?:\/\//, ''));
    }

    let finalUrl = url;
    let finalPath = normalizedPath;
    let responseHeaders: Record<string, string> = {};
    let pageContent: string | null = null;
    let is301Redirect = false;
    let redirectTarget: string | null = null;

    try {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 ...');
      await page.setRequestInterception(true);
      page.on('request', request => request.continue());
      page.on('response', response => {
        if (response.url() === url) {
          responseHeaders = response.headers();
          if (response.status() === 301 || response.status() === 302) {
            is301Redirect = response.status() === 301;
            redirectTarget = responseHeaders['location'] || null;
          }
        }
      });
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });

      const jsRedirect = await page.evaluate(() => window.location.href);
      if (jsRedirect !== finalUrl) {
        finalUrl = jsRedirect;
      }

      finalUrl = page.url();
      pageContent = await page.content();
      const finalParsedUrl = new URL(finalUrl);
      finalPath = finalParsedUrl.pathname.endsWith('/') ? finalParsedUrl.pathname : `${finalParsedUrl.pathname}/`;

      if (pageContent) {
        const metaRedirect = await extractMetaRedirect(pageContent);
        if (metaRedirect) {
          finalUrl = new URL(metaRedirect, url).toString();
          const metaParsedUrl = new URL(finalUrl);
          finalPath = metaParsedUrl.pathname.endsWith('/') ? metaParsedUrl.pathname : `${metaParsedUrl.pathname}/`;
        }
      }

      await browser.close();
    } catch (err) {
      console.error(`Puppeteer failed: ${err instanceof Error ? err.message : err}`);
    }

    // Handle 301
    if (is301Redirect && redirectTarget) {
      const redirectPath = new URL(redirectTarget).pathname;
      const normalizedRedirectPath = redirectPath.endsWith('/') ? redirectPath : `${redirectPath}/`;
      if (normalizedAllowedPaths.includes(normalizedRedirectPath)) {
        return { isValid: true, preferredUrl: redirectTarget };
      } else {
        return { isValid: false };
      }
    }

    const wwwNormalized = url.startsWith('https://www.') ? url : `https://www.${hostname}${finalPath}`;
const nonWwwNormalized = url.startsWith('https://www.') ? url.replace('www.', '') : url;

if (finalPath === '/') {
  // If homepage is reached and it's the www version
  if (hostname.startsWith('www.')) {
    return { isValid: true, preferredUrl: wwwUrl };
  } else {
    // Check if www version redirects to same homepage — no need to use both
    return { isValid: true, preferredUrl: nonWwwUrl };
  }
}

// Handle /login or /signup
if (finalPath === '/login/' || finalPath === '/signup/') {
  return { isValid: true, preferredUrl: finalUrl };
}

// Default case
return { isValid: true, preferredUrl: finalUrl };
  } catch (err) {
    console.error(`Validation failed for ${url}: ${err instanceof Error ? err.message : err}`);
    return { isValid: false };
  }
}