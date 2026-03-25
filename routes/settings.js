import express from "express";
import Setting from "../models/Setting.js";

const router = express.Router();

// GET SETTINGS
router.get("/", async (req, res) => {
  const data = await Setting.findOne();
  res.json(data);
});

// UPDATE SETTINGS
router.post("/", async (req, res) => {
  let setting = await Setting.findOne();

  if (!setting) {
    setting = new Setting(req.body);
  } else {
    Object.assign(setting, req.body);
  }

  await setting.save();

  res.json({ message: "Updated" });
});

export default router;