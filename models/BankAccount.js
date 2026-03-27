import mongoose from "mongoose";

const bankSchema = new mongoose.Schema({

  bankName: String,
  accountNumber: String,
  accountName: String,
  ifsc: String,

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

});

export default mongoose.model("BankAccount", bankSchema);