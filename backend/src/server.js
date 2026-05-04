import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import { connectDB } from "./config/db.js";
import couponRoutes from "./routes/couponRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import { seedCoupons } from "./seed/couponSeed.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173"
  })
);
app.use(express.json());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again after some time."
  }
});

const submitLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Submission rate limit exceeded. Please try again later."
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "Server is healthy" });
});

app.use("/api", apiLimiter);
app.use("/api/coupons", couponRoutes);
app.use("/api/leads", submitLimiter, leadRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    message: "Internal server error."
  });
});

const startServer = async () => {
  try {
    await connectDB();
    await seedCoupons();
    app.listen(port, () => {
      console.log(`Backend running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
