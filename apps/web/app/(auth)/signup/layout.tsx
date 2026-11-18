import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Signal — Create Account",
  description: "Create your Signal account to get started.",
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
