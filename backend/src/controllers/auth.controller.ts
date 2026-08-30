import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { UserModel } from "../models/User.model";
import { PendingRegistrationModel } from "../models/PendingRegistration.model";
import { ApiError } from "../utils/ApiError";
import { ok, created } from "../utils/ApiResponse";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import { requestOtp, verifyOtpCode } from "../services/otp.service";
import { recordActivity } from "../services/activity.service";
import { pushNotification } from "../services/notification.service";
import { generateClientId, generateStaffId, generateTeamLeaderId } from "../utils/idGenerator";
import { env } from "../config/env";
import type { Role } from "../types/domain";

/* --------------------------- Helpers --------------------------- */

function issueTokens(payload: { userId: string; role: Role; email: string }) {
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  return { accessToken, refreshToken };
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  const isProd = env.NODE_ENV === "production";
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 15 * 60 * 1000,
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookies(res: Response): void {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
}

/* --------------------------- Register Client --------------------------- *
 *  Flow:
 *   1. Validate input.
 *   2. Ensure mobile / email not already registered.
 *   3. Hash password and save into PendingRegistration (NOT User).
 *   4. Send OTP to phone via Twilio.
 *   5. Return "OTP sent" — user must call /auth/otp/verify with purpose=register.
 *   6. Only on OTP success is the real User document created.
 * -------------------------------------------------------------------------*/

export async function registerClient(req: Request, res: Response): Promise<void> {
  const { name, email, phone, password, licenseType } = req.body as {
    name: string;
    email: string;
    phone: string;
    password: string;
    licenseType: string;
  };

  const existingUser = await UserModel.findOne({ $or: [{ email }, { phone }] });
  if (existingUser) {
    if (existingUser.phone === phone) throw ApiError.conflict("Mobile number already registered");
    throw ApiError.conflict("Email already registered");
  }

  // Remove any stale pending record on the same phone / email
  await PendingRegistrationModel.deleteMany({ $or: [{ phone }, { email }] });

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
  await PendingRegistrationModel.create({
    name,
    email,
    phone,
    passwordHash,
    licenseType: licenseType ?? "Learner's License",
  });

  const otpResult = await requestOtp(phone, "register");

  created(
    res,
    {
      phone,
      otp: {
        message: otpResult.message,
        expiresInMinutes: otpResult.expiresInMinutes,
        mockedCode: otpResult.mockedCode, // only present in dev / mock mode
      },
    },
    "OTP sent to your mobile number. Please verify to complete registration.",
  );
}

/* --------------------------- Register Staff --------------------------- *
 *  Staff registers → user is created immediately but with staffStatus = Pending.
 *  Login is blocked until an admin approves. Staff still needs OTP verification on login.
 * -----------------------------------------------------------------------*/

export async function registerStaff(req: Request, res: Response): Promise<void> {
  const { name, email, phone, password, department } = req.body as {
    name: string;
    email: string;
    phone: string;
    password: string;
    department: string;
  };

  const exists = await UserModel.findOne({ $or: [{ email }, { phone }] });
  if (exists) {
    if (exists.phone === phone) throw ApiError.conflict("Mobile number already registered");
    throw ApiError.conflict("Email already registered");
  }

  const businessId = generateStaffId();
  const user = await UserModel.create({
    businessId,
    name,
    email,
    phone,
    password,
    role: "staff",
    department,
    staffStatus: "Pending", // admin must approve before login
    isPhoneVerified: false, // will be verified via OTP at first login
  });

  await recordActivity({
    actorId: businessId,
    actorName: name,
    action: "requested staff account",
    target: department,
  });

  // Notify all admins so they can approve
  const admins = await UserModel.find({ role: "admin" });
  await Promise.all(
    admins.map((a) =>
      pushNotification({
        recipientId: a.businessId,
        title: "New staff registration",
        description: `${name} (${department}) is awaiting approval.`,
        type: "warning",
        link: "/admin/staff",
      }),
    ),
  );

  created(
    res,
    { user: user.toPublicJSON() },
    "Staff registration submitted. You can log in only after admin approval.",
  );
}

/* --------------------------- OTP --------------------------- */

export async function sendOtp(req: Request, res: Response): Promise<void> {
  const { phone, purpose } = req.body as {
    phone: string;
    purpose: "register" | "login" | "reset_password" | "phone_change";
  };

  if (purpose === "register") {
    // For register-resend, phone must exist in PendingRegistration
    const pending = await PendingRegistrationModel.findOne({ phone });
    if (!pending) {
      throw ApiError.notFound(
        "No pending registration for this phone number. Please register again.",
      );
    }
    const result = await requestOtp(phone, purpose);
    ok(res, result, "OTP sent");
    return;
  }

  // login / reset_password / phone_change require a real user
  const user = await UserModel.findOne({ phone });
  if (!user) throw ApiError.notFound("No account found for this phone number");

  if (purpose === "login") {
    if (
      (user.role === "staff" || user.role === "team_leader") &&
      user.staffStatus !== "Approved" &&
      user.staffStatus !== "Active"
    ) {
      throw ApiError.forbidden(
        `Your staff account status is "${user.staffStatus ?? "Pending"}". Please wait for admin approval.`,
      );
    }
  }

  const result = await requestOtp(phone, purpose, user.businessId);
  ok(res, result, "OTP sent");
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const { phone, code, purpose } = req.body as {
    phone: string;
    code: string;
    purpose: "register" | "login" | "reset_password" | "phone_change";
  };

  await verifyOtpCode(phone, code, purpose);

  /* ---------- REGISTER: create the real user now ---------- */
  if (purpose === "register") {
    const pending = await PendingRegistrationModel.findOne({ phone });
    if (!pending) {
      throw ApiError.badRequest(
        "Registration data expired. Please register again.",
      );
    }

    // Double-check no user was created in the meantime.
    const duplicate = await UserModel.findOne({
      $or: [{ email: pending.email }, { phone: pending.phone }],
    });
    if (duplicate) {
      await PendingRegistrationModel.deleteOne({ _id: pending._id });
      throw ApiError.conflict("Account already exists. Please log in instead.");
    }

    const businessId = generateClientId();
    // We already hashed the password when storing PendingRegistration, so we
    // insert directly (bypassing the pre-save hash hook) to avoid a double-hash.
    const inserted = await UserModel.collection.insertOne({
      businessId,
      name: pending.name,
      email: pending.email,
      phone: pending.phone,
      password: pending.passwordHash,
      role: "client",
      licenseType: pending.licenseType,
      clientStatus: "Active",
      isPhoneVerified: true,
      isEmailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const user = await UserModel.findById(inserted.insertedId);
    if (!user) throw ApiError.internal("Failed to create user account");

    // Clean up the pending record
    await PendingRegistrationModel.deleteOne({ _id: pending._id });

    await recordActivity({
      actorId: businessId,
      actorName: pending.name,
      action: "registered & verified phone (OTP)",
      target: "client account",
    });
    await pushNotification({
      recipientId: businessId,
      title: "Welcome aboard!",
      description: "Your account has been activated. You can now log in.",
      type: "success",
      link: "/login",
    });

    ok(
      res,
      { user: user.toPublicJSON() },
      "Registration successful. Please log in with your credentials.",
    );
    return;
  }

  /* ---------- LOGIN / RESET / PHONE_CHANGE: user must exist ---------- */
  const user = await UserModel.findOne({ phone });
  if (!user) throw ApiError.notFound("User not found for this phone number");

  if (purpose === "login") {
    // Extra guard — staff must be approved
    if (
      (user.role === "staff" || user.role === "team_leader") &&
      user.staffStatus !== "Approved" &&
      user.staffStatus !== "Active"
    ) {
      throw ApiError.forbidden(
        `Your staff account status is "${user.staffStatus ?? "Pending"}". Please wait for admin approval.`,
      );
    }
    user.isPhoneVerified = true;
    const payload = { userId: user.businessId, role: user.role, email: user.email };
    const { accessToken, refreshToken } = issueTokens(payload);
    user.refreshTokenHash = await bcrypt.hash(refreshToken, env.BCRYPT_SALT_ROUNDS);
    await user.save();
    setAuthCookies(res, accessToken, refreshToken);

    await recordActivity({
      actorId: user.businessId,
      actorName: user.name,
      action: "logged in (OTP verified)",
      target: user.role,
    });

    ok(
      res,
      { user: user.toPublicJSON(), accessToken, refreshToken },
      "Login successful",
    );
    return;
  }

  // reset_password / phone_change — just acknowledge; the reset endpoint completes the flow
  ok(res, { user: user.toPublicJSON() }, "OTP verified");
}

/* --------------------------- Login (Step 1: credentials → OTP) --------------------------- *
 *  All roles (admin / staff / client) must complete OTP verification.
 *  This endpoint validates credentials only and triggers a login OTP.
 * -----------------------------------------------------------------------------------------*/

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password, role } = req.body as {
    email: string;
    password: string;
    role?: Role;
  };

  const user = await UserModel.findOne({ email }).select("+password +refreshTokenHash");
  if (!user) throw ApiError.unauthorized("Invalid email or password");

  const match = await user.comparePassword(password);
  if (!match) throw ApiError.unauthorized("Invalid email or password");

  if (role && user.role !== role) {
    throw ApiError.forbidden(`This account is not registered as ${role}`);
  }

  // Staff must be approved before login is permitted
  if (
    (user.role === "staff" || user.role === "team_leader") &&
    user.staffStatus !== "Approved" &&
    user.staffStatus !== "Active"
  ) {
    throw ApiError.forbidden(
      `Your staff account is "${user.staffStatus ?? "Pending"}". Please wait for admin approval.`,
    );
  }

  // Client account activation
  if (user.role === "client" && user.clientStatus === "Inactive") {
    throw ApiError.forbidden("Your account has been deactivated. Please contact support.");
  }

  // Send OTP for step-2 verification (all roles, including admin)
  const otpResult = await requestOtp(user.phone, "login", user.businessId);

  ok(
    res,
    {
      phone: user.phone,
      role: user.role,
      otp: {
        message: otpResult.message,
        expiresInMinutes: otpResult.expiresInMinutes,
        mockedCode: otpResult.mockedCode,
      },
    },
    "Credentials verified. OTP sent to your registered mobile number.",
  );
}

/* --------------------------- Refresh / Logout / Me --------------------------- */

export async function refresh(req: Request, res: Response): Promise<void> {
  const bodyToken = (req.body as { refreshToken?: string })?.refreshToken;
  const cookieToken =
    typeof req.cookies?.refreshToken === "string" ? req.cookies.refreshToken : undefined;
  const token = bodyToken ?? cookieToken;
  if (!token) throw ApiError.unauthorized("Missing refresh token");

  const decoded = verifyRefreshToken(token);
  const user = await UserModel.findOne({ businessId: decoded.userId }).select("+refreshTokenHash");
  if (!user || !user.refreshTokenHash) throw ApiError.unauthorized("Session revoked");

  const isValid = await bcrypt.compare(token, user.refreshTokenHash);
  if (!isValid) throw ApiError.unauthorized("Session revoked");

  const payload = { userId: user.businessId, role: user.role, email: user.email };
  const { accessToken, refreshToken } = issueTokens(payload);
  user.refreshTokenHash = await bcrypt.hash(refreshToken, env.BCRYPT_SALT_ROUNDS);
  await user.save();
  setAuthCookies(res, accessToken, refreshToken);

  ok(res, { accessToken, refreshToken }, "Token refreshed");
}

export async function logout(req: Request, res: Response): Promise<void> {
  if (req.user) {
    const user = await UserModel.findOne({ businessId: req.user.userId }).select("+refreshTokenHash");
    if (user) {
      user.refreshTokenHash = undefined;
      await user.save();
    }
  }
  clearAuthCookies(res);
  ok(res, null, "Logged out");
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) throw ApiError.unauthorized();
  const user = await UserModel.findOne({ businessId: req.user.userId });
  if (!user) throw ApiError.notFound("User not found");
  ok(res, user.toPublicJSON());
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { phone } = req.body as { phone: string };
  const user = await UserModel.findOne({ phone });
  if (!user) {
    // Uniform response to avoid user enumeration
    ok(res, { message: "If the phone is registered, an OTP has been sent." });
    return;
  }
  const result = await requestOtp(phone, "reset_password", user.businessId);
  ok(res, result, "Password reset OTP sent");
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { phone, code, newPassword } = req.body as {
    phone: string;
    code: string;
    newPassword: string;
  };
  await verifyOtpCode(phone, code, "reset_password");
  const user = await UserModel.findOne({ phone }).select("+password");
  if (!user) throw ApiError.notFound("User not found");
  user.password = newPassword; // pre-save hook will hash it
  user.refreshTokenHash = undefined; // invalidate existing sessions
  await user.save();
  ok(res, null, "Password reset successful. Please log in.");
}
