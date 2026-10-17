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
  metadataBase: new URL(SITE.url),
  title: { default: SITE.title, template: "%s | Club Bacachá" },
  description: SITE.description,
  applicationName: SITE.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: "/",
    siteName: SITE.name,
    title: "¿Tú ya eres del Club?",
    description: "Únete a Club Bacachá.",
  },
  twitter: {
    card: "summary_large_image",
    title: "¿Tú ya eres del Club?",
    description: "Únete a Club Bacachá.",
  },
  formatDetection: { telephone: false },
  appleWebApp: { capable: true, title: SITE.shortName, statusBarStyle: "black-translucent" },
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
