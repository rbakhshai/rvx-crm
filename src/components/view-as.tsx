"use client";

/**
 * View-As controls for the CEO.
 *
 *   <ViewAsPicker />  — sidebar dropdown, rendered only for the real
 *                       admin. Picking a role sets the preview cookie.
 *   <ViewAsBanner />  — amber strip across the top of the content area
 *                       while a preview is active. The Exit button here
 *                       is the always-available escape hatch.
 */
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setViewAsRoleAction, clearViewAsRoleAction } from "@/app/actions/view-as";

export function ViewAsPicker({
  roles,
  active,
}: {
  roles: Array<{ value: string; label: string }>;
  active: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(value: string) {
    startTransition(async () => {
      if (value === "") await clearViewAsRoleAction();
      else await setViewAsRoleAction(value);
      router.refresh();
    });
  }

  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-muted font-semibold">
        👁 View as
      </span>
      <select
        value={active ?? ""}
        onChange={(e) => change(e.target.value)}
        disabled={pending}
        className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs cursor-pointer disabled:opacity-50"
      >
        <option value="">Myself (CEO)</option>
        {roles.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
    </label>
  );
}

export function ViewAsBanner({ label }: { label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-amber-400 text-amber-950 px-4 py-2 text-sm font-medium shadow">
      <span>
        👁 Viewing as <strong>{label}</strong> — you see exactly what they see; your own
        powers are paused.
      </span>
      <button
        type="button"
        onClick={() =>
          startTransition(async () => {
            await clearViewAsRoleAction();
            router.refresh();
          })
        }
        disabled={pending}
        className="shrink-0 rounded-md bg-amber-950 text-amber-50 px-3 py-1 text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition"
      >
        {pending ? "…" : "Exit view"}
      </button>
    </div>
  );
}
