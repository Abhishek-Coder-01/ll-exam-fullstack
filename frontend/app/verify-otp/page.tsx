"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  Loader2, 
  AlertCircle, 
  ArrowLeft,
  CheckCircle2,
  Smartphone,
  RefreshCw,
  Timer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { authService, ApiError } from "@/services";
import type { Role } from "@/types";
import { cn } from "@/lib/utils";

interface PendingContext {
  phone: string;
  purpose: "register" | "login";
  role?: Role;
  email?: string;
  mockedCode?: string;
}

function readContext(): PendingContext | null {
  if (typeof window === "undefined") return null;
  const loginRaw = window.sessionStorage.getItem("ll_pending_login");
  if (loginRaw) {
    try {
      return JSON.parse(loginRaw) as PendingContext;
    } catch {}
  }
  const regRaw = window.sessionStorage.getItem("ll_pending_registration");
  if (regRaw) {
    try {
      return JSON.parse(regRaw) as PendingContext;
    } catch {}
  }
  return null;
}

function clearContext() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem("ll_pending_login");
  window.sessionStorage.removeItem("ll_pending_registration");
}

export default function VerifyOtpPage() {
  const router = useRouter();
  const [values, setValues] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [ctx, setCtx] = useState<PendingContext | null>(null);
  const [verified, setVerified] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  // Prevents re-triggering auto-verify for a code that was already attempted
  // (e.g. after a failed verification, so it doesn't loop on the same digits)
  const lastAttemptedCode = useRef<string | null>(null);

  useEffect(() => {
    const c = readContext();
    if (!c) {
      router.replace("/login");
      return;
    }
    setCtx(c);
    if (c.mockedCode) {
      setInfo(`Development mode: your OTP is ${c.mockedCode}`);
    }
  }, [router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleVerify = useCallback(async () => {
    if (!ctx) return;
    const code = values.join("");
    if (code.length !== 6) {
      setError("Enter the full 6-digit code");
      return;
    }
    lastAttemptedCode.current = code;
    setError(null);
    setLoading(true);
    try {
      const { data } = await authService.verifyOtp(ctx.phone, code, ctx.purpose);
      clearContext();
      if (ctx.purpose === "register") {
        setVerified(true);
        setTimeout(() => {
          router.push("/login");
        }, 1500);
        return;
      }
      setVerified(true);
      const role = data.user.role;
      const target =
        role === "admin"
          ? "/admin/dashboard"
          : role === "staff"
            ? "/staff/dashboard"
            : role === "team_leader"
              ? "/team-leader/dashboard"
              : "/client/dashboard";
      setTimeout(() => {
        router.push(target);
      }, 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "OTP verification failed");
    } finally {
      setLoading(false);
    }
  }, [ctx, values, router]);

  // Auto-verify once all 6 digits are entered (typed or pasted)
  useEffect(() => {
    const code = values.join("");
    if (
      code.length === 6 &&
      !loading &&
      !verified &&
      lastAttemptedCode.current !== code
    ) {
      handleVerify();
    }
  }, [values, loading, verified, handleVerify]);

  const handleChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...values];
    next[index] = val.slice(-1);
    setValues(next);
    if (val && index < 5) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !values[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) {
      e.preventDefault();
      setValues(text.split(""));
      inputsRef.current[5]?.focus();
    }
  };

  const handleResend = async () => {
    if (!ctx || resending || cooldown > 0) return;
    setError(null);
    setInfo(null);
    setResending(true);
    try {
      const res = await authService.sendOtp(ctx.phone, ctx.purpose);
      setCooldown(60);
      // Allow auto-verify to retry if the user re-enters the same code after resend
      lastAttemptedCode.current = null;
      if (res.mockedCode) {
        setInfo(`Development mode: your OTP is ${res.mockedCode}`);
      } else {
        setInfo("A new OTP has been sent to your mobile number.");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  const maskedPhone = ctx?.phone 
    ? ctx.phone.replace(/(\+\d{2})(\d{4})(\d{2})/, "$1 $2 *** $3")
    : "";

  if (verified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary-50 to-background px-4 py-10">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center py-12 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-10 w-10 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              {ctx?.purpose === "register" ? "Registration Complete!" : "Verified Successfully!"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {ctx?.purpose === "register" 
                ? "Your account has been created. Redirecting to login..." 
                : "You'll be redirected to your dashboard shortly."}
            </p>
            <div className="mt-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary-50 to-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-700 shadow-card">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Verify your account</h1>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            {ctx?.phone
              ? `Enter the 6-digit OTP sent to ${maskedPhone}.`
              : "Enter the 6-digit OTP sent to your registered mobile number."}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
          {ctx?.phone && (
            <div className="mb-6 flex items-center justify-center gap-2 rounded-lg bg-primary/5 border border-primary/10 px-4 py-3">
              <Smartphone className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground/80">
                {maskedPhone}
              </span>
            </div>
          )}

          <div className="flex justify-center gap-2 mb-4">
            {values.map((val, i) => (
              <div key={i} className="relative">
                <input
                  ref={(el) => {
                    inputsRef.current[i] = el;
                  }}
                  value={val}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={handlePaste}
                  inputMode="numeric"
                  maxLength={1}
                  disabled={loading}
                  className={cn(
                    "h-14 w-12 rounded-lg border text-center text-lg font-semibold",
                    "border-input shadow-sm focus:outline-none focus:ring-2 focus:ring-ring",
                    "disabled:opacity-60",
                    error && "border-destructive"
                  )}
                  aria-label={`Digit ${i + 1}`}
                />
                {i === 2 && (
                  <div className="absolute -right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-lg select-none">
                    -
                  </div>
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {info && !error && (
            <div className="mt-4 rounded-md bg-primary/10 px-3 py-2 text-xs text-primary-700">
              {info}
            </div>
          )}

          <Button 
            className="mt-6 w-full"
            onClick={handleVerify} 
            disabled={loading}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {ctx?.purpose === "register" ? "Verify & complete registration" : "Verify & sign in"}
          </Button>

          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Didn&apos;t receive the code?{" "}
              <button
                type="button"
                className="font-medium text-primary hover:underline disabled:opacity-50"
                onClick={handleResend}
                disabled={resending || cooldown > 0}
              >
                {cooldown > 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <Timer className="h-3.5 w-3.5" />
                    Resend in {cooldown}s
                  </span>
                ) : resending ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Sending...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Resend OTP
                  </span>
                )}
              </button>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link 
            href={ctx?.purpose === "register" ? "/register" : "/login"} 
            className="inline-flex items-center gap-1 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {ctx?.purpose === "register" ? "registration" : "login"}
          </Link>
        </p>
      </div>
    </div>
  );
}