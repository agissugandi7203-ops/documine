"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LOGIN_HERO_POSTER_URI } from "@/lib/login-poster";
import "@/app/login/login.css";

interface SignalAuthShellProps {
  children: React.ReactNode;
}

export function SignalAuthShell({ children }: SignalAuthShellProps) {
  const pathname = usePathname();
  const isSignup = pathname === "/signup";

  return (
    <div className="signal-stage">
      <section className="signal-photo" aria-hidden="true">
        <video
          className="photo-img"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={LOGIN_HERO_POSTER_URI}
        >
          <source src="/login-hero.mp4" type="video/mp4" />
        </video>
        <div className="scrim" />
        <div className="signal-hero">
          <div className="hl-wrap">
            <span className="hl" id="hl1">
              Find Signal to Action
            </span>
            <span className="hl" id="hl2">
              Instantly
            </span>
          </div>
        </div>
      </section>

      <div className="signal-topbar">
        <Link href="/" className="signal-brand-pill" aria-label="Signal Home">
          <span className="signal-brand-badge" aria-hidden="true">
            <img
              src="/assets/logo.webp"
              alt=""
              width={18}
              height={18}
              className="signal-brand-img"
            />
          </span>
          <span className="signal-brand-name">Signal</span>
        </Link>

        <Link href="/" className="signal-back-btn" aria-label="Back to home">
          <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
          <span>Back</span>
        </Link>
      </div>

      <main className={`signal-card${isSignup ? " signal-card--signup" : ""}`}>
        <div className="signal-card-in">{children}</div>
      </main>
    </div>
  );
}
