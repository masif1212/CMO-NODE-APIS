import dotenv from "dotenv";
dotenv.config();
import app from "./app"; // Import the app from app.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001; // Ensure PORT is a number

// Optional: Keep the /users route if needed
app.get("/users", async (req, res) => {
  const users = await prisma.api_keys.findMany();
  console.log(users, "USER ");
  res.json(users);
});

// Start the server
const HOST = "0.0.0.0"; // This is the crucial line

app.listen(PORT, HOST, () => {
  // Updated log for clarity. 'localhost' is misleading in a container environment.
  console.log(`Server listening on port ${PORT}`);
});
