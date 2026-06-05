/**
 * Next.js instrumentation hook — loads the right Sentry config per runtime.
 * Also exports `onRequestError` so React Server Component / Server Action
 * errors get reported to Sentry (Next.js 15+ pattern).
 */
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
