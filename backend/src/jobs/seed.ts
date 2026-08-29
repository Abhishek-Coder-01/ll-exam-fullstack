import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../config/db";
import { bootstrapAdmin } from "./bootstrapAdmin";
import { logger } from "../utils/logger";
import { env } from "../config/env";

async function seed(): Promise<void> {
  await connectDB();

  logger.info("🌱 Running seed...");

  // Create bootstrap admin only
  await bootstrapAdmin();

  logger.info("✅ Admin account is ready.");
  logger.info(
    `Admin Login: ${env.BOOTSTRAP_ADMIN_EMAIL} / ${env.BOOTSTRAP_ADMIN_PASSWORD}`,
  );

  await disconnectDB();
  await mongoose.disconnect();

  process.exit(0);
}

seed().catch((err: unknown) => {
  logger.error(
    `Seed failed: ${err instanceof Error ? err.message : String(err)}`
  );
  process.exit(1);
});