import express from "express";
import Deposit from "../models/Deposit.js";
import UPI from "../models/UPI.js";
import MQR from "../models/MQR.js";
import Bank from "../models/BankAccount.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// ================= CREATE DEPOSIT =================
router.post("/", auth, async (req, res) => {
  try {

    const userId = req.user.id;
    const { amount, method, utr } = req.body;

    if (!amount || amount < 1) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    let paymentMethod = method?.toUpperCase();
    let paymentValue = null;

    // ================= UPI =================
    if (paymentMethod === "UPI") {
      let upi = await UPI.findOne({
        active: true,
        usedBy: { $nin: [userId] }
      });

      if (!upi) {
        await UPI.updateMany({}, { $set: { usedBy: [] } });
        upi = await UPI.findOne({ active: true });
      }

      if (upi) {
        paymentValue = upi.upiId;
        upi.usedBy.push(userId);
        await upi.save();
      }
    }

    // ================= MQR =================
    if (paymentMethod === "MQR") {
      let mqr = await MQR.findOne({
        active: true,
        usedBy: { $nin: [userId] }
      });

      if (!mqr) {
        await MQR.updateMany({}, { $set: { usedBy: [] } });
        mqr = await MQR.findOne({ active: true });
      }

      if (mqr) {
        paymentValue = mqr.qrImage;
        mqr.usedBy.push(userId);
        await mqr.save();
      }
    }

    // ================= BANK =================
    if (paymentMethod === "BANK") {
      let bank = await Bank.findOne({
        active: true,
        usedBy: { $nin: [userId] }
      });

      if (!bank) {
        await Bank.updateMany({}, { $set: { usedBy: [] } });
        bank = await Bank.findOne({ active: true });
      }

      if (bank) {
        paymentValue = JSON.stringify({
          bankName: bank.bankName,
          accountNumber: bank.accountNumber,
          accountHolder: bank.accountName,
          ifsc: bank.ifsc
        });

        bank.usedBy.push(userId);
        await bank.save();
      }
    }

    if (!paymentValue) {
      return res.status(400).json({
        error: "No payment method available"
      });
    }

    // ✅ FIXED MODEL MAPPING
    const deposit = new Deposit({
      userId,
      amount,
      method: paymentMethod,
      utr,
      status: "Pending"
    });

    await deposit.save();

    res.json({
      message: "Deposit request submitted",
      deposit
    });

  } catch (err) {
    console.log("DEPOSIT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;