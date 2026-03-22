import express from "express";
import cors from "cors";

import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";

const app = express();

// ✅ FIXED CORS (IMPORTANT 🔥)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// ✅ CONNECT DATABASE
connectDB();

// ✅ ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

// ✅ TEST ROUTE
app.get("/", (req, res) => {
  res.send("SuperXbet Backend Running 🚀");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});