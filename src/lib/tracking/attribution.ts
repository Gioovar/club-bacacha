"use client";

import type { Attribution } from "@/lib/members/schema";

const KEY = "bch_attr";
const TRACKED = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

function deviceType(): NonNullable<Attribution["device_type"]> {
  const ua = navigator.userAgent;
  if (/iPad|Tablet|(Android(?!.*Mobile))/i.test(ua)) return "tablet";
  if (/Mobi|iPhone|Android/i.test(ua)) return "mobile";
  return window.innerWidth < 768 ? "mobile" : "desktop";
}

function read(): Attribution {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Attribution;
  } catch {
    return {};
  }
}

/**
 * Captures campaign attribution on landing. Strategy: "last non-direct touch".
 * A visit with UTMs / ?qr= / ?ref= overwrites the stored touch; a direct visit
 * only seeds the record if nothing was stored yet. Referral (?ref) is sticky.
 *
 * Supports offline QR campaigns: bacacha.com/?utm_campaign=playera
 */
export function captureAttribution(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const p = url.searchParams;
  const prev = read();

  const hasCampaign = TRACKED.some((k) => p.get(k)) || p.get("qr");
  const ref = p.get("ref")?.replace(/\D/g, "").slice(0, 9) || prev.ref;

  if (!hasCampaign && Object.keys(prev).length > 0) {
    if (ref && ref !== prev.ref) localStorage.setItem(KEY, JSON.stringify({ ...prev, ref }));
    return;
  }

  const next: Attribution = {
    landing_url: url.toString().slice(0, 2048),
    referrer: document.referrer.slice(0, 2048) || undefined,
    device_type: deviceType(),
    first_seen_at: new Date().toISOString(),
    ref: ref || undefined,
  };
  for (const k of TRACKED) {
    const v = p.get(k);
    if (v) next[k] = v.slice(0, 120);
  }
  const qr = p.get("qr");
  if (qr) next.qr_code = qr.slice(0, 120);

  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
}

export function getAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  const a = read();
  // Device type is refreshed at submit time (user may have switched devices).
  return { ...a, device_type: deviceType() };
}
