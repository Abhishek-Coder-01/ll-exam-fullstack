import { UserModel } from "../models/User.model";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { customAlphabet } from "../utils/nanoid";

const adminIdGen = customAlphabet("0123456789", 3);

export async function bootstrapAdmin(): Promise<void> {
  const existing = await UserModel.findOne({ role: "admin" });
  if (existing) return;

  const businessId = `ADM-${adminIdGen()}`;
  await UserModel.create({
    businessId,
    name: env.BOOTSTRAP_ADMIN_NAME,
    email: env.BOOTSTRAP_ADMIN_EMAIL,
    phone: env.BOOTSTRAP_ADMIN_PHONE,
    password: env.BOOTSTRAP_ADMIN_PASSWORD,
    role: "admin",
    isPhoneVerified: true,
    isEmailVerified: true,
  });

  logger.info(
    `👑 Bootstrapped admin account: ${env.BOOTSTRAP_ADMIN_EMAIL} (password from BOOTSTRAP_ADMIN_PASSWORD env var)`,
  );
}
