import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Admin from "../models/Admin.js";
import User from "../models/User.js";

const router = express.Router();

const JWT_SECRET = "admin_secret";


// ================= ADMIN LOGIN =================
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const admin = await Admin.findOne({ username });

  if (!admin) {
    return res.status(400).json({ error: "Admin not found" });
  }

  const isMatch = await bcrypt.compare(password, admin.password);

  if (!isMatch) {
    return res.status(400).json({ error: "Wrong password" });
  }

  const token = jwt.sign({ id: admin._id }, JWT_SECRET);

  res.json({ token });
});


// ================= GET USERS =================
router.get("/users", async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json(users);
});

export default router;