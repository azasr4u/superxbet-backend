import express from "express";
import { handleWin } from "../services/walletService.js";
import User from "../models/User.js";

const router = express.Router();


// 🎯 PLACE BET (optional future use)
router.post("/bet", async (req, res) => {
  try {
    const { userId, amount } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.walletBalance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    user.walletBalance -= amount;
    await user.save();

    res.json({ message: "Bet placed" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// 🏆 WIN API (🔥 VERY IMPORTANT)
router.post("/win", async (req, res) => {
  try {
    const { userId, winAmount } = req.body;

    await handleWin(userId, winAmount);

    res.json({ message: "Win processed" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


export default router;                  