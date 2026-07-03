/**
 * URL-safety helpers for anywhere untrusted input reaches a redirect or
 * an href. Pure functions — safe to import in client or server code.
 */

/**
 * A `?next=` redirect target is only honored if it's a same-origin
 * absolute path. Rejects schemes (javascript:, http:), protocol-relative
 * (//evil.com) and backslash tricks (/\evil.com) — all open-redirect /
 * phishing vectors. Falls back otherwise.
 */
export function safeRedirectPath(next: string | null | undefined, fallback: string): string {
  if (!next || next[0] !== "/" || next[1] === "/" || next[1] === "\\") return fallback;
  return next;
}

/**
 * Sanitize a URL destined for an <a href>. Allows same-origin relative
 * paths and http(s) absolute URLs only; everything else (javascript:,
 * data:, etc.) becomes "" so the link is inert.
 */
export function safeExternalUrl(url: string | null | undefined): string {
  const t = (url ?? "").trim();
  if (!t) return "";
  if (t[0] === "/" && t[1] !== "/" && t[1] !== "\\") return t;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:" ? t : "";
  } catch {
    return "";
  }
}
