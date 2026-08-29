import rateLimit from "express-rate-limit";
import { env } from "../config/env";

// Skip rate limiting for OPTIONS preflight requests (browser CORS preflight)
const skipOptions = (req: import("express").Request) => req.method === "OPTIONS";

/**
 * Global rate limiter — applied to ALL routes.
 * Default: 500 requests per 15 minutes per IP.
 * Override with RATE_LIMIT_WINDOW_MS and RATE_LIMIT_MAX env vars.
 */
export const globalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipOptions,
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
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipOptions,
  message: { success: false, message: "Too many auth attempts, please try again later." },
});

/**
 * OTP limiter — strict, applied to OTP send/verify routes.
 * Default: 10 requests per 10 minutes per IP.
 */
export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipOptions,
  message: { success: false, message: "Too many OTP requests, please wait." },
});
