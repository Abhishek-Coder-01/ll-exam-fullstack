import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "../utils/logger";

const dns = require("dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

export async function connectDB(): Promise<void> {
  try {
    mongoose.set("strictQuery", true);
    await mongoose.connect(env.MONGO_URI, {
      autoIndex: env.NODE_ENV !== "production",
    });
    logger.info(`✅ MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);

    mongoose.connection.on("error", (err: Error) => {
      logger.error(`MongoDB error: ${err.message}`);
    });
    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected");
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`❌ MongoDB connection failed: ${message}`);
    process.exit(1);
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  logger.info("MongoDB disconnected gracefully");
}
