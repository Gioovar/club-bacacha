import { cacheLife, cacheTag } from "next/cache";
import { demoContent } from "./demo";
import type { ClubEvent, SiteContent } from "./types";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getUpcomingEvents(limit?: number): Promise<ClubEvent[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("events");

  const supabase = createAdminClient();
  if (supabase) {
    try {
      const { data: dbEvents, error } = await supabase
        .from("events")
        .select("*")
        .eq("status", "published")
        .order("event_date", { ascending: true });

      if (!error && dbEvents) {
        const events: ClubEvent[] = dbEvents.map((e) => ({
          id: e.id,
          slug: e.slug,
          name: e.name,
          description: e.description,
          date: e.event_date,
          time: e.event_time || "22:00",
          venue: e.venue,
          city: e.city || "Acapulco",
          status: e.status as any,
          membersOnly: Boolean(e.members_only),
          image: {
            src: e.image_url || "/gran_inauguracion.png",
            alt: e.name,
            width: 1600,
            height: 1000,
          },
        }));
        return typeof limit === "number" ? events.slice(0, limit) : events;
      }
    } catch (err) {
      console.error("Error fetching events from Supabase:", err);
    }
  }

  return [];
}

export async function getActiveBenefits() {
  "use cache";
  cacheLife("minutes");
  cacheTag("benefits");

  const supabase = createAdminClient();
  if (supabase) {
    try {
      const { data: dbBenefits, error } = await supabase
        .from("benefits")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: true });

      if (!error && dbBenefits && dbBenefits.length > 0) {
        return dbBenefits.map((b) => ({
          id: b.id,
          slug: b.slug || b.id,
          title: b.title,
          phrase: b.phrase,
          active: Boolean(b.active),
          image: {
            src: b.image_url || "/images/bartender_pour.jpg",
            alt: b.title,
            width: 1200,
            height: 1600,
          },
        }));
      }
    } catch (err) {
      console.error("Error fetching benefits from Supabase:", err);
    }
  }

  return [];
}

export async function getSiteContent(): Promise<SiteContent> {
  "use cache";
  cacheLife("minutes");
  cacheTag("site-content");

  const [realEvents, realBenefits] = await Promise.all([
    getUpcomingEvents(),
    getActiveBenefits(),
  ]);

  return {
    ...demoContent,
    events: {
      ...demoContent.events,
      items: realEvents,
    },
    benefits: {
      ...demoContent.benefits,
      items: realBenefits.length > 0 ? realBenefits : demoContent.benefits.items,
    },
  };
}

export async function getEventBySlug(slug: string): Promise<ClubEvent | undefined> {
  "use cache";
  cacheLife("minutes");
  cacheTag("events");

  const events = await getUpcomingEvents();
  return events.find((e) => e.slug === slug);
}

export type { SiteContent, ClubEvent } from "./types";
