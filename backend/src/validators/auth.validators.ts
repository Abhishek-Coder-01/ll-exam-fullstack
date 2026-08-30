import { z } from "zod";

export const phoneSchema = z
  .string()
  .trim()
  .min(8, "Phone number is too short")
  .max(20, "Phone number is too long")
  .regex(/^\+?[\d\s-]+$/, "Phone number must contain only digits, spaces, or hyphens");

const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

export const registerClientSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: phoneSchema,
  password: passwordSchema,
  licenseType: z.string().trim().default("Learner's License"),
});

export const registerStaffSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().toLowerCase().email(),
  phone: phoneSchema,
  password: passwordSchema,
  department: z.enum(["Licensing", "Verification", "Payments"]).default("Licensing"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
  role: z.enum(["admin", "staff", "team_leader", "client"]).optional(),
});

export const requestOtpSchema = z.object({
  phone: phoneSchema,
  purpose: z.enum(["register", "login", "reset_password", "phone_change"]).default("register"),
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: z.string().length(6, "OTP must be exactly 6 digits").regex(/^\d+$/, "OTP must be numeric"),
  purpose: z.enum(["register", "login", "reset_password", "phone_change"]).default("register"),
});

export const refreshSchema = z.object({
  refreshToken: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  phone: phoneSchema,
});

export const resetPasswordSchema = z.object({
  phone: phoneSchema,
  code: z.string().length(6).regex(/^\d+$/),
  newPassword: passwordSchema,
});
