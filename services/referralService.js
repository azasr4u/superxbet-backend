import User from "../models/User.js";

export const applyReferralBonus = async (userId) => {
  try {
    const user = await User.findById(userId);

    if (!user) return;

    if (!user.referredBy || user.referralRewarded) return;

    const refUser = await User.findOne({
      referralCode: user.referredBy
    });

    if (!refUser) return;

    const BONUS = 3000;
    const WAGER_MULTIPLIER = 35;

    refUser.bonusBalance = (refUser.bonusBalance || 0) + BONUS;

    refUser.wageringRequired =
      (refUser.wageringRequired || 0) + BONUS * WAGER_MULTIPLIER;

    await refUser.save();

    user.referralRewarded = true;
    await user.save();

    console.log("Referral bonus applied");

  } catch (err) {
    console.error("Referral error:", err.message);
  }
};