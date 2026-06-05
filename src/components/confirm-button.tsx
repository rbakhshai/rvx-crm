"use client";

import { useTransition } from "react";

/**
 * Button that prompts confirm() then runs a server action.
 * Use anywhere a server action is destructive — DeleteButton handles the
 * common "danger pill" variant; this is the bare-bones text-link version.
 */
export function ConfirmButton({
  action,
  label,
  confirmText,
  className,
}: {
  action: () => Promise<void>;
  label: string;
  confirmText: string;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      className={className ?? "text-red-600 hover:text-red-700 text-xs font-medium underline-offset-2 hover:underline disabled:opacity-50"}
      onClick={() => {
        if (!confirm(confirmText)) return;
        startTransition(async () => {
          await action();
        });
      }}
    >
      {isPending ? "Working…" : label}
    </button>
  );
}
