export interface UserRequirement {
  industry: string;
  primary_offering: string;
  USP: string;
  competitor_urls: string[];
}

export interface BrandProfile {
  title: string;
  industry: string;
  unique_selling_point: string;
  primary_offering: string;
  logo_url: string | null;
  website_url: string;
}

export interface ProcessedResult {
  brand_profile: BrandProfile;
  competitor_id?: string; // Optional for main website
}

export interface ScrapedData {
  website_url: string;
  page_title: string | null;
  logo_url: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  twitter_handle: string | null;
  facebook_handle: string | null;
  instagram_handle: string | null;
  linkedin_handle: string | null;
  youtube_handle: string | null;
  homepage_alt_text_coverage: number;
  isCrawlable: boolean;
  tiktok_handle: string | null;
  headingAnalysis: any;
  other_links: string[];
  schema_analysis: any;
  raw_html: string;
}

export interface LlmCompetitor {
  website_url: string;
  name: string;
  industry?: string;
  primary_offering?: string;
  usp?: string;
}