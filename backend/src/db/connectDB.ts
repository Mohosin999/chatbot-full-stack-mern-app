import mongoose from "mongoose";

// VERCEL: removed process.exit(1) — throw instead so handler can respond with 503
const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGODB_URL as string);
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB connection error:", (error as Error).message);
    throw error;
  }
};

export default connectDB;
