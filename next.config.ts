import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const config: NextConfig = {
  typedRoutes: true,
};

/**
 * Sentry build-time wrapper.
 * Source-map upload requires SENTRY_AUTH_TOKEN at build time; without it,
 * everything still works — error stack traces just show minified frames
 * until a token is set in Vercel.
 */
export default withSentryConfig(config, {
  // Org + project from sentry.io (e.g. "rvx-crm" / "javascript-nextjs").
  // Set as env vars in Vercel; safe to leave undefined locally.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  sourcemaps: { disable: false },
  disableLogger: true,
});
