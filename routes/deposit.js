import User from "../models/User.js";

export const applyReferralBonus = async (userId) => {
  try {
    // 🔍 Get user who made deposit
    const user = await User.findById(userId);

    if (!user) {
      console.log("User not found");
      return;
    }

    // ❌ No referral OR already rewarded
    if (!user.referredBy || user.referralRewarded) {
      return;
    }

    // 🔍 Find referrer
    const refUser = await User.findOne({
      referralCode: user.referredBy
    });

    if (!refUser) {
      console.log("Referrer not found");
      return;
    }

    // 🎁 BONUS AMOUNT
    const BONUS = 3000;
    const WAGER_MULTIPLIER = 35;

    refUser.bonusBalance = (refUser.bonusBalance || 0) + BONUS;

    refUser.wageringRequired =
      (refUser.wageringRequired || 0) + BONUS * WAGER_MULTIPLIER;

    await refUser.save();

    // ✅ Mark as rewarded (very important to avoid duplicate bonus)
    user.referralRewarded = true;
    await user.save();

    console.log("Referral bonus applied");

  } catch (err) {
    console.error("Referral bonus error:", err.message);
  }
};