import mongoose from "mongoose";

const mqrSchema = new mongoose.Schema({

  qrImage: {
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

export default mongoose.model("MQR", mqrSchema);