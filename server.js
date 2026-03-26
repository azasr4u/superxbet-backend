import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";

import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import gameRoutes from "./routes/game.js";
import depositRoutes from "./routes/deposit.js";
import withdrawRoutes from "./routes/withdraw.js";
import settingsRoutes from "./routes/settings.js";
import betRoutes from "./routes/bet.js";



const app = express();

// ✅ FIX __dirname FIRST
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ MIDDLEWARE FIRST
app.use(express.json());

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// ✅ STATIC
app.use("/admin", express.static(path.join(__dirname, "public/admin")));

// ✅ DB
connectDB();

// ✅ ROUTES (AFTER middleware)
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/game", gameRoutes);
app.use("/api/deposit", depositRoutes);
app.use("/api/withdraw", withdrawRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/bet", betRoutes);

// ✅ TEST
app.get("/", (req, res) => {
  res.send("SuperXbet Backend Running 🚀");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});