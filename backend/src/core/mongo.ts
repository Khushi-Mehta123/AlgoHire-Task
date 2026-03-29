import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error("MONGODB_URI is required for Mongoose connection");
}

let isConnected = false;

export async function connectMongo(): Promise<void> {
  if (isConnected) {
    return;
  }

  await mongoose.connect(mongoUri, {
    // Assumed long-running API server workload with moderate burst traffic.
    maxPoolSize: 50,
    minPoolSize: 10,
    maxIdleTimeMS: 300_000,
    serverSelectionTimeoutMS: 5_000,
    connectTimeoutMS: 10_000,
    socketTimeoutMS: 30_000
  });

  isConnected = true;
}
