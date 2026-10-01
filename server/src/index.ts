import "dotenv/config";
import express from "express";
import cors from "cors";
import Database from "./config/Database";
import { errorHandler } from "./middleware/errorHandler";

import authRoutes from "./routes/authRoutes";
import eventRoutes from "./routes/eventRoutes";
import bookingRoutes from "./routes/bookingRoutes";
import reviewRoutes from "./routes/reviewRoutes";

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true,
  credentials: true,
}));
app.use(express.json());

// Ensure a DB connection before handling any request (serverless-safe: the connection is cached)
app.use(async (_req, _res, next) => {
  await Database.getInstance().connect(process.env.MONGODB_URI || "mongodb://localhost:27017/eventhive");
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reviews", reviewRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Not found" });
});
app.use(errorHandler);

// Exported for Vercel (serverless) and tests; src/server.ts listens locally
export default app;
