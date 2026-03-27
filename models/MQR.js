import mongoose from "mongoose";

const mqrSchema = new mongoose.Schema({

  imageUrl: {
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

});

export default mongoose.model("MQR", mqrSchema);