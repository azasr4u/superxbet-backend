import express from "express";
import Match from "../models/Match.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const matches = await Match.find().sort({ createdAt: -1 });
  res.json(matches);
});

export default router;