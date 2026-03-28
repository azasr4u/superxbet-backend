import mongoose from "mongoose";

const bankSchema = new mongoose.Schema({

  bankName: {
    type: String,
    trim: true
  },

  accountNumber: {
    type: String,
    trim: true
  },

  accountName: {   // ✅ KEEP YOUR ORIGINAL (NO BREAK)
    type: String,
    trim: true
  },

  ifsc: {
    type: String,
    trim: true
  },

  usedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  ],

  active: {
    type: Boolean,
    default: true
  }

}, { timestamps: true }); // ✅ ADDED

export default mongoose.model("BankAccount", bankSchema);