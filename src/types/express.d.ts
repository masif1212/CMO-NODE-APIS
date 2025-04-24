import "express-session";
import { Profile } from "passport";

declare module "express-session" {
  interface SessionData {
    user?: Profile;
  }
}

declare module "express-serve-static-core" {
  interface Request {
    session: Session & Partial<SessionData>;
  }
}
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
