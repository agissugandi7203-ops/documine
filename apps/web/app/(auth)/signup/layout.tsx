import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create your DocuMind account to organize files and analyze documents with AI.",
  openGraph: {
    title: "Create Account | DocuMind",
    description: "Create your DocuMind account to organize files and analyze documents with AI.",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Create Account | DocuMind",
    description: "Create your DocuMind account to organize files and analyze documents with AI.",
    images: ["/twitter-image"],
  },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
