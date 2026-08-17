"use client";

/**
 * Self-serve password change via better-auth's changePassword.
 * revokeOtherSessions kicks any device still holding the old password.
 */
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

const MIN_LENGTH = 8;

export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < MIN_LENGTH) {
      toast.error(`New password must be at least ${MIN_LENGTH} characters`);
      return;
    }
    if (next !== confirm) {
      toast.error("New passwords don't match");
      return;
    }
    setBusy(true);
    const { error } = await authClient.changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: true,
    });
    setBusy(false);
    if (error) {
      toast.error("Couldn't change password", {
        description: error.message ?? "Check your current password and try again.",
      });
      return;
    }
    toast.success("Password changed", { description: "Use the new one next time you sign in." });
    setCurrent(""); setNext(""); setConfirm("");
  }

  const inputCls =
    "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-[11px] uppercase tracking-widest text-muted font-medium mb-1.5" htmlFor="pw-current">
          Current password
        </label>
        <input id="pw-current" type={show ? "text" : "password"} autoComplete="current-password"
          value={current} onChange={(e) => setCurrent(e.target.value)} required className={inputCls} />
      </div>
      <div>
        <label className="block text-[11px] uppercase tracking-widest text-muted font-medium mb-1.5" htmlFor="pw-next">
          New password
        </label>
        <input id="pw-next" type={show ? "text" : "password"} autoComplete="new-password"
          value={next} onChange={(e) => setNext(e.target.value)} required minLength={MIN_LENGTH} className={inputCls} />
      </div>
      <div>
        <label className="block text-[11px] uppercase tracking-widest text-muted font-medium mb-1.5" htmlFor="pw-confirm">
          New password again
        </label>
        <input id="pw-confirm" type={show ? "text" : "password"} autoComplete="new-password"
          value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={MIN_LENGTH} className={inputCls} />
      </div>
      <div className="flex items-center justify-between gap-3 pt-1">
        <label className="inline-flex items-center gap-2 text-xs text-muted cursor-pointer select-none">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)}
            className="rounded border-border text-primary focus:ring-1 focus:ring-primary" />
          Show passwords
        </label>
        <button type="submit" disabled={busy}
          className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition disabled:opacity-50">
          {busy ? "Saving…" : "Change password"}
        </button>
      </div>
    </form>
  );
}
