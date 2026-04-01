import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Database from "./config/Database";

import authRoutes from "./routes/authRoutes";
import eventRoutes from "./routes/eventRoutes";
import bookingRoutes from "./routes/bookingRoutes";
import reviewRoutes from "./routes/reviewRoutes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true,
  credentials: true,
}));
app.use(express.json());


app.use(async (req, res, next) => {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/eventhive";
    await Database.getInstance().connect(mongoUri);
    next();
  } catch (err) {
    res.status(500).json({ success: false, error: "Database Connection Failed" });
  }
});

// Routes
app.use("/auth", authRoutes);
app.use("/events", eventRoutes);
app.use("/bookings", bookingRoutes);
app.use("/reviews", reviewRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// // Only listen locally, Vercel handles the exported app
// if (process.env.NODE_ENV !== "production") {
  // app.listen(PORT, () => {
  //   console.log(`Server running on http://localhost:${PORT}`);
  // });
// }

export default app;
