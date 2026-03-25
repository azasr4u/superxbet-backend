import express from "express";
import Deposit from "../models/Deposit.js";

const router = express.Router();

// ================= CREATE DEPOSIT =================
router.post("/", async (req, res) => {
  try {
    const { userId, amount } = req.body;

    const deposit = new Deposit({
      userId,
      amount,
      status: "Pending" // ✅ IMPORTANT
    });

    await deposit.save();

    res.json({
      message: "Deposit request submitted",
      deposit
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;