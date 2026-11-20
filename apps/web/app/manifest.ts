import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site-metadata";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} - AI Document Intelligence Workspace`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#f3f2ee",
    theme_color: "#18181b",
    icons: [
      {
        src: "/icon",
        sizes: "64x64",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/assets/documind-mark.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
