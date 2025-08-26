export interface SchemaMarkupStatus {
  url: string;
  message: string;
  schemas: {
    summary: Array<{ type: string; format: string; isValid: boolean }>;
    details: { [key: string]: Array<{ type: string; format: string; isValid: boolean }> };
  };
}

export interface SeoAudit {
  h1_heading: string | null;
  meta_title: string | null;
  meta_description: string | null;
  alt_text_coverage: number | null;
  isCrawlable: boolean | false;
  headingAnalysis: {
    // hasH1: boolean;
    totalHeadings: number;
    // headingLevelsUsed: string[];
    headingOrderUsed: string[];
    hasMultipleH1s: boolean;
    skippedHeadingLevels: boolean;
    reversedHeadingOrder: boolean;
    headingHierarchyIssues: boolean;
    message: string;
  } | null;
  schema_markup_status: SchemaMarkupStatus | null;
  AI_Discoverability: string;
}

export interface ProcessedResultseo {
  competitor_id?: string; // Optional for main website
  name: string;
  website_url: string;
  seo_audit: SeoAudit;
}
export interface CTRLossPercent {
  total_key_pages: number;
  total_affected_pages: number;
  CTR_Loss_Percent: number;
  extract_message: string;
}

export interface BrandProfile_logo {
  website_url: string | null;
  logo_url: string | null;
  ctr_loss_percent:CTRLossPercent | null,
}


export type SeoAuditResponse = {
  mainWebsite: {
    seo_audit: SeoAudit;
    brand_profile: BrandProfile_logo;
  };
  competitors: {
    competitor_id: string;
    seo_audit: SeoAudit;
    brand_profile: BrandProfile_logo;
  }[];
};
