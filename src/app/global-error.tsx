"use client";

/**
 * Last-resort error boundary: catches anything that bubbled up past route
 * error.tsx files (e.g. an error in the root layout). Reports it to Sentry,
 * then shows a minimal fallback so the user still sees something.
 */
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ maxWidth: 560, margin: "120px auto", padding: 24, fontFamily: "system-ui" }}>
          <h1 style={{ fontSize: 20, color: "#b91c1c" }}>Something went wrong</h1>
          <p style={{ marginTop: 8, color: "#555", fontSize: 14 }}>
            The error was reported automatically. Try refreshing the page; if it keeps happening,
            ping the team with the digest below.
          </p>
          {error.digest && (
            <pre style={{ marginTop: 16, padding: 12, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 12 }}>
              Digest: {error.digest}
            </pre>
          )}
        </div>
      </body>
    </html>
  );
}
