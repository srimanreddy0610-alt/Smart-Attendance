import mongoose from "mongoose";

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  const MONGO_URI = process.env.MONGO_URI;

  if (!MONGO_URI) {
    throw new Error("Please define the MONGO_URI environment variable inside .env");
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    console.log("================ DB INITIALIZATION ================");
    console.log("Connecting to MongoDB...");

    cached.promise = mongoose.connect(MONGO_URI as string, opts).then((mongoose) => {
      console.log("MongoDB connected successfully");
      return mongoose;
    }).catch(err => {
      console.error("MongoDB connection error:", err);
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Ensure the standard export name matches usage
export const getDb = connectToDatabase;