/**
 * Content model for the simple CMS.
 * Phase 1: served from `demo.ts`. Phase 2: same shapes are read from Supabase
 * (`site_content`, `benefits`, `events`, `gallery_items`, `faqs`).
 */

export type ImageAsset = {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** CSS object-position, e.g. "50% 30%" */
  focal?: string;
};

export type Cta = { label: string; href: string };

export type HeroContent = {
  eyebrow: string;
  headlineLines: string[];
  brand: string;
  subLines: string[];
  primaryCta: Cta;
  secondaryCta?: Cta;
  image: { desktop: ImageAsset; mobile: ImageAsset };
  /** Optional background video. Provide lightweight mobile + desktop encodes. */
  video?: { desktop?: string; mobile?: string };
};

export type ManifestoContent = {
  kicker: string;
  lines: string[];
  body: string;
  closing: string;
  image: ImageAsset;
};

export type Benefit = {
  id: string;
  slug: string;
  title: string;
  phrase: string;
  image: ImageAsset;
  description?: string;
  startsAt?: string | null;
  endsAt?: string | null;
  active: boolean;
  requirements?: string | null;
  code?: string | null;
};

export type Step = { number: string; title: string; text: string };

export type EventStatus = "draft" | "published" | "sold_out" | "cancelled" | "past";

export type ClubEvent = {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: ImageAsset;
  venue: string;
  city: string;
  /** ISO date (YYYY-MM-DD), local to Acapulco */
  date: string;
  /** "22:00" */
  time: string;
  externalUrl?: string | null;
  reserveUrl?: string | null;
  status: EventStatus;
  membersOnly?: boolean;
};

export type GalleryItem = {
  id: string;
  image: ImageAsset;
  orientation: "portrait" | "landscape";
  /** Parallax speed factor (-1..1). 0 = static */
  speed: number;
};

export type Faq = { q: string; a: string };

export type SiteContent = {
  hero: HeroContent;
  manifesto: ManifestoContent;
  benefits: { eyebrow: string; titleLines: string[]; items: Benefit[] };
  howItWorks: { eyebrow: string; titleLines: string[]; steps: Step[] };
  membership: {
    eyebrow: string;
    titleLines: string[];
    body: string;
    demo: { firstName: string; memberNumber: number; since: number };
  };
  gallery: {
    eyebrow: string;
    titleLines: string[];
    words: string[];
    marquee: string[];
    items: GalleryItem[];
  };
  events: { eyebrow: string; titleLines: string[]; items: ClubEvent[] };
  registration: { eyebrow: string; titleLines: string[]; body: string };
  finalCta: { titleLines: string[]; body: string; cta: Cta };
  faqs: Faq[];
  social: { instagram: string; tiktok: string; whatsapp?: string };
  contactEmail: string;
};
