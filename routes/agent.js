import express from "express";
import User from "../models/User.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

/* ============================
   GET AGENT USERS
============================ */
router.get("/users", verifyToken, async (req, res) => {
  try {

    if (req.user.role !== "agent") {
      return res.status(403).json({ error: "Access denied" });
    }

    const users = await User.find({ agentId: req.user.id });

    res.json(users);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;