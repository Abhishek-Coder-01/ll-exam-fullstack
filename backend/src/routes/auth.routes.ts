import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { validate } from "../middlewares/validate.middleware";
import { authenticate } from "../middlewares/auth.middleware";
import { authLimiter, otpLimiter } from "../middlewares/rateLimit.middleware";
import {
  registerClientSchema,
  registerStaffSchema,
  loginSchema,
  requestOtpSchema,
  verifyOtpSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validators/auth.validators";
import * as auth from "../controllers/auth.controller";

const router = Router();

/**
 * @openapi
 * /auth/register/client:
 *   post:
 *     tags: [Auth]
 *     summary: Register a client (triggers OTP to phone)
 */
router.post(
  "/register/client",
  authLimiter,
  validate({ body: registerClientSchema }),
  asyncHandler(auth.registerClient),
);

/**
 * @openapi
 * /auth/register/staff:
 *   post:
 *     tags: [Auth]
 *     summary: Register a staff (goes into Pending state until admin approval)
 */
router.post(
  "/register/staff",
  authLimiter,
  validate({ body: registerStaffSchema }),
  asyncHandler(auth.registerStaff),
);

/**
 * @openapi
 * /auth/otp/send:
 *   post:
 *     tags: [Auth]
 *     summary: Send an OTP to a phone number
 */
router.post("/otp/send", otpLimiter, validate({ body: requestOtpSchema }), asyncHandler(auth.sendOtp));

/**
 * @openapi
 * /auth/otp/verify:
 *   post:
 *     tags: [Auth]
 *     summary: Verify an OTP; on success returns access + refresh tokens
 */
router.post("/otp/verify", otpLimiter, validate({ body: verifyOtpSchema }), asyncHandler(auth.verifyOtp));

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email + password
 */
router.post("/login", authLimiter, validate({ body: loginSchema }), asyncHandler(auth.login));

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 */
router.post("/refresh", validate({ body: refreshSchema }), asyncHandler(auth.refresh));

router.post("/logout", asyncHandler(auth.logout));

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the current authenticated user
 */
router.get("/me", authenticate, asyncHandler(auth.me));

router.post(
  "/forgot-password",
  otpLimiter,
  validate({ body: forgotPasswordSchema }),
  asyncHandler(auth.forgotPassword),
);
router.post(
  "/reset-password",
  authLimiter,
  validate({ body: resetPasswordSchema }),
  asyncHandler(auth.resetPassword),
);

export default router;
