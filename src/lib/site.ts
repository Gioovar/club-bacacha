export const SITE = {
  name: "Club Bacachá",
  shortName: "Bacachá",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bacacha.com",
  title: "Club Bacachá | ¿Tú ya eres del Club?",
  description:
    "Únete a Club Bacachá y descubre promociones, eventos, experiencias y beneficios exclusivos.",
  locale: "es_MX",
  city: "Acapulco",
  /** Legal minimum age to join (México). */
  minAge: 18,
} as const;

/** Public member number → "001284" */
export function formatMemberNumber(n: number): string {
  return String(n).padStart(6, "0");
}

/** "BACACHÁ MEMBER #001284" */
export function memberLabel(n: number): string {
  return `#${formatMemberNumber(n)}`;
}

export function referralUrl(memberNumber: number): string {
  return `${SITE.url}/?ref=${formatMemberNumber(memberNumber)}`;
}

const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
const WEEKDAYS = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];

/** Parses an ISO date (YYYY-MM-DD) deterministically, no timezone drift. */
export function formatEventDate(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return {
    day: String(d).padStart(2, "0"),
    month: MONTHS[m - 1],
    weekday: WEEKDAYS[dt.getUTCDay()],
    year: y,
  };
}
