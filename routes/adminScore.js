import express from "express";
import Score from "../models/Score.js";
import { verifyAdmin } from "../middleware/auth.js";
import { settleBets } from "../services/settlement.js"; // ✅ IMPORTANT

const router = express.Router();

/// ================= UPDATE SCORE =================
router.post("/update", verifyAdmin, async (req, res) => {

  try {

    const data = req.body;

    let score = await Score.findOne();

    if (!score) {
      score = await Score.create(data);
    } else {
      Object.assign(score, data);
      await score.save();
    }

    /// 🔥 STEP 6 (AUTO SETTLEMENT TRIGGER)
    await settleBets(score);

    res.json({
      message: "Score updated & bets settled",
      score
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/// ================= GET SCORE =================
router.get("/", async (req, res) => {
  const score = await Score.findOne();
  res.json(score);
});

export default router;