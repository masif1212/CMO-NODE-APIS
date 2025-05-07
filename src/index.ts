import dotenv from "dotenv";
dotenv.config();
import app from "./app"; // Import the app from app.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Optional: Keep the /users route if needed
app.get("/users", async (req, res) => {
  const users = await prisma.api_keys.findMany();
  console.log(users, "USER ");
  res.json(users);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});