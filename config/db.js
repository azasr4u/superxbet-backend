import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(
      "mongodb://superxbet:Test12345@ac-bvubaof-shard-00-00.0ait9ij.mongodb.net:27017,ac-bvubaof-shard-00-01.0ait9ij.mongodb.net:27017,ac-bvubaof-shard-00-02.0ait9ij.mongodb.net:27017/superxbet?ssl=true&replicaSet=atlas-10cb8f-shard-0&authSource=admin"
    );

    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.log("❌ Mongo Error:", error);
    process.exit(1);
  }
};

export default connectDB;