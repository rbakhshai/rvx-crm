import { headers } from "next/headers";

/**
 * Abuse guard for ANONYMOUS public form submissions (bird-dog application,
 * seller intake, buyer intake, homepage contact). Two cheap layers:
 *
 *  1. Honeypot — the form renders a hidden `website` field that humans
 *     never see but bots dutifully fill. Any value = drop.
 *  2. Per-IP throttle — a best-effort in-memory sliding window. On
 *     serverless (Vercel) this is per-instance and resets on cold start,
 *     so it's a speed bump against bursts, NOT distributed rate limiting.
 *     For real distributed limits, add Upstash/Redis later — noted as a
 *     follow-up. The honeypot does most of the anti-spam work.
 */
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_WINDOW = 8;
const hits = new Map<string, number[]>();

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Returns true if the submission looks abusive and should be dropped. */
export async function isPublicFormAbuse(formData: FormData): Promise<boolean> {
  // Honeypot: bots fill every field; the hidden `website` input is empty for humans.
  if (String(formData.get("website") ?? "").trim()) return true;

  const ip = await clientIp();
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) return true;
  recent.push(now);
  hits.set(ip, recent);

  // Opportunistic cleanup so the map can't grow unbounded.
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  }
  return false;
}

/** Hidden honeypot field markup shared by every public form. */
export const HONEYPOT_FIELD_NAME = "website";
