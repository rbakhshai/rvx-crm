"use client";

import { useTransition } from "react";
import { Button } from "./button";

/**
 * Client-side delete button. Confirms via native dialog, then calls a
 * server action (passed in already bound to the record id).
 */
export function DeleteButton({
  action,
  label = "Delete",
  confirmText,
}: {
  action: () => Promise<void>;
  label?: string;
  confirmText: string;
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
          await action();
        });
      }}
    >
      {isPending ? "Deleting…" : label}
    </Button>
  );
}
