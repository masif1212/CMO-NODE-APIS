import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || process.env.SYS_PORT || 8080,
  dbUrl: process.env.DATABASE_URL || "",
};
