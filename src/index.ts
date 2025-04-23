import express from "express";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

app.get("/users", async (req, res) => {
  const users = await prisma.api_keys.findMany();
  console.log(users, "USER ");
  res.json(users);
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
