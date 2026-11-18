import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Signal — Authentication",
  description: "Completing your authentication session.",
};

export default function AuthCallbackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
