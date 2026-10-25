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
  inauguration: {
    src: "/images/gran_inauguracion.png",
    alt: "Póster Gran Inauguración Club Bacachá Acapulco - Viernes 6 de Noviembre",
    width: 1122,
    height: 1402,
  },
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
    primaryCta: { label: "ÚNETE GRATIS", href: "/#unete" },
    secondaryCta: { label: "DESCUBRE TUS BENEFICIOS", href: "/#beneficios" },
    image: { desktop: IMAGES.heroWide, mobile: IMAGES.heroVertical },
  },
  manifesto: {
    kicker: "Manifiesto",
    lines: ["NO ES SOLO", "UN CLUB.", "ES UNA", "COMUNIDAD."],
    body: "Club Bacachá reúne personas, experiencias, promociones, eventos y beneficios que no siempre aparecen en redes sociales. Una comunidad auténtica donde cada noche tiene su propia historia y cada miembro su lugar.",
    closing: "Aquí empieza todo.",
    image: IMAGES.inauguration,
  },
  benefits: {
    eyebrow: "Beneficios del Club",
    titleLines: ["Lo que pasa", "adentro"],
    items: [
      { id: "b1", slug: "promociones-exclusivas", title: "Promociones Exclusivas", phrase: "Precios especiales y combinaciones que no están en el menú público.", image: IMAGES.bartender, active: true },
      { id: "b2", slug: "eventos-del-club", title: "Eventos del Club", phrase: "Primero te enteras tú. Acceso preferencial a fechas oficiales y noches secretas.", image: IMAGES.dj, active: true },
      { id: "b3", slug: "puntos-y-recompensas", title: "Puntos y Recompensas", phrase: "Acumula puntos por tus visitas y canjéalos por premios oficiales.", image: IMAGES.toast, active: true },
      { id: "b4", slug: "productos-exclusivos", title: "Productos Exclusivos", phrase: "Playeras, gorras y botellas edición conmemorativa Club Bacachá.", image: IMAGES.door, active: true },
      { id: "b5", slug: "cumpleanos", title: "Cumpleaños", phrase: "Tu noche más importante con cortesías especiales y bienvenida VIP de la casa.", image: IMAGES.birthday, active: true },
      { id: "b6", slug: "nuevas-amistades", title: "Nuevas Amistades", phrase: "Conecta con personas en tu misma vibra con la dinámica social del semáforo.", image: IMAGES.portrait, active: true },
      { id: "b7", slug: "membresia-digital", title: "Membresía Digital", phrase: "Tu credencial inteligente con QR siempre disponible en tu teléfono.", image: IMAGES.invitation, active: true },
      { id: "b8", slug: "sorpresas-para-miembros", title: "Sorpresas para Miembros", phrase: "Beneficios espontáneos y accesos que llegan directamente a ti sin aviso.", image: IMAGES.pool, active: true },
    ],
  },
  howItWorks: {
    eyebrow: "Cómo entrar al club",
    titleLines: ["Tres pasos.", "Una puerta."],
    steps: [
      { number: "01", title: "Únete gratis", text: "Completa tu registro en menos de un minuto." },
      { number: "02", title: "Recibe tu membresía", text: "Obtén tu número de miembro y QR inteligente." },
      { number: "03", title: "Desbloquea beneficios", text: "Acumula puntos, asiste a eventos y canjea premios." },
    ],
  },
  membership: {
    eyebrow: "Membresía digital",
    titleLines: ["Tu nombre.", "Tu número.", "Tu club."],
    body: "Una credencial que vive en tu teléfono. Úsala para entrar, acumular puntos y canjear tus recompensas exclusivas.",
    demo: { firstName: "Giovanni", memberNumber: 1284, since: 2026 },
  },
  gallery: {
    eyebrow: "Cultura del club",
    titleLines: ["Así se vive", "el club"],
    words: ["Acapulco", "Noche", "Amigos", "Bacachá", "El club"],
    marquee: ["Bacachá", "Acapulco", "Nightlife", "Club", "Amigos", "Experiencias", "Comunidad"],
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
    eyebrow: "Próximo Evento Oficial",
    titleLines: ["Gran Inauguración", "Acapulco"],
    items: [],
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
