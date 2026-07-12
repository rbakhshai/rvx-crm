"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/confirm-dialog";
import { resetUserPasswordAction } from "../actions";

export function ResetPasswordButton({ userId, userName }: { userId: string; userName: string }) {
  const [isPending, startTransition] = useTransition();
  const dialog = useConfirmDialog();
  return (
    <>
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        dialog.ask({
          title: `Reset password for ${userName}?`,
          body: "A new temp password is generated and their current password stops working immediately.",
          confirmLabel: "Reset password",
          onConfirm: () =>
        startTransition(async () => {
          try {
            const { tempPassword, email, emailStatus } = await resetUserPasswordAction(userId);
            const sent = emailStatus === "sent";
            toast.success(sent ? `Reset email sent to ${userName}` : `Password reset for ${userName}`, {
              description: sent
                ? `New temp password emailed. Share again if needed: ${tempPassword}`
                : `Share manually: ${email} / ${tempPassword}`,
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
        }),
        });
      }}
      className="rounded-md border border-border bg-foreground/[0.04] px-2 py-1 text-xs font-medium hover:bg-foreground/[0.08] transition disabled:opacity-50"
    >
      {isPending ? "…" : "Reset pw"}
    </button>
    {dialog.node}
    </>
  );
}
