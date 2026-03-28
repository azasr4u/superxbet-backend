import mongoose from "mongoose";

const settingSchema = new mongoose.Schema({
  upiId: String,
  qrCode: String,
  bankName: String,
  accountNumber: String,
  ifsc: String
});

export default mongoose.model("Setting", settingSchema);