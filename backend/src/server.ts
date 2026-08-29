import { createApp } from "./app";
import { connectDB, disconnectDB } from "./config/db";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { bootstrapAdmin } from "./jobs/bootstrapAdmin";

async function main(): Promise<void> {
  await connectDB();
  await bootstrapAdmin();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 LL Exam Portal API running on http://localhost:${env.PORT}`);
    logger.info(`📘 API docs   → http://localhost:${env.PORT}${env.API_PREFIX}/docs`);
    logger.info(`❤️  Health    → http://localhost:${env.PORT}${env.API_PREFIX}/health`);
    logger.info(`🔐 OTP mode   → ${env.OTP_MOCK_MODE ? "MOCK (codes logged to console)" : "TWILIO"}`);
    logger.info(`💳 Payments   → ${env.PAYMENT_PROVIDER}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  logger.error(`Fatal server error: ${message}`);
  process.exit(1);
});
