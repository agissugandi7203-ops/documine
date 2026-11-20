import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication",
  description: "Completing your DocuMind authentication session.",
};

export default function AuthCallbackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
