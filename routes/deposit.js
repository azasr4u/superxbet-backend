import express from "express";
import Deposit from "../models/Deposit.js";
import Upi from "../models/UPI.js";
import Mqr from "../models/MQR.js";
import Bank from "../models/BankAccount.js";

const router = express.Router();


// ================= CREATE DEPOSIT =================
router.post("/", async (req, res) => {
  try {
    const { userId, amount } = req.body;

    let paymentMethod = "UPI";
    let paymentValue = null;

    // ================= UPI =================
    let upi = await Upi.findOne({
      active: true,
      usedBy: { $ne: userId }
    });

    // 🔁 RESET IF ALL USED
    if (!upi) {
      await Upi.updateMany({}, { $set: { usedBy: [] } });
      upi = await Upi.findOne({ active: true });
    }

    if (upi) {
      paymentMethod = "UPI";
      paymentValue = upi.upiId;

      upi.usedBy.push(userId);
      await upi.save();
    }

    // ================= MQR =================
    if (!paymentValue) {

      let mqr = await Mqr.findOne({
        active: true,
        usedBy: { $ne: userId }
      });

      if (!mqr) {
        await Mqr.updateMany({}, { $set: { usedBy: [] } });
        mqr = await Mqr.findOne({ active: true });
      }

      if (mqr) {
        paymentMethod = "MQR";
        paymentValue = mqr.qrImage;

        mqr.usedBy.push(userId);
        await mqr.save();
      }
    }

    // ================= BANK =================
    if (!paymentValue) {

      let bank = await Bank.findOne({
        active: true,
        usedBy: { $ne: userId }
      });

      if (!bank) {
        await Bank.updateMany({}, { $set: { usedBy: [] } });
        bank = await Bank.findOne({ active: true });
      }

      if (bank) {
        paymentMethod = "BANK";
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

    // ================= SAFETY =================
    if (!paymentValue) {
      return res.status(400).json({
        error: "No payment methods available"
      });
    }

    // ================= CREATE DEPOSIT =================
    const deposit = new Deposit({
      userId,
      amount,
      paymentMethod,
      paymentValue,
      status: "Pending"
    });

    await deposit.save();

    // ================= RESPONSE =================
    res.json({
      message: "Deposit request submitted",
      deposit,
      paymentMethod,
      paymentValue
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;