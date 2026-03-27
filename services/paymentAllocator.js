import Upi from "../models/Upi.js";
import MQR from "../models/MQR.js";
import BankAccount from "../models/BankAccount.js";

/// 🔥 RANDOM PICK FUNCTION
function randomPick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/// 🔥 UPI ALLOCATOR
export async function getUpiForUser(userId) {

  const all = await Upi.find({ active: true });

  const available = all.filter(
    u => !u.usedBy.includes(userId)
  );

  if (available.length === 0) {
    throw new Error("No UPI available");
  }

  const selected = randomPick(available);

  selected.usedBy.push(userId);
  await selected.save();

  return selected.upiId;
}

/// 🔥 MQR ALLOCATOR
export async function getMQRForUser(userId) {

  const all = await MQR.find({ active: true });

  const available = all.filter(
    u => !u.usedBy.includes(userId)
  );

  if (available.length === 0) {
    throw new Error("No QR available");
  }

  const selected = randomPick(available);

  selected.usedBy.push(userId);
  await selected.save();

  return selected.imageUrl;
}

/// 🔥 BANK ALLOCATOR
export async function getBankForUser(userId) {

  const all = await BankAccount.find({ active: true });

  const available = all.filter(
    b => !b.usedBy.includes(userId)
  );

  if (available.length === 0) {
    throw new Error("No bank available");
  }

  const selected = randomPick(available);

  selected.usedBy.push(userId);
  await selected.save();

  return selected;
}