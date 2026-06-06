import type { MetadataRoute } from "next";

/**
 * Web app manifest — drives "Add to Home Screen" on iOS/Android.
 * After install, the app opens fullscreen (no Safari chrome) and
 * lands on /today by default.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RVX CRM",
    short_name: "RVX",
    description: "Brokerage operating system for rvparkexchange.com",
    start_url: "/today",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#F7F6F2",
    theme_color: "#26A65B",
    icons: [
      {
        src: "/rvx-logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/rvx-logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
