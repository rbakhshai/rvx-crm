"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ROLES } from "@/lib/permissions";
import { inviteUserAction } from "../actions";

/**
 * Admin form to add a new user. On submit, server creates the account with
 * a random temp password. We show that password in a sticky "copy this"
 * toast since email infra isn't wired yet — admin shares it manually.
 */
export function InviteUserForm() {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [copied, setCopied] = useState(false);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        const { tempPassword, email, name, emailStatus } = await inviteUserAction(formData);
        const sent = emailStatus === "sent";
        toast.success(sent ? `Invite emailed to ${name}` : `${name} created`, {
          description: sent
            ? `${name} just got an invite email at ${email}. Temp password: ${tempPassword}`
            : `Email not sent (no provider configured). Share manually: ${email} / ${tempPassword}`,
          duration: 60_000,
          action: {
            label: copied ? "Copied!" : "Copy login",
            onClick: () => {
              navigator.clipboard.writeText(`Email: ${email}\nTemp password: ${tempPassword}\nLogin: ${window.location.origin}/login`);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            },
          },
        });
        formRef.current?.reset();
      } catch (err) {
        toast.error("Couldn't invite", {
          description: err instanceof Error ? err.message : "Try again or contact support.",
        });
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="rounded-xl border border-border bg-surface p-4 mb-6">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted mb-3">Invite a teammate</div>
      <div className="grid sm:grid-cols-12 gap-2 items-end">
        <div className="sm:col-span-3">
          <label className="block text-[10px] uppercase tracking-widest text-muted font-medium mb-0.5">Name *</label>
          <input
            name="name"
            required
            placeholder="Erica Lawson"
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="sm:col-span-4">
          <label className="block text-[10px] uppercase tracking-widest text-muted font-medium mb-0.5">Work email *</label>
          <input
            name="email"
            type="email"
            required
            placeholder="erica@rvparkexchange.com"
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="sm:col-span-3">
          <label className="block text-[10px] uppercase tracking-widest text-muted font-medium mb-0.5">Role</label>
          <select
            name="role"
            defaultValue="closer"
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {isPending ? "Inviting…" : "Send invite"}
          </button>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted">
        Creates an account with a random temp password. You&apos;ll see the login details in a toast — copy + share with your teammate.
        (Once we wire Resend in Phase B, this becomes a real email invite.)
      </p>
    </form>
  );
}
