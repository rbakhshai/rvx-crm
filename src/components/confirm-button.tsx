"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useConfirmDialog } from "./confirm-dialog";

/**
 * Button that opens a branded confirm dialog, then runs a server action.
 * Use anywhere a server action is destructive — DeleteButton handles the
 * common "danger pill" variant; this is the bare-bones text-link version.
 */
export function ConfirmButton({
  action,
  label,
  confirmText,
  title,
  danger = true,
  className,
  toastMessage = "Done",
  toastDescription,
}: {
  action: () => Promise<void>;
  label: string;
  confirmText: string;
  /** Dialog heading; defaults to a generic prompt. */
  title?: string;
  /** Style the dialog's confirm button as destructive. */
  danger?: boolean;
  className?: string;
  toastMessage?: string;
  toastDescription?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const dialog = useConfirmDialog();
  return (
    <>
      <button
        type="button"
        disabled={isPending}
        className={className ?? "text-red-600 hover:text-red-700 text-xs font-medium underline-offset-2 hover:underline disabled:opacity-50"}
        onClick={() =>
          dialog.ask({
            title: title ?? "Are you sure?",
            body: confirmText,
            confirmLabel: label,
            danger,
            onConfirm: () =>
              startTransition(async () => {
                try {
                  await action();
                  toast.success(toastMessage, toastDescription ? { description: toastDescription } : undefined);
                } catch (err) {
                  toast.error("Action failed", {
                    description: err instanceof Error ? err.message : "Try again or contact support.",
                  });
                }
              }),
          })
        }
      >
        {isPending ? "Working…" : label}
      </button>
      {dialog.node}
    </>
  );
}
