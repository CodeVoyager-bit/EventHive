import "dotenv/config";
import express from "express";
import cors from "cors";
import Database from "./config/Database";

import authRoutes from "./routes/authRoutes";
import eventRoutes from "./routes/eventRoutes";
import bookingRoutes from "./routes/bookingRoutes";
import reviewRoutes from "./routes/reviewRoutes";

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true,
  credentials: true,
}));
app.use(express.json());

// Ensure a DB connection before handling any request (serverless-safe: the connection is cached)
app.use(async (_req, res, next) => {
  try {
    await Database.getInstance().connect(process.env.MONGODB_URI || "mongodb://localhost:27017/eventhive");
    next();
  } catch (err) {
    console.error("Database connection failed:", err);
    res.status(500).json({ success: false, error: "Database connection failed" });
  }
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

// Only listen locally, Vercel handles the exported app
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
