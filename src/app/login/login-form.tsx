"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { safeRedirectPath } from "@/lib/safe-url";

/**
 * Sign-in only — the team is invite-only. Admins create accounts from
 * /settings/users and hand out a temp password; public signup is also
 * disabled server-side in lib/auth.ts (disableSignUp), so this form
 * losing its signup mode is belt-and-suspenders, not the lock itself.
 */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Validate the redirect target — an unchecked ?next= is an open-redirect
  // / phishing vector (e.g. ?next=https://evil.com after login).
  const next = safeRedirectPath(searchParams.get("next"), "/today");
  const reason = searchParams.get("reason");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(
    reason === "suspended" ? "Your account is suspended. Ask an admin to restore access." : null,
  );
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message ?? "Something went wrong");
        return;
      }
      router.push(next as never);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm space-y-4 border border-border rounded-lg p-6">
      <h1 className="text-xl font-semibold">Sign in</h1>

      <label className="block">
        <span className="text-sm text-muted">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">Password</span>
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="text-[11px] text-muted hover:text-foreground"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <input
          type={showPassword ? "text" : "password"}
          required
          minLength={8}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {isPending ? "…" : "Sign in"}
      </button>

    </form>
  );
}
