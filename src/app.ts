import express from "express";
import usersRouter from "./modules/users/router";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

app.use(express.json());

// Mount the router on the correct path
app.use("/api/users", usersRouter);

// Global error handler
app.use(errorHandler);

export default app;
