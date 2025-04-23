// Extend Express Request if needed in the future
declare namespace Express {
  export interface Request {
    userId?: string;
  }
}
