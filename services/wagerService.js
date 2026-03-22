import User from "../models/User.js";

// 🎯 APPLY WAGER REDUCTION ON WIN
export const applyWagerOnWin = async (userId, winAmount) => {
  const user = await User.findById(userId);

  if (!user) return;

  // If no wagering → skip
  if (user.wageringRequired <= 0) return;

  // Deduct from wagering using WIN amount
  if (winAmount >= user.wageringRequired) {
    user.wageringRequired = 0;
  } else {
    user.wageringRequired -= winAmount;
  }

  await user.save();
};