import mongoose from "mongoose";

const upiSchema = new mongoose.Schema({

  upiId: {
    type: String,
    required: true
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

}, { timestamps: true });

export default mongoose.model("UPI", upiSchema);