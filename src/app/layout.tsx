import type { Metadata, Viewport } from "next";
import { Anton, Instrument_Sans, Instrument_Serif } from "next/font/google";
import { SITE } from "@/lib/site";
import "./globals.css";

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.bacacha.com"),
  title: { default: SITE.title, template: "%s | Club Bacachá" },
  description: "Club Privado en Acapulco — Eventos exclusivos, beneficios de barra, comunidad y recompensas para miembros.",
  applicationName: SITE.name,
  alternates: { canonical: "https://www.bacacha.com" },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: "https://www.bacacha.com",
    siteName: SITE.name,
    title: "Club Bacachá | ¿Tú ya eres del Club?",
    description: "Club Privado en Acapulco — Eventos exclusivos, beneficios de barra, comunidad y recompensas para miembros.",
    images: [
      {
        url: "https://www.bacacha.com/og-image.png",
        secureUrl: "https://www.bacacha.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Club Bacachá — Cantina Dolores Acapulco",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Club Bacachá | ¿Tú ya eres del Club?",
    description: "Club Privado en Acapulco — Eventos exclusivos, beneficios de barra, comunidad y recompensas para miembros.",
    images: ["https://www.bacacha.com/og-image.png"],
    creator: "@clubbacacha",
  },
  formatDetection: { telephone: false },
  appleWebApp: { capable: true, title: SITE.shortName, statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Runs before paint: enables motion only when the user allows it and hides the
 * age gate for returning visitors — no flashes, no hydration mismatch.
 */
const bootScript = `(function(){try{var d=document.documentElement;if(!matchMedia('(prefers-reduced-motion: reduce)').matches)d.classList.add('motion-ok');if(localStorage.getItem('bch_age_ok')==='1')d.classList.add('gate-ok');}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-MX"
      suppressHydrationWarning
      className={`${anton.variable} ${instrumentSans.variable} ${instrumentSerif.variable} antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="min-h-screen-safe">{children}</body>
    </html>
  );
}
