"use client";

import type { PublicMember } from "./types";

/**
 * Phase 1 local persistence of the member session so /mi-membresia and /club
 * work right after registering. Phase 2 replaces this with Supabase Auth
 * (OTP / magic link) — the stored data is non-sensitive (no email/phone).
 */
const KEY = "bch_member";
export const MEMBER_EVENT = "bch:member";

export function saveMember(member: PublicMember) {
  try {
    localStorage.setItem(KEY, JSON.stringify(member));
    window.dispatchEvent(new CustomEvent(MEMBER_EVENT));
  } catch {
    /* ignore */
  }
}

export function loadMember(): PublicMember | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PublicMember) : null;
  } catch {
    return null;
  }
}

export function clearMember() {
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new CustomEvent(MEMBER_EVENT));
  } catch {
    /* ignore */
  }
}
