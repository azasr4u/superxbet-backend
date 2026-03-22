import User from "../models/User.js";

export const applyReferralBonus = async (userId) => {
  try {
    const user = await User.findById(userId);

    // ❌ no referral
    if (!user.referredBy) return;

    // ❌ already rewarded
    if (user.referralRewarded) return;

    // ❌ only after first deposit
    if (!user.isFirstDeposit) return;

    const referrer = await User.findOne({
      referralCode: user.referredBy,
    });

    if (!referrer) return;

    const BONUS = 3000;

    // 🎁 ADD BONUS (NOT REAL MONEY)
    referrer.bonusBalance += BONUS;

    // 🎯 WAGER REQUIRED = BONUS × 35
    referrer.wageringRequired += BONUS * 35;

    await referrer.save();

    // ✅ mark as rewarded
    user.referralRewarded = true;
    await user.save();

    console.log("🎁 Referral bonus applied");

  } catch (err) {
    console.log("Referral Error:", err);
  }
};