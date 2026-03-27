import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import {
  verifyToken
} from "../middleware/auth.js";

const router = express.Router();
const JWT_SECRET = "superxbet_secret";


// ================= REGISTER =================
router.post("/register", async (req, res) => {
  try {
    let { fullName, address, phone, email, password, referralCode } = req.body;

    phone = phone.toString().trim();
    email = email?.toString().trim();

    const exists = await User.findOne({ phone });
    if (exists) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 🔥 GENERATE UNIQUE REFERRAL
    const myReferral = "SX" + Math.floor(100000 + Math.random() * 900000);

    let referredBy = null;

    if (referralCode) {
      const refUser = await User.findOne({ referralCode });

      if (!refUser) {
        return res.status(400).json({ error: "Invalid referral code" });
      }

      if (refUser.phone === phone) {
        return res.status(400).json({ error: "Self referral not allowed" });
      }

      referredBy = referralCode;
    }

    const user = new User({
      fullName,
      address,
      phone,
      email,
      password: hashedPassword,
      referralCode: myReferral,
      referredBy,
    });

    await user.save();

    res.json({
      message: "Registered successfully",
      referralCode: myReferral
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ================= LOGIN =================
router.post("/login", async (req, res) => {
  try {
    const { phone, password } = req.body;

    const user = await User.findOne({ phone });

    if (!user) return res.status(400).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) return res.status(400).json({ error: "Wrong password" });

    const token = jwt.sign({ id: user._id }, JWT_SECRET);

    res.json({
  token,
  user: {
    id: user._id,
    fullName: user.fullName,
    phone: user.phone,
    walletBalance: user.walletBalance,
  }
});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ================= PROFILE =================
router.get("/profile", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,

      walletBalance: user.walletBalance || 0, // ✅ CRITICAL FIX

      bonus: user.bonusBalance || 0,
      wagering: user.wageringRequired || 0,

      referralCode: user.referralCode
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
export default router;