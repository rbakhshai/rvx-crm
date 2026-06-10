"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeOnboardingAction } from "@/app/actions/onboarding";
import { cn } from "@/lib/cn";

/**
 * Marks the user as onboarded then bounces to /today. Used for both
 * "Skip for now" and "Finish — take me to the dashboard." We don't
 * differentiate server-side: skip and finish both stamp onboardedAt,
 * because the user has acknowledged the page either way and we don't
 * want the redirect to fire again on every navigation.
 */
export function FinishOnboardingButton({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: "skip" | "finish";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => {
        startTransition(async () => {
          await completeOnboardingAction();
          router.push("/today");
        });
      }}
      disabled={pending}
      className={cn(
        "rounded-md px-4 py-2 text-sm font-semibold transition disabled:opacity-50",
        variant === "finish"
          ? "bg-primary text-primary-foreground hover:opacity-90"
          : "text-foreground/70 hover:text-foreground hover:bg-foreground/[0.04]",
      )}
    >
      {pending ? "…" : children}
    </button>
  );
}
