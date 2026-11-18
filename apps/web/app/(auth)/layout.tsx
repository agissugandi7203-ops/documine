import React from "react";
import { SignalAuthShell } from "@/components/SignalAuthShell";

export default function AuthGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SignalAuthShell>{children}</SignalAuthShell>;
}
