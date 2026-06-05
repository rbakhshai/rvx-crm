/**
 * Sentry — Edge runtime (middleware, edge API routes).
 * Light footprint; no-op without DSN.
 */
import * as Sentry from "@sentry/nextjs";

const DSN = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  });
}
