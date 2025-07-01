import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  dbUrl: process.env.DATABASE_URL || "",
};
