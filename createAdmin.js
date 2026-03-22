import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Admin from "./models/Admin.js";

const MONGO_URL = "mongodb://superxbet:Test12345@ac-bvubaof-shard-00-00.0ait9ij.mongodb.net:27017,ac-bvubaof-shard-00-01.0ait9ij.mongodb.net:27017,ac-bvubaof-shard-00-02.0ait9ij.mongodb.net:27017/superxbet?ssl=true&replicaSet=atlas-10cb8f-shard-0&authSource=admin"; // 🔥 paste same DB URL here

const createAdmin = async () => {
  try {
    await mongoose.connect(MONGO_URL);

    console.log("Mongo Connected");

    // check if admin exists
    const existing = await Admin.findOne({ username: "admin" });

    if (existing) {
      console.log("Admin already exists");
      process.exit();
    }

    const hashedPassword = await bcrypt.hash("admin123", 10);

    await Admin.create({
      username: "admin",
      password: hashedPassword
    });

    console.log("✅ Admin created successfully");

    process.exit();

  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};

createAdmin();