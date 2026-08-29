import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

interface EnvConfig {
  NODE_ENV: "development" | "production" | "test";
  PORT: number;
  API_PREFIX: string;
  CLIENT_URL: string;

  MONGO_URI: string;

  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;

  OTP_LENGTH: number;
  OTP_EXPIRES_MINUTES: number;
  OTP_RESEND_COOLDOWN_SECONDS: number;
  OTP_MOCK_MODE: boolean;

  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_FROM_NUMBER: string;

  UPLOAD_DIR: string;
  MAX_UPLOAD_MB: number;

  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX: number;

  BCRYPT_SALT_ROUNDS: number;

  PAYMENT_PROVIDER: string;
  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;

  BOOTSTRAP_ADMIN_EMAIL: string;
  BOOTSTRAP_ADMIN_PASSWORD: string;
  BOOTSTRAP_ADMIN_NAME: string;
  BOOTSTRAP_ADMIN_PHONE: string;
}

const requiredKeys: Array<keyof EnvConfig> = [
  "MONGO_URI",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
];

function getEnv(key: string, fallback?: string): string {
  const value = process.env[key];
  if (value === undefined || value === "") {
    if (fallback !== undefined) return fallback;
    return "";
  }
  return value;
}

function getEnvNumber(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getEnvBool(key: string, fallback: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return fallback;
  return raw.toLowerCase() === "true" || raw === "1";
}

export const env: EnvConfig = {
  NODE_ENV: (getEnv("NODE_ENV", "development") as EnvConfig["NODE_ENV"]),
  PORT: getEnvNumber("PORT", 5000),
  API_PREFIX: getEnv("API_PREFIX", "/api/v1"),
  CLIENT_URL: getEnv("CLIENT_URL", "http://localhost:3000"),

  MONGO_URI: getEnv("MONGO_URI", "mongodb://localhost:27017/ll_exam_portal"),

  JWT_ACCESS_SECRET: getEnv("JWT_ACCESS_SECRET", "dev_access_secret_change_me"),
  JWT_REFRESH_SECRET: getEnv("JWT_REFRESH_SECRET", "dev_refresh_secret_change_me"),
  JWT_ACCESS_EXPIRES_IN: getEnv("JWT_ACCESS_EXPIRES_IN", "15m"),
  JWT_REFRESH_EXPIRES_IN: getEnv("JWT_REFRESH_EXPIRES_IN", "7d"),

  OTP_LENGTH: getEnvNumber("OTP_LENGTH", 6),
  OTP_EXPIRES_MINUTES: getEnvNumber("OTP_EXPIRES_MINUTES", 10),
  OTP_RESEND_COOLDOWN_SECONDS: getEnvNumber("OTP_RESEND_COOLDOWN_SECONDS", 60),
  // Default: real Twilio SMS. Only enabled if OTP_MOCK_MODE=true is set in env.
  OTP_MOCK_MODE: getEnvBool("OTP_MOCK_MODE", false),

  TWILIO_ACCOUNT_SID: getEnv("TWILIO_ACCOUNT_SID", ""),
  TWILIO_AUTH_TOKEN: getEnv("TWILIO_AUTH_TOKEN", ""),
  TWILIO_FROM_NUMBER: getEnv("TWILIO_FROM_NUMBER", ""),

  UPLOAD_DIR: getEnv("UPLOAD_DIR", "uploads"),
  MAX_UPLOAD_MB: getEnvNumber("MAX_UPLOAD_MB", 10),

  RATE_LIMIT_WINDOW_MS: getEnvNumber("RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
  RATE_LIMIT_MAX: getEnvNumber("RATE_LIMIT_MAX", 200),

  BCRYPT_SALT_ROUNDS: getEnvNumber("BCRYPT_SALT_ROUNDS", 10),

  PAYMENT_PROVIDER: getEnv("PAYMENT_PROVIDER", "stub"),
  RAZORPAY_KEY_ID: getEnv("RAZORPAY_KEY_ID", ""),
  RAZORPAY_KEY_SECRET: getEnv("RAZORPAY_KEY_SECRET", ""),

  BOOTSTRAP_ADMIN_EMAIL: getEnv("BOOTSTRAP_ADMIN_EMAIL", "admin@llportal.gov.in"),
  BOOTSTRAP_ADMIN_PASSWORD: getEnv("BOOTSTRAP_ADMIN_PASSWORD", "Admin@12345"),
  BOOTSTRAP_ADMIN_NAME: getEnv("BOOTSTRAP_ADMIN_NAME", "Portal Admin"),
  BOOTSTRAP_ADMIN_PHONE: getEnv("BOOTSTRAP_ADMIN_PHONE", "+919820000000"),
};

// Validate required in production
if (env.NODE_ENV === "production") {
  const missing = requiredKeys.filter((k) => !process.env[k as string]);
  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error(`❌ Missing required env variables in production: ${missing.join(", ")}`);
    process.exit(1);
  }
}
