import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

/**
 * Baseline security headers applied to every response.
 *
 * Deliberately NOT a full content CSP (script-src/style-src/…): that
 * needs a nonce-based setup and careful testing against Google Maps and
 * Sentry, and a rushed CSP would break the app. What's here is the
 * high-value, zero-breakage set — clickjacking, MIME-sniffing, referrer
 * leakage, feature access, and HTTPS enforcement. `frame-ancestors` is
 * the one CSP directive included (framing only — restricts nothing else).
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
];

const config: NextConfig = {
  typedRoutes: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
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
