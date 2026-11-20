import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Choose a new password for your DocuMind account.",
  openGraph: {
    title: "Reset Password | DocuMind",
    description: "Choose a new password for your DocuMind account.",
    images: ["/opengraph-image"],
  },
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
