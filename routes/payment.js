import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { getUpiForUser, getMQRForUser, getBankForUser } from "../services/paymentAllocator.js";

const router = express.Router();

/// 🔥 GET PAYMENT METHOD
router.get("/deposit/options", verifyToken, async (req, res) => {
  try {

    const userId = req.user.id;

    const upi = await getUpiForUser(userId);
    const mqr = await getMQRForUser(userId);
    const bank = await getBankForUser(userId);

    res.json({
      upi,
      mqr,
      bank
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;