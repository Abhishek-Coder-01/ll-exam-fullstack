import Link from "next/link";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-primary-50 to-background px-4 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-700 shadow-card">
        <ShieldCheck className="h-8 w-8 text-white" />
      </div>
      <h1 className="text-2xl font-semibold text-foreground">LL Exam Portal</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Licensing &amp; Learner Exam Management Dashboard — Admin, Staff and Client workspaces.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/login">
            Sign in <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/register">Register as Staff / Client</Link>
        </Button>
      </div>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
        <span>Quick preview:</span>
        <Link href="/admin/dashboard" className="rounded-full border border-border px-3 py-1 hover:bg-secondary">
          Admin Dashboard
        </Link>
        <Link href="/staff/dashboard" className="rounded-full border border-border px-3 py-1 hover:bg-secondary">
          Staff Dashboard
        </Link>
        <Link href="/client/dashboard" className="rounded-full border border-border px-3 py-1 hover:bg-secondary">
          Client Dashboard
        </Link>
      </div>
    </div>
  );
}
