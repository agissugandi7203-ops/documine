import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Request a password reset link for your DocuMind account.",
  openGraph: {
    title: "Forgot Password | DocuMind",
    description: "Request a password reset link for your DocuMind account.",
    images: ["/opengraph-image"],
  },
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
