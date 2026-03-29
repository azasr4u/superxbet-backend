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
import oddsRoutes from "./routes/odds.js";
import userRoutes from "./routes/user.js";
import paymentRoutes from "./routes/payment.js";
import agentRoutes from "./routes/agent.js";
import matchRoutes from "./routes/match.js";



// ❌ REMOVE THIS OR MERGE INTO adminRoutes
// import adminBanking from "./routes/adminBanking.js";

const app = express();

// ✅ __dirname FIX
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ MIDDLEWARE
app.use(express.json());

app.use(cors({
  origin: "*", // 🔒 change to your domain later
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// ✅ STATIC ADMIN PANEL
app.use("/admin", express.static(path.join(__dirname, "public/admin")));

// ✅ CONNECT DB FIRST
connectDB();

// ✅ ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/game", gameRoutes);
app.use("/api/deposit", depositRoutes);
app.use("/api/withdraw", withdrawRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/bet", betRoutes);
app.use("/api/odds", oddsRoutes);
app.use("/api/user", userRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/match", matchRoutes);
app.use("/api/agent", agentRoutes);

// ✅ TEST ROUTE
app.get("/", (req, res) => {
  res.send("SuperXbet Backend Running 🚀");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});