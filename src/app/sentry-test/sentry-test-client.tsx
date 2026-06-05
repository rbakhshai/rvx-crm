"use client";

export function SentryTestClient() {
  return (
    <button
      type="button"
      onClick={() => {
        throw new Error("Sentry smoke-test: client-side error from /sentry-test");
      }}
      className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-red-700 hover:bg-red-100"
    >
      Throw client error
    </button>
  );
}
