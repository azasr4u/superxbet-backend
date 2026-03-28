import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { verifyToken } from "../middleware/auth.js";
import { adminOnly, agentOrAdmin } from "../middleware/roles.js";

import Deposit from "../models/Deposit.js";
import Withdraw from "../models/Withdraw.js";
import User from "../models/User.js";
import Match from "../models/Match.js";
import Bet from "../models/Bet.js";
import LiveOdds from "../models/LiveOdds.js";
import KYC from "../models/KYC.js";
import MQR from "../models/MQR.js";
import Bank from "../models/BankAccount.js";
import UPI from "../models/UPI.js";

import { calculateOdds } from "../services/oddsEngine.js";

const router = express.Router();
const SECRET = process.env.JWT_SECRET || "superxbet_secret";


// ================= LOGIN =================
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({
    $or: [{ phone: username }, { email: username }]
  });

  if (!user) return res.status(400).json({ error: "User not found" });
  if (!["admin", "agent"].includes(user.role)) {
    return res.status(403).json({ error: "Access denied" });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: "Wrong password" });

  const token = jwt.sign(
    { id: user._id, role: user.role },
    SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token, role: user.role });
});


// ================= DASHBOARD =================
router.get("/dashboard", verifyToken, agentOrAdmin, async (req, res) => {
  const users = await User.find();

  const result = [];

  for (let u of users) {
    const deposits = await Deposit.find({ userId: u._id, status: "Approved" });
    const withdraws = await Withdraw.find({ userId: u._id, status: "Approved" });

    result.push({
      id: u._id,
      phone: u.phone,
      wallet: u.walletBalance || 0,
      bonus: u.bonusBalance || 0,
      wageringLeft: u.wageringRequired || 0,
      totalDeposits: deposits.reduce((a,b)=>a+b.amount,0),
      totalWithdraws: withdraws.reduce((a,b)=>a+b.amount,0)
    });
  }

  res.json({ users: result });
});


// ================= DEPOSITS =================
router.get("/deposits", verifyToken, agentOrAdmin, async (req,res)=>{
  const data = await Deposit.find().populate("userId","phone");
  res.json(data);
});

router.post("/deposit/approve/:id", verifyToken, agentOrAdmin, async (req,res)=>{
  const dep = await Deposit.findById(req.params.id);
  if (!dep || dep.status !== "Pending") return res.json({ message:"Invalid" });

  const user = await User.findById(dep.userId);
  user.walletBalance += dep.amount;
  await user.save();

  // 🔥 AGENT COMMISSION
  if (user.agentId) {
    const agent = await User.findById(user.agentId);
    if (agent) {
      const percent = agent.commissionPercent || 10;
      const commission = dep.amount * (percent / 100);
      agent.commissionBalance += commission;
      await agent.save();
    }
  }

  dep.status = "Approved";
  await dep.save();

  res.json({ success:true });
});

router.post("/deposit/reject/:id", verifyToken, adminOnly, async (req,res)=>{
  const dep = await Deposit.findById(req.params.id);
  if (!dep || dep.status !== "Pending") return res.json({ message:"Invalid" });

  dep.status = "Rejected";
  await dep.save();

  res.json({ success:true });
});


// ================= WITHDRAW =================
router.get("/withdraws", verifyToken, agentOrAdmin, async (req,res)=>{
  const data = await Withdraw.find().populate("userId","phone");
  res.json(data);
});

router.post("/withdraw/approve/:id", verifyToken, adminOnly, async (req,res)=>{
  const wd = await Withdraw.findById(req.params.id);
  if (!wd || wd.status !== "Pending") return res.json({ message:"Invalid" });

  wd.status = "Approved";
  await wd.save();

  res.json({ success:true });
});

router.post("/withdraw/reject/:id", verifyToken, adminOnly, async (req,res)=>{
  const wd = await Withdraw.findById(req.params.id);
  if (!wd || wd.status !== "Pending") return res.json({ message:"Invalid" });

  const user = await User.findById(wd.userId);
  if (user) {
    user.walletBalance += wd.amount;
    await user.save();
  }

  wd.status = "Rejected";
  await wd.save();

  res.json({ success:true });
});


// ================= KYC =================
router.get("/kyc", verifyToken, agentOrAdmin, async (req,res)=>{
  const data = await KYC.find().populate("userId","phone");
  res.json(data);
});

router.post("/kyc/approve/:id", verifyToken, adminOnly, async (req,res)=>{
  const kyc = await KYC.findById(req.params.id);
  if (!kyc) return res.json({ error:"Not found" });

  kyc.status = "Approved";
  await kyc.save();

  const user = await User.findById(kyc.userId);
  user.kycVerified = true;
  await user.save();

  res.json({ success:true });
});

router.post("/kyc/reject/:id", verifyToken, adminOnly, async (req,res)=>{
  const kyc = await KYC.findById(req.params.id);
  if (!kyc) return res.json({ error:"Not found" });

  kyc.status = "Rejected";
  await kyc.save();

  res.json({ success:true });
});


// ================= REFERRAL =================
router.get("/referrals", verifyToken, adminOnly, async (req,res)=>{
  const users = await User.find({ referredBy: { $ne:null } });

  const data = [];

  for (let u of users){
    const refUser = await User.findOne({ referralCode: u.referredBy });
    const dep = await Deposit.findOne({ userId:u._id, status:"Approved" });

    data.push({
      userId:u._id,
      phone:u.phone,
      referredBy: refUser?.phone || "N/A",
      hasDeposited: !!dep,
      bonusGiven: u.referralRewarded
    });
  }

  res.json(data);
});

router.post("/referral/approve/:id", verifyToken, adminOnly, async (req,res)=>{
  const user = await User.findById(req.params.id);

  if (!user || user.referralRewarded) return res.json({ message:"Invalid" });

  const refUser = await User.findOne({ referralCode: user.referredBy });

  if (refUser){
    refUser.walletBalance += 100;
    await refUser.save();
  }

  user.referralRewarded = true;
  await user.save();

  res.json({ success:true });
});

router.post("/referral/reject/:id", verifyToken, adminOnly, async (req,res)=>{
  const user = await User.findById(req.params.id);
  user.referralRewarded = false;
  await user.save();

  res.json({ success:true });
});


// ================= AGENTS =================
router.post("/agent/create", verifyToken, adminOnly, async (req,res)=>{
  const { phone, password } = req.body;

  const hashed = await bcrypt.hash(password,10);

  const agent = await User.create({
    phone,
    password: hashed,
    role:"agent",
    commissionPercent:10,
    commissionBalance:0
  });

  res.json(agent);
});

router.get("/agents", verifyToken, adminOnly, async (req,res)=>{
  const agents = await User.find({ role:"agent" });
  res.json(agents);
});

router.post("/agent/delete/:id", verifyToken, adminOnly, async (req,res)=>{
  await User.findByIdAndDelete(req.params.id);
  res.json({ success:true });
});


// ================= UPI =================
router.get("/upi", verifyToken, adminOnly, async (req,res)=>{
  const data = await UPI.find();
  res.json(data);
});

router.post("/upi/save", verifyToken, adminOnly, async (req,res)=>{
  await UPI.deleteMany({});

  const list = req.body.upiList
    .filter(u => u && u.trim() !== "")
    .map(u => ({
      upiId: u.trim(),
      usedBy: [],
      active: true
    }));

  await UPI.insertMany(list);

  res.json({ success:true });
});


// ================= MQR =================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads/"),
  filename: (req, file, cb) => cb(null, Date.now()+"_"+file.originalname)
});
const upload = multer({ storage });

router.post("/mqr/upload", verifyToken, adminOnly, upload.array("qrs",100), async (req,res)=>{
  await MQR.deleteMany({});

  const data = req.files.map(f=>({
    qrImage:"/uploads/"+f.filename,
    usedBy:[],
    active:true
  }));

  await MQR.insertMany(data);

  res.json({ success:true });
});


// ================= BANK =================
router.get("/bank", verifyToken, adminOnly, async (req,res)=>{
  const data = await Bank.find();
  res.json(data);
});

router.post("/bank/save", verifyToken, adminOnly, async (req,res)=>{
  await Bank.deleteMany({});

  const list = req.body.banks.map(b => ({
    bankName: b.bankName,
    accountNumber: b.accountNumber,
    accountName: b.accountName,
    ifsc: b.ifsc,
    usedBy: [],
    active: true
  }));

  await Bank.insertMany(list);

  res.json({ success:true });
});


// ================= MATCH + ODDS =================
router.get("/match", async (req,res)=>{
  const m = await Match.findOne();
  res.json(m);
});

router.post("/match/update", verifyToken, agentOrAdmin, async (req,res)=>{
  const { type, value } = req.body;

  let m = await Match.findOne();
  if (!m) m = new Match();

  if (type==="run"){ m.score+=value; m.balls++; }
  if (type==="wide"||type==="noball"){ m.score+=1; }
  if (type==="wicket"){ m.wickets++; m.balls++; }

  m.overs=(m.balls/6).toFixed(1);

  // 🔥 USING YOUR ODDS ENGINE
  const odds = calculateOdds({
    score: m.score,
    wickets: m.wickets,
    balls: m.balls,
    target: m.target,
    innings: m.innings
  });

  m.oddsA = odds.teamA;
  m.oddsB = odds.teamB;

  await m.save();

  await LiveOdds.findOneAndUpdate(
    {},
    { match: m.matchName, odds: { A:m.oddsA, B:m.oddsB }},
    { upsert:true }
  );

  res.json(m);
});


// ================= BET RESULT =================
router.post("/match/result", verifyToken, adminOnly, async (req,res)=>{
  const { winner } = req.body;

  const bets = await Bet.find({ status:"pending" });

  for (let bet of bets){
    const user = await User.findById(bet.userId);

    if (bet.selection === winner){
      const win = bet.potentialWin || 0;
      user.walletBalance += win;

      if (user.agentId){
        const agent = await User.findById(user.agentId);
        if (agent){
          const percent = agent.commissionPercent || 10;
          agent.commissionBalance += win*(percent/100);
          await agent.save();
        }
      }

      bet.status="won";
    } else {
      bet.status="lost";
    }

    bet.settled=true;

    await user.save();
    await bet.save();
  }

  res.json({ message:"Settled" });
});


export default router;