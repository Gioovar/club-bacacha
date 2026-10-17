import type { ImageAsset, SiteContent } from "./types";

/**
 * Demo content (Phase 1). Every string and image here is meant to be editable
 * from /admin/contenido once the CMS is connected to Supabase (Phase 2).
 */

const img = (
  name: string,
  alt: string,
  width: number,
  height: number,
  focal?: string,
): ImageAsset => ({ src: `/images/${name}.jpg`, alt, width, height, focal });

export const IMAGES = {
  heroWide: img("hero_wide", "Amigos bailando en una terraza frente a la bahía de Acapulco de noche", 1376, 768, "50% 45%"),
  heroVertical: img("hero_vertical", "Fiesta nocturna con confeti y amigos con las manos arriba", 768, 1376, "50% 40%"),
  bay: img("bay_night", "La bahía de Acapulco iluminada de noche entre palmeras", 1264, 848),
  dj: img("dj_crowd", "DJ entre humo ámbar frente a una pista llena", 896, 1200, "50% 35%"),
  toast: img("toast_friends", "Manos brindando con cócteles bajo flash", 896, 1200),
  birthday: img("birthday_night", "Celebración de cumpleaños con bengalas en una mesa", 896, 1200, "50% 30%"),
  portrait: img("portrait_flash", "Retrato con flash de un hombre afuera de un club", 848, 1264, "50% 30%"),
  door: img("entrance_door", "Puerta sin letrero de un club privado con cordón de terciopelo", 848, 1264),
  pool: img("pool_sunset", "Amigos brindando en una alberca infinita al atardecer en Acapulco", 1264, 848),
  dancing: img("woman_dancing", "Mujer bailando con vestido negro bajo luz roja", 896, 1200, "50% 30%"),
  beach: img("beach_night", "Fiesta privada en la playa con fogata y luces", 1376, 768),
  invitation: img("black_invitation", "Sobre negro sellado con lacre sobre una barra de mármol", 896, 1200),
  bartender: img("bartender_pour", "Bartender sirviendo un cóctel en una barra oscura", 896, 1200, "50% 40%"),
  yacht: img("yacht_night", "Amigos bailando en la cubierta de un velero en la bahía", 1264, 848),
} as const;

export const demoContent: SiteContent = {
  hero: {
    eyebrow: "Acapulco — Club privado",
    headlineLines: ["¿Tú ya", "eres del", "club?"],
    brand: "Bacachá",
    subLines: ["Hay cosas que no publicamos.", "Se las contamos al Club."],
    primaryCta: { label: "Quiero ser parte", href: "/#unete" },
    secondaryCta: { label: "Descubre el club", href: "/#club" },
    image: { desktop: IMAGES.heroWide, mobile: IMAGES.heroVertical },
  },
  manifesto: {
    kicker: "Manifiesto",
    lines: ["No es", "una lista.", "Es el club."],
    body: "Club Bacachá reúne personas, experiencias, promociones, eventos y beneficios que no siempre aparecen en redes sociales.",
    closing: "Aquí empieza todo.",
    image: IMAGES.door,
  },
  benefits: {
    eyebrow: "Beneficios",
    titleLines: ["Lo que pasa", "adentro"],
    items: [
      { id: "b1", slug: "promociones-secretas", title: "Promociones secretas", phrase: "Lo que no está en el menú.", image: IMAGES.bartender, active: true },
      { id: "b2", slug: "eventos", title: "Eventos", phrase: "Primero te enteras tú.", image: IMAGES.dj, active: true },
      { id: "b3", slug: "cumpleanos", title: "Cumpleaños", phrase: "Tu noche. A nuestra manera.", image: IMAGES.birthday, active: true },
      { id: "b4", slug: "accesos", title: "Accesos", phrase: "La puerta correcta, a la hora correcta.", image: IMAGES.door, active: true },
      { id: "b5", slug: "experiencias", title: "Experiencias", phrase: "Noches que no se repiten.", image: IMAGES.yacht, active: true },
      { id: "b6", slug: "invitaciones", title: "Invitaciones", phrase: "Llegan sin aviso. Sólo al Club.", image: IMAGES.invitation, active: true },
      { id: "b7", slug: "sorpresas", title: "Sorpresas", phrase: "No te vamos a decir cuándo.", image: IMAGES.toast, active: true },
      { id: "b8", slug: "beneficios-miembros", title: "Beneficios para miembros", phrase: "Por ser del Club. Nada más.", image: IMAGES.pool, active: true },
    ],
  },
  howItWorks: {
    eyebrow: "Cómo entrar al club",
    titleLines: ["Tres pasos.", "Una puerta."],
    steps: [
      { number: "01", title: "Únete", text: "Completa tu registro." },
      { number: "02", title: "Recibe tu membresía", text: "Obtén tu número de miembro." },
      { number: "03", title: "Desbloquea beneficios", text: "Recibe promociones, eventos y experiencias." },
    ],
  },
  membership: {
    eyebrow: "Membresía digital",
    titleLines: ["Tu nombre.", "Tu número.", "Tu club."],
    body: "Una credencial que vive en tu teléfono. Úsala para entrar, para reclamar y para que te reconozcan.",
    demo: { firstName: "Giovanni", memberNumber: 1284, since: 2026 },
  },
  gallery: {
    eyebrow: "Cultura del club",
    titleLines: ["Así se vive", "el club"],
    words: ["Acapulco", "Noche", "Amigos", "Bacachá", "El club"],
    marquee: ["Bacachá", "Acapulco", "Nightlife", "Club", "Amigos", "Experiencias"],
    items: [
      { id: "g1", image: IMAGES.heroVertical, orientation: "portrait", speed: -0.12 },
      { id: "g2", image: IMAGES.bay, orientation: "landscape", speed: 0.08 },
      { id: "g3", image: IMAGES.portrait, orientation: "portrait", speed: 0.18 },
      { id: "g4", image: IMAGES.dancing, orientation: "portrait", speed: -0.08 },
      { id: "g5", image: IMAGES.pool, orientation: "landscape", speed: 0.12 },
      { id: "g6", image: IMAGES.dj, orientation: "portrait", speed: -0.16 },
      { id: "g7", image: IMAGES.beach, orientation: "landscape", speed: 0.06 },
      { id: "g8", image: IMAGES.toast, orientation: "portrait", speed: 0.14 },
    ],
  },
  events: {
    eyebrow: "Agenda",
    titleLines: ["Próximos", "eventos"],
    items: [
      {
        id: "e1",
        slug: "noche-cero",
        name: "Noche Cero",
        description: "La primera noche del Club. La locación se revela 24 horas antes, sólo a miembros.",
        image: IMAGES.dancing,
        venue: "Locación secreta",
        city: "Acapulco",
        date: "2026-10-31",
        time: "22:00",
        status: "published",
        membersOnly: true,
      },
      {
        id: "e2",
        slug: "bahia-after-dark",
        name: "Bahía After Dark",
        description: "Velero, bahía y la ciudad encendida. Cupo limitado.",
        image: IMAGES.yacht,
        venue: "Bahía de Santa Lucía",
        city: "Acapulco",
        date: "2026-11-14",
        time: "21:00",
        status: "published",
      },
      {
        id: "e3",
        slug: "fuego-en-la-arena",
        name: "Fuego en la Arena",
        description: "Playa privada, fogata y DJ hasta que el mar diga.",
        image: IMAGES.beach,
        venue: "Playa privada · Pie de la Cuesta",
        city: "Acapulco",
        date: "2026-11-28",
        time: "20:00",
        status: "published",
      },
      {
        id: "e4",
        slug: "sunset-sessions",
        name: "Sunset Sessions",
        description: "Infinity pool, atardecer y la bahía prendiéndose de a poco.",
        image: IMAGES.pool,
        venue: "Las Brisas",
        city: "Acapulco",
        date: "2026-12-12",
        time: "18:00",
        status: "published",
      },
    ],
  },
  registration: {
    eyebrow: "Registro",
    titleLines: ["Únete al", "club Bacachá"],
    body: "Toma menos de un minuto. Sin contraseñas.",
  },
  finalCta: {
    titleLines: ["¿Tú ya", "eres del", "club?"],
    body: "No te vamos a contar todo aquí.",
    cta: { label: "Únete a Bacachá", href: "/#unete" },
  },
  faqs: [
    { q: "¿Tiene costo unirse?", a: "Por ahora, entrar al Club no tiene costo. Sólo necesitas ser mayor de edad." },
    { q: "¿Qué recibo al unirme?", a: "Tu número de miembro, tu membresía digital y acceso a promociones, invitaciones y eventos que no publicamos." },
    { q: "¿Cómo se comunican conmigo?", a: "Por WhatsApp y correo, sólo si nos das tu consentimiento. Puedes darte de baja cuando quieras." },
    { q: "¿Puedo invitar a mis amigos?", a: "Sí. Cada miembro tiene un enlace único de invitación." },
    { q: "¿Necesito contraseña?", a: "No. Para entrar a tu perfil te enviaremos un código o enlace de acceso." },
  ],
  social: {
    instagram: "https://instagram.com/clubbacacha",
    tiktok: "https://www.tiktok.com/@clubbacacha",
  },
  contactEmail: "hola@bacacha.com",
};
