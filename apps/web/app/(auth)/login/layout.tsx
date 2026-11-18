import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Signal — Log in",
  description: "Log in to continue monitoring your signals.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
