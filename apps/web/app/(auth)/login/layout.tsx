import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your DocuMind workspace and document intelligence hub.",
  openGraph: {
    title: "Log in | DocuMind",
    description: "Log in to your DocuMind workspace and document intelligence hub.",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Log in | DocuMind",
    description: "Log in to your DocuMind workspace and document intelligence hub.",
    images: ["/twitter-image"],
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
