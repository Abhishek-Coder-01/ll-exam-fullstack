import rateLimit from "express-rate-limit";
import type { Request } from "express";
import { env } from "../config/env";

// Skip rate limiting for OPTIONS preflight requests (browser CORS preflight)
const skipOptions = (req: Request) => req.method === "OPTIONS";

const normalizeIpAddress = (value?: string): string => {
  if (!value) return "unknown";

  const firstValue = value.split(",")[0].trim();
  if (!firstValue) return "unknown";

  return firstValue.replace(/^::ffff:/, "");
};

export const getClientRateLimitKey = (req: Request): string => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string") return normalizeIpAddress(forwardedFor);
  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) return normalizeIpAddress(forwardedFor[0]);

  return normalizeIpAddress(req.ip ?? req.socket.remoteAddress ?? "unknown");
};

const defaultRateLimitConfig = {
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipOptions,
  keyGenerator: getClientRateLimitKey,
};

/**
 * Global rate limiter — applied to ALL routes.
 * Default: 500 requests per 15 minutes per IP.
 * Override with RATE_LIMIT_WINDOW_MS and RATE_LIMIT_MAX env vars.
 */
export const globalLimiter = rateLimit({
  ...defaultRateLimitConfig,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});

/**
 * Auth limiter — applied to login / register routes.
 * Default: 100 requests per 15 minutes per IP.
 * This is intentionally higher than OTP to avoid locking out dashboard /auth/me polling.
 */
export const authLimiter = rateLimit({
  ...defaultRateLimitConfig,
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: "Too many auth attempts, please try again later." },
});

/**
 * OTP limiter — strict, applied to OTP send/verify routes.
 * Default: 10 requests per 10 minutes per IP.
 */
export const otpLimiter = rateLimit({
  ...defaultRateLimitConfig,
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many OTP requests, please wait." },
});
