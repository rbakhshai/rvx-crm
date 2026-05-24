"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await signOut();
          router.push("/login");
          router.refresh();
        })
      }
      className="text-xs hover:underline disabled:opacity-50"
    >
      {isPending ? "Signing out…" : "Sign out"}
    </button>
  );
}
