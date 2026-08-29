"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@/types";
import {
  authService,
  clearTokens,
  getStoredUser,
  getAccessToken,
  setStoredUser,
} from "@/services";
import type { AuthUser } from "@/services/auth.service";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  requireRole,
}: {
  children: ReactNode;
  /**
   * If set, the layout will redirect to /login when the current user
   * doesn't match the given role.
   */
  requireRole?: Role;
}) {
  const router = useRouter();
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  // Guard: ensure /auth/me is called only once on mount, not on every re-render
  const initialized = useRef(false);
  // Guard: prevent concurrent refresh() calls from running simultaneously
  const refreshInProgress = useRef(false);

  const setUser = useCallback((u: AuthUser | null) => {
    setUserState(u);
    if (u) setStoredUser(u);
  }, []);

  const refresh = useCallback(async () => {
    // Prevent multiple simultaneous refresh calls
    if (refreshInProgress.current) return;
    refreshInProgress.current = true;
    setLoading(true);
    try {
      const token = getAccessToken();
      if (!token) {
        setUserState(null);
        return;
      }
      const me = await authService.fetchMe();
      setUserState(me);
    } catch {
      setUserState(null);
    } finally {
      setLoading(false);
      refreshInProgress.current = false;
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUserState(null);
    router.replace("/login");
  }, [router]);

  // Hydrate from localStorage synchronously, then verify with /auth/me
  // initialized ref ensures this runs only ONCE per mount — prevents too-many-requests
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const cached = getStoredUser<AuthUser>();
    if (cached) setUserState(cached);
    void refresh();
  }, [refresh]);

  // Role-based route protection
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (requireRole && user.role !== requireRole) {
      // Wrong role — kick to their own dashboard
      const target =
        user.role === "admin"
          ? "/admin/dashboard"
          : user.role === "staff"
            ? "/staff/dashboard"
            : "/client/dashboard";
      router.replace(target);
    }
  }, [user, loading, requireRole, router]);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Utility to force logout from anywhere (e.g. on token expiry). */
export function forceLogout(): void {
  clearTokens();
  if (typeof window !== "undefined") window.location.href = "/login";
}
