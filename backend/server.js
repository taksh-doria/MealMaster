import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.js";
import { requireAuth } from "./middleware/auth.js";
import recipeRoutes from "./routes/recipes.js";
import mealPlanRoutes from "./routes/mealPlans.js";
import shoppingListRoutes from "./routes/shoppingLists.js";
import multer from "multer";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// Security & rate limiting
app.use(helmet());

// CORS
const allowedOrigins = ["http://localhost:4200"];
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.options("*", cors());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.get("/api/health", (_req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/recipes", requireAuth, recipeRoutes);
app.use("/api/meal-plans", requireAuth, mealPlanRoutes);
app.use("/api/shopping-lists", requireAuth, shoppingListRoutes);

// Error handler
app.use((err, _req, res, _next) => {
  console.error("Server Error:", err);
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors: Object.values(err.errors).map((e) => e.message),
    });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ success: false, message: "Invalid ID format" });
  }
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ success: false, message: "CORS blocked this origin" });
  }
  res.status(500).json({ success: false, message: "Internal server error" });
});

// 404
app.use("*", (_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// DB connection & server start
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/mealmaster", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`MealMaster API running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nShutting down gracefully...");
  await mongoose.connection.close();
  process.exit(0);
});
