import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Signal — Reset Password",
  description: "Choose a new password for your Signal account.",
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
