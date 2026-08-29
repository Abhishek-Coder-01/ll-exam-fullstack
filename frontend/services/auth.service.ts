import { api, clearTokens, setStoredUser, setTokens } from "./api";
import type { Role, User } from "@/types";

export interface AuthUser extends User {
  businessId: string;
  role: Role;
  staffStatus?: string;
  clientStatus?: string;
  department?: string;
  licenseType?: string;
  assignedStaffId?: string;
  isPhoneVerified: boolean;
}

export interface LoginStep1Response {
  phone: string;
  role: Role;
  otp: {
    message: string;
    expiresInMinutes: number;
    /** Only present in local/dev when OTP_MOCK_MODE=true on the backend. */
    mockedCode?: string;
  };
}

export interface OtpSendResponse {
  message: string;
  expiresInMinutes: number;
  mockedCode?: string;
}

export interface VerifyOtpResponse {
  user: AuthUser;
  accessToken?: string;
  refreshToken?: string;
}

/* ------------------ Registration ------------------ */

export interface RegisterClientPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  licenseType?: string;
}

export interface RegisterClientResponse {
  phone: string;
  otp: {
    message: string;
    expiresInMinutes: number;
    mockedCode?: string;
  };
}

export async function registerClient(payload: RegisterClientPayload) {
  const { data } = await api.post<RegisterClientResponse>(
    "/auth/register/client",
    payload,
    { skipAuth: true },
  );
  return data;
}

export interface RegisterStaffPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  department: "Licensing" | "Verification" | "Payments";
}

export async function registerStaff(payload: RegisterStaffPayload) {
  const { data } = await api.post<{ user: AuthUser }>(
    "/auth/register/staff",
    payload,
    { skipAuth: true },
  );
  return data;
}

/* ------------------ Login (2-step) ------------------ */

export interface LoginPayload {
  email: string;
  password: string;
  role?: Role;
}

export async function login(payload: LoginPayload) {
  const { data } = await api.post<LoginStep1Response>("/auth/login", payload, { skipAuth: true });
  return data;
}

/* ------------------ OTP ------------------ */

export async function sendOtp(phone: string, purpose: "register" | "login" | "reset_password") {
  const { data } = await api.post<OtpSendResponse>(
    "/auth/otp/send",
    { phone, purpose },
    { skipAuth: true },
  );
  return data;
}

export async function verifyOtp(
  phone: string,
  code: string,
  purpose: "register" | "login" | "reset_password",
) {
  const { data, message } = await api.post<VerifyOtpResponse>(
    "/auth/otp/verify",
    { phone, code, purpose },
    { skipAuth: true },
  );

  // If tokens are returned (login OTP), persist them + user for the session
  if (data.accessToken && data.refreshToken) {
    setTokens(data.accessToken, data.refreshToken);
    setStoredUser(data.user);
  }
  return { data, message };
}

/* ------------------ Session ------------------ */

export async function fetchMe() {
  const { data } = await api.get<AuthUser>("/auth/me");
  setStoredUser(data);
  return data;
}

export async function logout() {
  try {
    await api.post("/auth/logout");
  } catch {
    // ignore — we clear locally regardless
  } finally {
    clearTokens();
  }
}

export async function forgotPassword(phone: string) {
  const { data } = await api.post<{ message: string }>(
    "/auth/forgot-password",
    { phone },
    { skipAuth: true },
  );
  return data;
}

export async function resetPassword(phone: string, code: string, newPassword: string) {
  const { message } = await api.post<null>(
    "/auth/reset-password",
    { phone, code, newPassword },
    { skipAuth: true },
  );
  return message;
}
