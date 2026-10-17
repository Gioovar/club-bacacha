import { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/club",
    "/beneficios",
    "/eventos",
    "/registro",
    "/mi-membresia",
    "/aviso-privacidad",
    "/terminos",
    "/contacto",
  ];

  return routes.map((route) => ({
    url: `${SITE.url}${route}`,
    lastModified: "2026-10-17",
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));
}
