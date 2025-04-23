import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email(),
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
});

export const updateUserSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  account_status: z.enum(["active", "inactive", "suspended"]).optional(),
  is_email_verified: z.boolean().optional(),
  is_mfa_enabled: z.boolean().optional(),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
