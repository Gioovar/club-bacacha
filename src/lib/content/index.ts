import { cacheLife, cacheTag } from "next/cache";
import { demoContent } from "./demo";
import type { ClubEvent, SiteContent } from "./types";

/**
 * Content repository. Swap the body of these functions for Supabase queries in
 * Phase 2 — callers (pages/sections) don't need to change.
 */
export async function getSiteContent(): Promise<SiteContent> {
  "use cache";
  cacheLife("hours");
  cacheTag("site-content");
  return demoContent;
}

export async function getUpcomingEvents(limit?: number): Promise<ClubEvent[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("events");
  const items = demoContent.events.items
    .filter((e) => e.status === "published" || e.status === "sold_out")
    .sort((a, b) => a.date.localeCompare(b.date));
  return typeof limit === "number" ? items.slice(0, limit) : items;
}

export async function getEventBySlug(slug: string): Promise<ClubEvent | undefined> {
  "use cache";
  cacheLife("hours");
  cacheTag("events");
  return demoContent.events.items.find((e) => e.slug === slug);
}

export type { SiteContent, ClubEvent } from "./types";
