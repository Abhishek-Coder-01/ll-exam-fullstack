import { env } from "../config/env";
import { logger } from "../utils/logger";
import { ApiError } from "../utils/ApiError";
import type { Twilio } from "twilio";

let twilioClient: Twilio | null = null;

async function getClient(): Promise<Twilio | null> {
  if (env.OTP_MOCK_MODE) return null;
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM_NUMBER) {
    return null;
  }
  if (twilioClient) return twilioClient;
  const twilioModule = await import("twilio");
  const factory = (twilioModule.default ?? twilioModule) as unknown as (
    sid: string,
    token: string,
  ) => Twilio;
  twilioClient = factory(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  return twilioClient;
}

export interface SmsResult {
  provider: "twilio" | "mock";
  sid?: string;
  mockedCode?: string;
}

/**
 * Send an SMS.
 * - If OTP_MOCK_MODE=true → log the message and return the OTP so devs can complete the flow.
 * - Else → attempt to send via Twilio using TWILIO_* env variables.
 * - If Twilio creds are missing while OTP_MOCK_MODE=false → 500 with a clear message.
 */
export async function sendSms(to: string, body: string, mockedCode?: string): Promise<SmsResult> {
  const client = await getClient();

  if (env.OTP_MOCK_MODE) {
    logger.info(`📱 [MOCK SMS] to=${to} :: ${body}`);
    return { provider: "mock", mockedCode };
  }

  if (!client) {
    throw ApiError.internal(
      "SMS provider is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER, or set OTP_MOCK_MODE=true for development.",
    );
  }

  try {
    const msg = await client.messages.create({
      to,
      from: env.TWILIO_FROM_NUMBER,
      body,
    });
    logger.info(`📤 SMS sent (Twilio) sid=${msg.sid} to=${to}`);
    return { provider: "twilio", sid: msg.sid };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`❌ Twilio SMS failed to=${to} :: ${message}`);
    throw ApiError.internal(`Failed to send SMS: ${message}`);
  }
}
