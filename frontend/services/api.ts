/**
 * Central API client.
 *
 * - Reads NEXT_PUBLIC_API_URL from env (default: http://localhost:5000/api/v1).
 * - Attaches Bearer access token from localStorage on every request.
 * - On 401: tries to refresh the access token using the stored refresh token,
 *   then retries the original request once.
 * - On refresh failure: clears tokens and redirects to /login (auto logout).
 * - Every method throws an `ApiError` with a human-readable message.
 *
 * Consumed by domain-specific service modules under `services/*.ts`.
 */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

// ---------------- Types ----------------
export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
}
export interface ApiFailure {
  success: false;
  message: string;
  details?: unknown;
}
export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// ---------------- Token storage ----------------
const ACCESS_KEY = "ll_access_token";
const REFRESH_KEY = "ll_refresh_token";
const USER_KEY = "ll_current_user";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_KEY);
}
export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_KEY);
}
export function setTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_KEY, accessToken);
  window.localStorage.setItem(REFRESH_KEY, refreshToken);
}
export function clearTokens(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export function getStoredUser<T = unknown>(): T | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
export function setStoredUser(user: unknown): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// ---------------- Refresh coordination ----------------
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ refreshToken }),
    });
    const json = (await res.json()) as ApiEnvelope<{ accessToken: string; refreshToken: string }>;
    if (!res.ok || !json.success) return null;
    setTokens(json.data.accessToken, json.data.refreshToken);
    return json.data.accessToken;
  } catch {
    return null;
  }
}

function forceLogout(): void {
  clearTokens();
  if (typeof window !== "undefined") {
    // Avoid infinite redirect loops on the login/register/otp screens
    const p = window.location.pathname;
    if (!p.startsWith("/login") && !p.startsWith("/register") && !p.startsWith("/verify-otp")) {
      window.location.href = "/login";
    }
  }
}

// ---------------- Core request ----------------
interface RequestOptions extends RequestInit {
  /** Skip the automatic Authorization header and 401 refresh flow. */
  skipAuth?: boolean;
  /** If the response body is a FormData upload, don't set Content-Type. */
  isFormData?: boolean;
  /** Query-string params appended to the URL. */
  query?: Record<string, string | number | boolean | undefined | null>;
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
  isRetry = false,
): Promise<{ data: T; message: string; meta?: Record<string, unknown> }> {
  const { skipAuth, isFormData, query, headers, ...rest } = options;

  let url = `${API_URL}${path}`;
  if (query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
    });
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const finalHeaders: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(headers as Record<string, string> | undefined),
  };
  if (!skipAuth) {
    const token = getAccessToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: finalHeaders,
      credentials: "include",
    });
  } catch (err) {
    throw new ApiError(
      err instanceof Error ? err.message : "Network error — is the API server running?",
      0,
    );
  }

  // 401 handling with single-flight refresh
  if (res.status === 401 && !skipAuth && !isRetry) {
    if (!refreshInFlight) refreshInFlight = refreshAccessToken();
    const newToken = await refreshInFlight;
    refreshInFlight = null;
    if (newToken) {
      return request<T>(path, options, true);
    }
    forceLogout();
    throw new ApiError("Session expired. Please log in again.", 401);
  }

  let json: ApiEnvelope<T> | null = null;
  try {
    json = (await res.json()) as ApiEnvelope<T>;
  } catch {
    // Non-JSON response (e.g. file download); the caller must handle it differently
  }

  if (!res.ok) {
    const message = (json && "message" in json && json.message) || `Request failed (${res.status})`;
    throw new ApiError(message, res.status, json && "details" in json ? json.details : undefined);
  }

  if (!json || json.success !== true) {
    throw new ApiError(json?.message ?? "Unexpected response", res.status);
  }

  return { data: json.data, message: json.message, meta: json.meta };
}

// ---------------- Convenience verbs ----------------
export const api = {
  get: <T>(path: string, options: Omit<RequestOptions, "method" | "body"> = {}) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options: Omit<RequestOptions, "method" | "body"> = {}) =>
    request<T>(path, {
      ...options,
      method: "POST",
      body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
      isFormData: body instanceof FormData,
    }),
  patch: <T>(path: string, body?: unknown, options: Omit<RequestOptions, "method" | "body"> = {}) =>
    request<T>(path, {
      ...options,
      method: "PATCH",
      body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
      isFormData: body instanceof FormData,
    }),
  put: <T>(path: string, body?: unknown, options: Omit<RequestOptions, "method" | "body"> = {}) =>
    request<T>(path, {
      ...options,
      method: "PUT",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  delete: <T>(path: string, body?: unknown, options: Omit<RequestOptions, "method" | "body"> = {}) =>
    request<T>(path, {
      ...options,
      method: "DELETE",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
};

/**
 * Fetch a protected file (e.g. document download) as a Blob using the stored token.
 * Returns null on failure.
 */
export async function fetchBlob(path: string): Promise<{ blob: Blob; filename?: string } | null> {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });
  if (!res.ok) return null;
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const m = /filename\*?=(?:UTF-8''|)"?([^";]+)"?/i.exec(disposition);
  const filename = m ? decodeURIComponent(m[1]) : undefined;
  const blob = await res.blob();
  return { blob, filename };
}