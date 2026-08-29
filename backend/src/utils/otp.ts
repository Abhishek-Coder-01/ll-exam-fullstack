import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { env } from "../config/env";

export function generateOtpCode(): string {
  const min = 10 ** (env.OTP_LENGTH - 1);
  const max = 10 ** env.OTP_LENGTH;
  return String(randomInt(min, max));
}

export async function hashOtp(code: string): Promise<string> {
  return bcrypt.hash(code, env.BCRYPT_SALT_ROUNDS);
}

export async function verifyOtp(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}
