// Extend Express Request if needed in the future
declare namespace Express {
  export interface Request {
    userId?: string;
  }
}

export interface PageSpeedRequest {
  url: string;
}

export interface BrokenLinkResult {
  page: string;
  link: string;
  status: number | string;
  error: string;
}
