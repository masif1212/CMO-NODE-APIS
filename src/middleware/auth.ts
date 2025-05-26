import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthenticatedRequest extends Request {
     user?: { user_id: string };
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
     return new Promise((resolve) => {
          const authHeader = req.headers['authorization'];
          const token = authHeader && authHeader.split(' ')[1];

          if (!token) {
               res.status(401).json({ error: 'Authentication required' });
               return resolve();
          }

          jwt.verify(token, process.env.JWT_SECRET || '', (err, user) => {
               if (err) {
                    res.status(403).json({ error: 'Invalid or expired token' });
                    return resolve();
               }
               req.user = user as { user_id: string };
               next();
               resolve();
          });
     });
}