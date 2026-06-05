"use client";

/**
 * Surfaces the actual error message instead of Next.js's generic page.
 * Safe to keep around — only shown when the DD page render throws.
 */
export default function DdError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      <h1 className="text-xl font-semibold text-red-700">Due Diligence page error</h1>
      <p className="mt-2 text-sm text-muted">Something went wrong rendering this page.</p>
      <pre className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200 text-xs whitespace-pre-wrap overflow-x-auto">
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
