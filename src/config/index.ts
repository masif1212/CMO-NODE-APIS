import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.SYS_PORT || 8080,
  dbUrl: process.env.DATABASE_URL || "",
};
