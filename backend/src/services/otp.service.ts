import { OtpModel, type OtpPurpose } from "../models/Otp.model";
import { generateOtpCode, hashOtp, verifyOtp } from "../utils/otp";
import { sendSms } from "./sms.service";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";

const MAX_ATTEMPTS = 5;

export interface RequestOtpResult {
  message: string;
  expiresInMinutes: number;
  mockedCode?: string;
}

/**
 * Create and send an OTP.
 *  - Enforces cooldown between requests (OTP_RESEND_COOLDOWN_SECONDS).
 *  - Consumes any prior unconsumed OTPs of the same (phone, purpose) pair to
 *    prevent reuse of stale codes.
 *  - Delivers via Twilio (or logs to console in OTP_MOCK_MODE).
 */
export async function requestOtp(
  phone: string,
  purpose: OtpPurpose,
  userId?: string,
): Promise<RequestOtpResult> {
  // Cooldown: reject if a fresh, unconsumed OTP was created within cooldown window.
  const cooldownAgo = new Date(Date.now() - env.OTP_RESEND_COOLDOWN_SECONDS * 1000);
  const existing = await OtpModel.findOne({
    phone,
    purpose,
    consumed: false,
    createdAt: { $gt: cooldownAgo },
  }).sort({ createdAt: -1 });

  if (existing) {
    const secondsLeft = Math.max(
      1,
      env.OTP_RESEND_COOLDOWN_SECONDS -
        Math.floor((Date.now() - existing.createdAt.getTime()) / 1000),
    );
    throw ApiError.tooMany(`Please wait ${secondsLeft}s before requesting a new OTP.`);
  }

  // Invalidate any older unconsumed OTPs of the same purpose (prevent reuse)
  await OtpModel.deleteMany({ phone, purpose, consumed: false });

  const code = generateOtpCode();
  const codeHash = await hashOtp(code);
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRES_MINUTES * 60 * 1000);

  await OtpModel.create({
    phone,
    codeHash,
    purpose,
    expiresAt,
    userId,
    attempts: 0,
    consumed: false,
  });

  const body = `Your LL Exam Portal ${purpose.replace("_", " ")} OTP is ${code}. It expires in ${env.OTP_EXPIRES_MINUTES} minutes. Do not share this code with anyone.`;
  const smsResult = await sendSms(phone, body, code);

  return {
    message: `OTP sent successfully to ${phone}`,
    expiresInMinutes: env.OTP_EXPIRES_MINUTES,
    // Only expose the code in mock mode so devs / tests can complete the flow
    mockedCode: smsResult.provider === "mock" ? code : undefined,
  };
}

/**
 * Verify an OTP.
 *  - Checks not-expired, not-consumed, not-over attempts.
 *  - On success, DELETES the OTP document (requirement: delete after successful verification).
 *  - On wrong code, increments attempts.
 */
export async function verifyOtpCode(
  phone: string,
  code: string,
  purpose: OtpPurpose,
): Promise<{ userId?: string }> {
  const otp = await OtpModel.findOne({
    phone,
    purpose,
    consumed: false,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!otp) {
    throw ApiError.badRequest("OTP is invalid or has expired. Please request a new one.");
  }

  if (otp.attempts >= MAX_ATTEMPTS) {
    await OtpModel.deleteOne({ _id: otp._id });
    throw ApiError.tooMany("Too many incorrect attempts. Please request a new OTP.");
  }

  const isMatch = await verifyOtp(code, otp.codeHash);
  if (!isMatch) {
    otp.attempts += 1;
    await otp.save();
    throw ApiError.badRequest(
      `Incorrect OTP. You have ${MAX_ATTEMPTS - otp.attempts} attempts remaining.`,
    );
  }

  const userId = otp.userId;

  // Delete the OTP on successful verification (requirement: no reuse, delete after use)
  await OtpModel.deleteOne({ _id: otp._id });

  // Also clean up any other unconsumed OTPs of the same purpose for this phone
  await OtpModel.deleteMany({ phone, purpose, consumed: false });

  return { userId };
}
