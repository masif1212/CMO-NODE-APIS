import { users } from "@prisma/client";

export type { users }; // Re-export for clarity

// Optional: Define a safe DTO to expose in APIs (omit internal/optional fields)
export type PublicUser = Pick<users, "user_id" | "email" | "first_name" | "last_name" | "account_status" | "created_at">;
