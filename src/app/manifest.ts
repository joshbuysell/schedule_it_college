import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Розклад занять — ІТ коледж Львівської політехніки",
    short_name: "Розклад ІТК",
    description: "Розклад груп і викладачів, заміни та поточна пара",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#323a8d",
    lang: "uk",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
