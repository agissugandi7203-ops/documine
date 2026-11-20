import type { Metadata, Viewport } from "next";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  getMetadataBase,
} from "@/lib/site-metadata";
import "./globals.css";
import "./site.mobile.css";

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  applicationName: SITE_NAME,
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "DocuMind",
    "Document Intelligence",
    "AI PDF Analysis",
    "Grounded RAG",
    "Knowledge Graph",
    "SQL Analytics",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  icons: {
    icon: [
      { url: "/icon", type: "image/png", sizes: "64x64" },
      { url: "/assets/documind-mark.svg", type: "image/svg+xml" },
    ],
    shortcut: ["/icon"],
    apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: SITE_TITLE,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/twitter-image",
        width: 1200,
        height: 630,
        alt: SITE_TITLE,
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f3f2ee",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        suppressHydrationWarning
        className="bg-black text-white antialiased overflow-x-hidden overflow-y-auto"
      >
        {children}
      </body>
    </html>
  );
}
