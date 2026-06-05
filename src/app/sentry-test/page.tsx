/**
 * Sentry smoke-test page. Visit /sentry-test?throw=server to trigger a
 * server-side error; /sentry-test?throw=client to trigger a client error.
 * Useful only during initial setup — delete this file once you've confirmed
 * errors are reaching Sentry.
 */
import { SentryTestClient } from "./sentry-test-client";

export default async function SentryTestPage({
  searchParams,
}: {
  searchParams: Promise<{ throw?: string }>;
}) {
  const { throw: kind } = await searchParams;

  if (kind === "server") {
    throw new Error("Sentry smoke-test: server-side error from /sentry-test");
  }

  return (
    <div className="max-w-xl mx-auto py-16 px-6 font-mono text-sm">
      <h1 className="text-xl font-semibold mb-4">Sentry smoke test</h1>
      <p className="text-muted mb-6">
        Click a button to trigger an error. Check sentry.io/issues a few seconds
        later to confirm it landed.
      </p>
      <div className="flex gap-3 flex-wrap">
        <a
          href="/sentry-test?throw=server"
          className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-red-700 hover:bg-red-100"
        >
          Throw server error
        </a>
        <SentryTestClient />
      </div>
      <p className="mt-8 text-xs text-muted">
        Delete this page after confirming Sentry is wired up.
      </p>
    </div>
  );
}
