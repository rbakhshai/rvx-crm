/**
 * Sentry — server runtime (Node.js, Server Components, Server Actions).
 * Becomes a no-op if SENTRY_DSN is unset, so this file is safe to ship before
 * the user adds the DSN to Vercel env vars.
 */
import * as Sentry from "@sentry/nextjs";

const DSN = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    // Lower sample rate in prod to keep within the free tier (5k events/mo).
    // Errors are always 100%; only traces are sampled.
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    // Send 100% of errors but stop short of capturing every request body.
    sendDefaultPii: false,
  });
}
