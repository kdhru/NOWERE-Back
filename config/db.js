import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "node:dns";

dotenv.config();

/* 🔥 FIX DNS (MongoDB Atlas issue) */
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URL) {
      throw new Error("MONGO_URL not found in .env");
    }

    mongoose.set("strictQuery", true);

    const conn = await mongoose.connect(process.env.MONGO_URL, {
      serverSelectionTimeoutMS: 10000,
      family: 4, // 🔥 force IPv4 (important)
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

  } catch (error) {
    console.error("❌ DB Error:", error.message);

    // 🔁 Retry after 5 sec
    setTimeout(connectDB, 5000);
  }
};

export default connectDB;