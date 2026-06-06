"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { resetUserPasswordAction } from "../actions";

export function ResetPasswordButton({ userId, userName }: { userId: string; userName: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm(`Generate a new temp password for "${userName}"? Their current password will stop working.`)) return;
        startTransition(async () => {
          try {
            const { tempPassword, email } = await resetUserPasswordAction(userId);
            toast.success(`Password reset for ${userName}`, {
              description: `Share with them: ${email} / ${tempPassword}`,
              duration: 60_000,
              action: {
                label: "Copy",
                onClick: () => {
                  navigator.clipboard.writeText(`Email: ${email}\nTemp password: ${tempPassword}\nLogin: ${window.location.origin}/login`);
                },
              },
            });
          } catch (err) {
            toast.error("Couldn't reset password", {
              description: err instanceof Error ? err.message : "Try again.",
            });
          }
        });
      }}
      className="rounded-md border border-border bg-foreground/[0.04] px-2 py-1 text-xs font-medium hover:bg-foreground/[0.08] transition disabled:opacity-50"
    >
      {isPending ? "…" : "Reset pw"}
    </button>
  );
}
