"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function TodayError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      <h1 className="text-xl font-semibold text-rose-600 dark:text-rose-400">Today page error</h1>
      <p className="mt-2 text-sm text-muted">Something went wrong rendering this page.</p>
      <pre
        className={
          "mt-4 p-4 rounded-lg text-xs whitespace-pre-wrap overflow-x-auto " +
          "bg-rose-50 border border-rose-200 text-rose-900 " +
          "dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-100"
        }
      >
        {error.message}
        {error.digest && `\n\nDigest: ${error.digest}`}
        {error.stack && `\n\n${error.stack}`}
      </pre>
      <button
        onClick={reset}
        className="mt-4 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
