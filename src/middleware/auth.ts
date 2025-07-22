import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// UPDATED: Include email and other expected fields from the JWT payload
interface AuthenticatedRequest extends Request {
  user?: {
    user_id: string;
    email: string;
    role: boolean; // Assuming 'role' is also in your payload based on logs
  };
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  return new Promise((resolve) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      res.status(401).json({ error: "Authentication required" });
      return resolve();
    }

    jwt.verify(token, process.env.JWT_SECRET || "", (err, user) => {
      if (err) {
        console.log("JWT verification error:", err);
        res.status(403).json({ error: "Invalid or expired token" });
        return resolve();
      }

      // UPDATED: Assert the full user type
      req.user = user as { user_id: string; email: string; role: boolean };
      next();
      resolve();
    });
  });
}
