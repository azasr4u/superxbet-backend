import express from "express";
import User from "../models/User.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

router.get("/profile", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.json({
      name: user.name,
      walletBalance: user.walletBalance || 0
    });

  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;