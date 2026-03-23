import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";

const app = express();

// ✅ FIX __dirname FIRST (VERY IMPORTANT)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ MIDDLEWARE
app.use(express.json());

// ✅ CORS (ALLOW ALL)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// ✅ SERVE ADMIN PANEL (AFTER __dirname)
app.use("/admin", express.static(path.join(__dirname, "public/admin")));

// ✅ CONNECT DATABASE
connectDB();

// ✅ ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

// ✅ TEST ROUTE
app.get("/", (req, res) => {
  res.send("SuperXbet Backend Running 🚀");
});

// ✅ START SERVER
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});