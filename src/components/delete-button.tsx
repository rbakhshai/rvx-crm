"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "./button";

/**
 * Client-side delete button. Confirms via native dialog, then calls a
 * server action (passed in already bound to the record id).
 *
 * Shows a toast for instant feedback ("Moved to trash · Undo from /trash")
 * since the action redirects before the user can see anything else.
 */
export function DeleteButton({
  action,
  label = "Delete",
  confirmText,
  toastMessage = "Moved to trash",
  toastDescription = "Restore from Trash within 30 days.",
}: {
  action: () => Promise<void>;
  label?: string;
  confirmText: string;
  toastMessage?: string;
  toastDescription?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="danger"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (!confirm(confirmText)) return;
        startTransition(async () => {
          try {
            await action();
            toast.success(toastMessage, { description: toastDescription });
          } catch (err) {
            toast.error("Couldn't delete", {
              description: err instanceof Error ? err.message : "Try again or contact support.",
            });
          }
        });
      }}
    >
      {isPending ? "Deleting…" : label}
    </Button>
  );
}
