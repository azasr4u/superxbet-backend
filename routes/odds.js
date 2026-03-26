import express from "express";
import Score from "../models/Score.js";
import { calculateOdds } from "../services/oddsEngine.js";

const router = express.Router();

router.get("/", async (req, res) => {

  const score = await Score.findOne();

  if (!score) return res.json({});

  const odds = calculateOdds(score);

  res.json({ score, odds });
});

export default router;