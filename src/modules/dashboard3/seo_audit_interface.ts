export interface SchemaMarkupStatus {
  url: string;
  message: string;
  schemas: {
    summary: Array<{ type: string; format: string; isValid: boolean }>;
    // details: { [key: string]: Array<{ type: string; format: string; isValid: boolean }> };
  };
}

// export interface SeoAudit {
//   h1_heading: string | null;
//   website_name:string | null;
//   meta_title: string | null;
//   meta_description: string | null;
//   alt_text_coverage: number | null;
//   isCrawlable: boolean | false;
//   headingAnalysis: {
//     // hasH1: boolean;
//     totalHeadings: number;
//     // headingLevelsUsed: string[];
//     headingOrderUsed: string[];
//     hasMultipleH1s: boolean;
//     skippedHeadingLevels: boolean;
//     reversedHeadingOrder: boolean;
//     headingHierarchyIssues: boolean;
//     message: string;
//   } | null;
//   schema_markup_status: SchemaMarkupStatus | null;
//   AI_Discoverability: string;
// }

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

// export interface BrandProfile_logo {
//   website_url: string | null;
//   logo_url: string | null;
//   ctr_loss_percent:CTRLossPercent | null,
// }


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




export interface SeoAudit {

  meta_title:any,
  website_name: string | null;
  meta_description: string | null;
  page_title: string | null;
  meta_keywords?: string | null;
  schema_markup_status: SchemaMarkupStatus | null;
  isCrawlable: boolean | null;
  headingAnalysis: any;
  alt_text_coverage: any;
  h1_heading: string | null;
  AI_Discoverability?: string | null;
   brandAuditseo?: any; // 👈 optional
}

export interface BrandProfile_logo {
  website_name?: string;
  title?: string;
  website_url: any;
  revenueLossPercent?: number | null;
  industry?: string | null;
  logo_url?: string | null;
  primary_offering?: string | null;
  unique_selling_point?: string | null;
  ctr_loss_percent?: number | string | boolean | object | null;
}

export interface CompetitorResult {
  competitor_id: any;
  brand_profile: BrandProfile_logo;
  website_audit: {
    performance_insights: {
      performance: number | null;
      seo: number | null;
      accessibility: number | null;
      best_practices: number | null;
    };
    website_health_matrix: {
      speed_index: { display_value: string; score: number | null };
      total_blocking_time: { display_value: string; score: number | null };
      first_contentful_paint: { display_value: string; score: number | null };
      largest_contentful_paint: { display_value: string; score: number | null };
      cumulative_layout_shift: { display_value: string; score: number | null };
    };
  };
  seo_audit: SeoAudit;
}