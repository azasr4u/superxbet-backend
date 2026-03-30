import express from "express";
import Deposit from "../models/Deposit.js";
import UPI from "../models/UPI.js";
import MQR from "../models/MQR.js";
import Bank from "../models/BankAccount.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// ================= CREATE DEPOSIT =================
router.post("/", verifyToken, async (req, res) => {
  try {

    const userId = req.user.id;
    let { amount, method, utr } = req.body;

    if (!method) {
      return res.status(400).json({ error: "Payment method required" });
    }

    if (!amount || amount < 1) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    method = method.toUpperCase(); // ✅ IMPORTANT FIX

    let paymentValue = null;

    if (method === "UPI") {
      const upi = await UPI.findOne({ active: true });
      if (upi) paymentValue = upi.upiId;
    }

    if (method === "MQR") {
      const mqr = await MQR.findOne({ active: true });
      if (mqr) paymentValue = mqr.qrImage;
    }

    if (method === "BANK") {
      const bank = await Bank.findOne({ active: true });
      if (bank) paymentValue = "bank";
    }

    if (!paymentValue) {
      paymentValue = "manual";
    }

    const deposit = new Deposit({
      userId,
      amount,
      method,
      utr,
      status: "Pending"
    });

    await deposit.save();

    res.json({
      success: true,
      message: "Deposit request submitted",
      deposit
    });

  } catch (err) {
    console.log("DEPOSIT ERROR FULL:", err.stack);
    res.status(500).json({ error: err.message });
  }
});

// ================= DEPOSIT HISTORY =================
router.get("/my", verifyToken, async (req, res) => {
  try {
    const deposits = await Deposit.find({ userId: req.user.id })
      .sort({ createdAt: -1 });

    res.json(deposits);
  } catch (err) {
    console.log("DEPOSIT HISTORY ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;