import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sheriyans_hackathon";
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`\x1b[32m✔ MongoDB Connected: ${conn.connection.host} (DB: ${conn.connection.name})\x1b[0m`);
    return conn;
  } catch (error) {
    console.error(`\x1b[31m✖ MongoDB Connection Error:\x1b[0m ${error.message}`);
    console.warn(`\x1b[33m⚠ Note: Make sure MongoDB is running locally or set your MongoDB Atlas URI in .env file (MONGODB_URI=...)\x1b[0m`);
    // Not calling process.exit(1) to allow API and healthcheck testing even before DB is connected
  }
};
