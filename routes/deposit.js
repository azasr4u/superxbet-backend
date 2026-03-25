import express from "express";
import Deposit from "../models/Deposit.js";

const router = express.Router();

// ================= CREATE DEPOSIT =================
router.post("/", async (req, res) => {
  try {
    const { userId, amount } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // ❗ DO NOT UPDATE WALLET HERE
    const deposit = new Deposit({
      userId,
      amount,
      status: "Pending"
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


// ================= USER DEPOSIT HISTORY =================
router.get("/user/:id", async (req, res) => {
  try {
    const data = await Deposit.find({ userId: req.params.id });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;