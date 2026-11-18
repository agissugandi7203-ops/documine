"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { getCurrentUser } from "@/lib/supabase";
import { FeatureMosaicSection } from "@/components/landing/FeatureMosaicSection";

// LED Dot Glyphs (7 rows each)
const GLYPHS: Record<string, string[]> = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["010", "110", "010", "010", "010", "010", "111"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  ".": ["0", "0", "0", "0", "0", "0", "1"],
  "I": ["111", "010", "010", "010", "010", "010", "111"],
  "a": ["00000", "00000", "01110", "00001", "01111", "10001", "01111"],
  "e": ["00000", "00000", "01110", "10001", "11111", "10000", "01110"],
  "g": ["00000", "00000", "01111", "10001", "01111", "00001", "01110"],
  "i": ["1", "0", "1", "1", "1", "1", "1"],
  "l": ["10", "10", "10", "10", "10", "10", "01"],
  "n": ["00000", "00000", "11110", "10001", "10001", "10001", "10001"],
  "t": ["010", "010", "111", "010", "010", "010", "001"],
  "r": ["00000", "00000", "10110", "11001", "10000", "10000", "10000"],
};

function renderDotSvg(text: string, isWord: boolean, isContext: boolean) {
  const pitchX = isWord ? 4 : 5;
  const pitchY = 4;
  const gap = 1;
  const dotRadius = isWord ? 1.8 : isContext ? 2.32 : 1.55;

  let curX = 0;
  const circles: React.ReactNode[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const glyph = GLYPHS[char];
    if (!glyph) {
      curX += 3 * pitchX;
      continue;
    }
    const cols = glyph[0].length;
    for (let y = 0; y < 7; y++) {
      const rowStr = glyph[y];
      for (let c = 0; c < rowStr.length; c++) {
        if (rowStr[c] === "1") {
          const cx = (curX + c * pitchX + 1.55).toFixed(2);
          const cy = (y * pitchY + 1.55).toFixed(2);
          circles.push(
            <circle key={`${i}-${y}-${c}`} cx={cx} cy={cy} r={dotRadius} />
          );
        }
      }
    }
    curX += cols * pitchX + gap;
  }

  const totalW = curX - gap;
  return (
    <svg className="dot-svg" viewBox={`0 0 ${totalW} 28`} aria-hidden="true">
      {circles}
    </svg>
  );
}

interface StatItem {
  icon: string;
  target: number;
  decimals: number;
  suffix: string;
  label: string;
  delay: string;
}

const STATS_DATA: StatItem[] = [
  { icon: "<", target: 120, decimals: 0, suffix: "ms", label: "Inference Time", delay: "0.5s" },
  { icon: "%", target: 99.99, decimals: 2, suffix: "%", label: "Platform Uptime", delay: "0.58s" },
  { icon: "*", target: 24, decimals: 0, suffix: "/7", label: "Autonomous Runtime", delay: "0.66s" },
  { icon: "#", target: 2.4, decimals: 1, suffix: "M", label: "Context Windows", delay: "0.74s" },
];

// Precompute static dot-matrix and gauge SVGs once instead of rebuilding every render
const DOT_WORD_INTELLIGENT = renderDotSvg("Intelligent", true, false);
const DOT_NUM_118 = renderDotSvg("118", false, false);
const DOT_NUM_2_4 = renderDotSvg("2.4", false, true);
const DOT_NUM_16 = renderDotSvg("16", false, false);

const GAUGE_TICKS = Array.from({ length: 23 }, (_, i) => {
  const angle = ((190 + i * 5) * Math.PI) / 180;
  const outer = 142;
  const inner = i % 5 === 0 ? 129 : 133;
  const sw = i % 5 === 0 ? 1.5 : 1;
  const x1 = (163 + outer * Math.cos(angle)).toFixed(2);
  const y1 = (163 + outer * Math.sin(angle)).toFixed(2);
  const x2 = (163 + inner * Math.cos(angle)).toFixed(2);
  const y2 = (163 + inner * Math.sin(angle)).toFixed(2);
  return (
    <line
      key={i}
      className="tick"
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke="rgba(255,188,210,.34)"
      strokeWidth={sw}
      strokeLinecap="round"
    />
  );
});

/** Isolated count-up stats footer so 60fps animation frames never re-render the full page. */
function HeroStatsFooter() {
  const [statValues, setStatValues] = useState<string[]>(
    STATS_DATA.map((s) => (0).toFixed(s.decimals))
  );
  const statsFooterRef = useRef<HTMLElement>(null);
  const countStartedRef = useRef(false);

  useEffect(() => {
    const footerEl = statsFooterRef.current;
    if (!footerEl || countStartedRef.current) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      countStartedRef.current = true;
      setStatValues(STATS_DATA.map((s) => s.target.toFixed(s.decimals)));
      return;
    }

    let cancelled = false;
    const timers: number[] = [];
    const rafIds: number[] = [];

    const startCountUp = (
      index: number,
      target: number,
      decimals: number,
      duration: number,
      delay: number
    ) => {
      const tid = window.setTimeout(() => {
        if (cancelled) return;
        const startTime = performance.now();
        const step = (now: number) => {
          if (cancelled) return;
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const ease = 1 - Math.pow(1 - progress, 3);
          const formatted = (
            progress < 1 ? ease * target : target
          ).toFixed(decimals);

          setStatValues((prev) => {
            if (prev[index] === formatted) return prev;
            const next = [...prev];
            next[index] = formatted;
            return next;
          });

          if (progress < 1) {
            rafIds.push(requestAnimationFrame(step));
          }
        };
        rafIds.push(requestAnimationFrame(step));
      }, delay);
      timers.push(tid);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !countStartedRef.current) {
          countStartedRef.current = true;
          STATS_DATA.forEach((stat, i) => {
            startCountUp(i, stat.target, stat.decimals, 1500 + i * 80, 480 + i * 90);
          });
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(footerEl);
    return () => {
      cancelled = true;
      observer.disconnect();
      timers.forEach((id) => window.clearTimeout(id));
      rafIds.forEach((id) => cancelAnimationFrame(id));
    };
  }, []);

  return (
    <footer className="stats-footer" ref={statsFooterRef}>
      <div className="stats-grid">
        {STATS_DATA.map((stat, i) => (
          <div
            key={stat.label}
            className="stat-item anim"
            style={{ "--d": stat.delay } as React.CSSProperties}
          >
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-value">
              <span className="stat-number">{statValues[i]}</span>
              <span className="stat-suffix">{stat.suffix}</span>
            </div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>
    </footer>
  );
}

/** Isolated Contact CTA & toast so typing/submitting never re-renders the landing page. */
function ContactSection() {
  const [contactEmail, setContactEmail] = useState("");
  const [contactSent, setContactSent] = useState(false);
  const [showContactToast, setShowContactToast] = useState(false);
  const contactToastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (contactToastTimerRef.current !== null) {
        window.clearTimeout(contactToastTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      <section className="vexor-section" id="contact">
        <div className="vexor-container">
          <div className="vexor-card">
            <video
              className="vexor-video"
              muted
              loop
              playsInline
              preload="none"
              data-viewport-video="true"
              aria-hidden="true"
            >
              <source
                src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/f6f4ec49-d5dd-4893-8eb4-fa0f932aceaf.mp4"
                type="video/mp4"
              />
            </video>

            <div className="vexor-content">
              <h2 className="vexor-headline">Contact Us</h2>
              <p className="vexor-subhead">
                Ready to deploy Falcon across your workflows and teams?<br />
                Leave your work email and our specialists will reach out directly.
              </p>

              {!contactSent ? (
                <form
                  className="vexor-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!contactEmail.trim()) return;
                    setContactSent(true);
                    setContactEmail("");
                    setShowContactToast(true);
                    if (contactToastTimerRef.current !== null) {
                      window.clearTimeout(contactToastTimerRef.current);
                    }
                    contactToastTimerRef.current = window.setTimeout(() => {
                      setShowContactToast(false);
                      contactToastTimerRef.current = null;
                    }, 3500);
                  }}
                >
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Enter your work email"
                    className="vexor-input"
                    required
                  />
                  <button type="submit" className="vexor-btn">
                    Contact Us
                  </button>
                </form>
              ) : (
                <div className="vexor-sent-pill">
                  <span className="vexor-sent-text">
                    Thanks, we&apos;ll be in touch shortly.
                  </span>
                  <button
                    type="button"
                    className="vexor-sent-ok"
                    onClick={() => setContactSent(false)}
                  >
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path
                        d="M3.5 8.2L6.6 11.2L12.5 5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Send Again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {showContactToast && (
        <div className="vexor-toast" role="status" aria-live="polite">
          <span className="vexor-toast-icon" aria-hidden="true">
            <svg viewBox="0 0 16 16">
              <path
                d="M3.5 8.2L6.6 11.2L12.5 5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span>Message received. Our team will contact you shortly.</span>
        </div>
      )}
    </>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<"home" | "product" | "capabilities" | "contact">("home");
  const lenisRef = useRef<Lenis | null>(null);
  const navLockRef = useRef<{
    id: number;
    section: "home" | "product" | "capabilities" | "contact";
    until: number;
  } | null>(null);
  const navLockSeqRef = useRef(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((user) => {
        if (active) setIsAuthenticated(Boolean(user));
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  // Pause offscreen videos and load below-the-fold videos only near viewport
  useEffect(() => {
    const videos = Array.from(
      document.querySelectorAll<HTMLVideoElement>("video[data-viewport-video]")
    );
    if (videos.length === 0) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || typeof IntersectionObserver === "undefined") {
      videos.forEach((v) => v.pause());
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            if (video.preload === "none") {
              video.preload = "metadata";
            }
            void video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { rootMargin: "240px 0px", threshold: 0.01 }
    );

    videos.forEach((v) => observer.observe(v));
    return () => observer.disconnect();
  }, []);

  // rAF-throttled scroll tracker with cached DOM targets and functional bailouts
  useEffect(() => {
    const stageEl = document.getElementById("performance");
    const capEl = document.getElementById("capabilities");
    const contactEl = document.getElementById("contact");
    let rafPending = false;

    const evaluateScroll = () => {
      rafPending = false;
      const y = window.scrollY;
      const nextScrolled = y > 30;
      setScrolled((prev) => (prev === nextScrolled ? prev : nextScrolled));

      const lock = navLockRef.current;
      if (lock) {
        if (Date.now() < lock.until) {
          setActiveSection((prev) => (prev === lock.section ? prev : lock.section));
          return;
        }
        navLockRef.current = null;
      }

      const triggerY = window.innerHeight * 0.38;
      const nearBottom =
        window.innerHeight + y >= document.documentElement.scrollHeight - 80;

      let nextSection: "home" | "product" | "capabilities" | "contact" = "home";
      if (nearBottom || (contactEl && contactEl.getBoundingClientRect().top <= triggerY)) {
        nextSection = "contact";
      } else if (capEl && capEl.getBoundingClientRect().top <= triggerY) {
        nextSection = "capabilities";
      } else if (stageEl && stageEl.getBoundingClientRect().top <= triggerY) {
        nextSection = "product";
      }

      setActiveSection((prev) => (prev === nextSection ? prev : nextSection));
    };

    const handleScroll = () => {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(evaluateScroll);
    };

    const clearLockOnManualInput = () => {
      navLockRef.current = null;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("wheel", clearLockOnManualInput, { passive: true });
    window.addEventListener("touchmove", clearLockOnManualInput, { passive: true });
    evaluateScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("wheel", clearLockOnManualInput);
      window.removeEventListener("touchmove", clearLockOnManualInput);
    };
  }, []);

  // Desktop-only Lenis smooth scroll (disabled for touch & reduced-motion users)
  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const isMobile =
      window.innerWidth <= 768 ||
      "ontouchstart" in window ||
      (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0);

    if (isMobile || prefersReducedMotion) return;

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      touchMultiplier: 1.5,
    });
    lenisRef.current = lenis;

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenisRef.current = null;
      lenis.destroy();
    };
  }, []);

  const handleSectionLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    targetId: string,
    sectionKey: "home" | "product" | "capabilities" | "contact"
  ) => {
    e.preventDefault();
    setMenuOpen(false);
    setActiveSection(sectionKey);

    const lockId = ++navLockSeqRef.current;
    navLockRef.current = { id: lockId, section: sectionKey, until: Date.now() + 2000 };

    const targetEl = document.getElementById(targetId);
    if (!targetEl) return;

    const releaseLock = () => {
      if (navLockRef.current?.id === lockId) {
        navLockRef.current = null;
      }
      setActiveSection(sectionKey);
    };

    if (lenisRef.current) {
      lenisRef.current.scrollTo(targetEl, {
        offset: 0,
        duration: 1.0,
        force: true,
        onComplete: releaseLock,
      });
    } else {
      window.addEventListener("scrollend", releaseLock, { once: true });
      targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${targetId}`);
    }
  };

  // Mobile menu keyboard & resize listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const handleResize = () => {
      if (window.innerWidth > 720) setMenuOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <>
      {/* SVG Global Filters (static blurs & gradients only; no expensive per-frame noise) */}
      <svg className="filter-defs" width="0" height="0" aria-hidden="true">
        <defs>

          <filter id="radarSoft">
            <feGaussianBlur stdDeviation="1.35" />
          </filter>
          <filter id="radarHalo">
            <feGaussianBlur stdDeviation="5.2" />
          </filter>
          <filter id="gaugeBlur">
            <feGaussianBlur stdDeviation="11" />
          </filter>
          <filter id="tileSoft">
            <feGaussianBlur stdDeviation="3.4" />
          </filter>
          <filter id="groutSoft">
            <feGaussianBlur stdDeviation="6.5" />
          </filter>

          <linearGradient
            id="gaugeArc"
            gradientUnits="userSpaceOnUse"
            x1="7"
            y1="136"
            x2="312"
            y2="109"
          >
            <stop offset="0" stopColor="#ff9ab7" stopOpacity="0.06" />
            <stop offset="0.08" stopColor="#ff8caf" stopOpacity="0.44" />
            <stop offset="0.34" stopColor="#ff6796" stopOpacity="0.94" />
            <stop offset="0.58" stopColor="#ff6796" stopOpacity="1" />
            <stop offset="0.82" stopColor="#ffe7ed" stopOpacity="0.74" />
            <stop offset="0.94" stopColor="#fff8fa" stopOpacity="0.28" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>

          <linearGradient
            id="gaugeShadow"
            gradientUnits="userSpaceOnUse"
            x1="11"
            y1="136"
            x2="308"
            y2="110"
          >
            <stop offset="0" stopColor="#6e1639" stopOpacity="0.04" />
            <stop offset="0.09" stopColor="#6e1639" stopOpacity="0.17" />
            <stop offset="0.52" stopColor="#72163d" stopOpacity="0.18" />
            <stop offset="0.78" stopColor="#7b1a43" stopOpacity="0.1" />
            <stop offset="1" stopColor="#7b1a43" stopOpacity="0" />
          </linearGradient>

          <radialGradient
            id="radarBeam"
            cx="163"
            cy="163"
            r="145"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0.3" stopColor="#650f35" stopOpacity="0" />
            <stop offset="0.45" stopColor="#650f35" stopOpacity="0.025" />
            <stop offset="0.7" stopColor="#650f35" stopOpacity="0.065" />
            <stop offset="0.9" stopColor="#650f35" stopOpacity="0.08" />
            <stop offset="1" stopColor="#650f35" stopOpacity="0.05" />
          </radialGradient>

          <linearGradient
            id="radarBeamEdge"
            gradientUnits="userSpaceOnUse"
            x1="238"
            y1="33"
            x2="190.5"
            y2="115.4"
          >
            <stop offset="0" stopColor="#ffe7ef" stopOpacity="0.19" />
            <stop offset="0.48" stopColor="#ffd1df" stopOpacity="0.11" />
            <stop offset="0.82" stopColor="#ffc6d7" stopOpacity="0.045" />
            <stop offset="1" stopColor="#ffc6d7" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="tTLf" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#d4b0ee" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#c6bbff" stopOpacity="0.18" />
          </linearGradient>

          <linearGradient id="tTCf" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#d5c2ff" stopOpacity="0.22" />
            <stop offset="35%" stopColor="#e0bdff" stopOpacity="0.26" />
            <stop offset="70%" stopColor="#f2a0ee" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#ff96da" stopOpacity="0.34" />
          </linearGradient>

          <linearGradient id="tTRf" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffe8da" stopOpacity="0.56" />
            <stop offset="50%" stopColor="#f9c6d0" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#eba4bf" stopOpacity="0.08" />
          </linearGradient>

          <linearGradient id="tMRf" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e858b8" stopOpacity="0.52" />
            <stop offset="50%" stopColor="#e6459c" stopOpacity="0.46" />
            <stop offset="100%" stopColor="#de74ba" stopOpacity="0.16" />
          </linearGradient>
        </defs>
      </svg>

      {/* =========================================================
          SECTION 1: HERO ("Intelligence Designed To Evolve")
          ========================================================= */}
      <section className="hero-wrapper" id="home">
        <div className="hero-bg">
          <video
            className="hero-video"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            data-viewport-video="true"
          >
            <source
              src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260809_012548_ef22562c-c0ae-4816-ad9d-f8922af4e6a7.mp4"
              type="video/mp4"
            />
          </video>
        </div>

        <div className="hero-page">
          {/* Hero Content */}
          <main className="hero-main">
            <div className="trust-row anim" style={{ "--d": "0.05s" } as React.CSSProperties}>
              <div className="trust-avatars">
                <div className="trust-avatar avatar-1">
                  <div className="trust-inner" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                      <path d="M2 2h9.5v9.5H2V2zm10.5 0H22v9.5h-9.5V2zM2 12.5h9.5V22H2v-9.5zm10.5 0H22V22h-9.5v-9.5z" />
                    </svg>
                  </div>
                </div>
                <div className="trust-avatar avatar-2">
                  <div className="trust-inner" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                      <path d="M13.96 13.73c-.75.56-1.84.86-2.78.86-1.31 0-2.49-.49-3.38-1.3-.07-.06-.01-.15.08-.1 1 .58 2.24.93 3.52.93.86 0 1.81-.18 2.68-.55.13-.06.24.09.12.18l-.24-.02zm.66-.76c-.1-.12-.64-.06-.88-.03-.07.01-.09-.05-.02-.1.43-.3 1.14-.22 1.22-.11.08.11-.02.82-.43 1.16-.06.05-.12.02-.09-.05.09-.23.3-.75.2-.87zM12.9 7.8c0-.76.02-1.4-.37-2.08-.31-.54-.81-.87-1.36-.87-.75 0-1.2.58-1.2 1.43 0 1.68 1.5 1.98 2.93 1.98v-.46zm1.98 4.8c-.13.12-.32.13-.47.05-.66-.55-.78-.81-1.14-1.33-1.09 1.11-1.86 1.44-3.27 1.44-1.67 0-2.97-1.03-2.97-3.09 0-1.61.87-2.71 2.11-3.25 1.07-.47 2.57-.56 3.72-.69v-.26c0-.47.04-1.03-.24-1.44-.24-.37-.7-.52-1.11-.52-.75 0-1.42.39-1.59 1.19-.03.18-.16.35-.34.36l-1.91-.21c-.16-.04-.34-.16-.29-.41C7.82 3.21 9.65 2.4 11.4 2.4c.96 0 2.21.25 2.96.98.96.89.86 2.08.86 3.38v3.06c0 .92.38 1.32.74 1.82.13.18.16.39-.01.53l-1.07.93z" />
                    </svg>
                  </div>
                </div>
                <div className="trust-avatar avatar-3">
                  <div className="trust-inner" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                      <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="trust-pill"><span>Trusted by 2000+ Enterprises</span></div>
            </div>

            <h1 className="headline anim">
              <span className="line">Intelligence</span>
              <span className="line">Designed To Evolve</span>
            </h1>

            <p className="subhead anim" style={{ "--d": "0.28s" } as React.CSSProperties}>
              Build applications that reason, adapt and collaborate using a modular AI platform designed for production.
            </p>

            <div className="cta-wrapper anim-pulse" style={{ "--d": "0.4s" } as React.CSSProperties}>
              <a
                href="#performance"
                className="cta-btn"
                onClick={(e) => handleSectionLinkClick(e, "performance", "product")}
              >
                Get Started
              </a>
            </div>
          </main>

          <HeroStatsFooter />
        </div>
      </section>

      {/* =========================================================
          SECTION 2: STAGE ("Built for Intelligent Performance")
          ========================================================= */}
      <section className="stage" id="performance">
        <header className="masthead">
          <h2 className="stage-headline">
            <span className="stage-headline__line">
              Built for{" "}
              <span className="dot-word" aria-label="Intelligent">
                {DOT_WORD_INTELLIGENT}
              </span>
            </span>
            <span className="stage-headline__line">Performance</span>
          </h2>
          <p className="intro">
            Every capability is engineered for speed, scale and
            <br className="desktop-break" /> contextual understanding, giving
            your AI the foundation
            <br className="desktop-break" /> to reason, adapt and perform in
            production.
          </p>
        </header>

        <div className="cards" aria-label="Performance capabilities">
          {/* Card 1: Speed */}
          <article className="card card--speed">
            <video
              className="card__media"
              muted
              loop
              playsInline
              preload="none"
              data-viewport-video="true"
              aria-hidden="true"
              poster="https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/167977c6-8539-46b1-9a15-8dba566f50b8.png"
              src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260826_130045_1a612b69-4854-4b34-8043-ccb91f2c60af.mp4"
            />
            <div className="card__grain" aria-hidden="true" />
            <h3 className="card__title">
              Inference Speed<br />AI Response Latency
            </h3>

            <svg className="gauge" viewBox="0 0 326 326" aria-hidden="true">
              <path d="M11.34 136.26A154 154 0 0 1 307.71 110.33" fill="none" strokeWidth="3.2" strokeLinecap="round" stroke="url(#gaugeShadow)" />
              <path d="M6.91 135.48A158.5 158.5 0 0 1 311.94 108.79" fill="none" strokeWidth="2.2" strokeLinecap="round" stroke="url(#gaugeArc)" />
              <path d="M19.22 137.65A146 146 0 0 1 236 36.56" fill="none" strokeWidth="1.15" stroke="rgba(255,166,194,.31)" />
              <path d="M238 33.1A150 150 0 0 1 277.9 66.6L199.8 119.5A55 55 0 0 0 190.5 115.4Z" fill="#6a1238" opacity="0.022" filter="url(#radarHalo)" />
              <path d="M238 33.1A150 150 0 0 1 277.9 66.6L199.8 119.5A55 55 0 0 0 190.5 115.4Z" fill="url(#radarBeam)" filter="url(#radarSoft)" />
              <path d="M238 33.1L190.5 115.4" stroke="url(#radarBeamEdge)" strokeWidth="1.25" strokeLinecap="round" filter="url(#radarSoft)" />
              <g id="gaugeTicks">{GAUGE_TICKS}</g>
              <ellipse cx="225" cy="166" rx="92" ry="76" fill="#fff" opacity="0.055" filter="url(#gaugeBlur)" />
            </svg>

            <div className="metric">
              <div className="dot-number">{DOT_NUM_118}</div>
              <span className="metric__unit">ms</span>
            </div>

            <p className="caption">Average global<br />response</p>
            <Link href="/login" className="learn-more">Learn More</Link>
          </article>

          {/* Card 2: Context */}
          <article className="card card--context">
            <video
              className="card__media"
              muted
              loop
              playsInline
              preload="none"
              data-viewport-video="true"
              aria-hidden="true"
              poster="https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/0446d1d5-e65e-4db5-8090-3e30d09afc43.png"
              src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260826_130054_dd005674-d693-4d81-80a5-357f7f10b3a3.mp4"
            />
            <div className="card__grain" aria-hidden="true" />
            <h3 className="card__title">
              Context Window<br />Long-form Understanding
            </h3>

            <svg className="context-backdrop" viewBox="0 0 429 554" preserveAspectRatio="none" aria-hidden="true">
              <g filter="url(#tileSoft)">
                <rect x="-24" y="22" width="106" height="149" rx="15" fill="url(#tTLf)" />
                <rect x="88" y="22" width="247" height="150" rx="15" fill="url(#tTCf)" />
                <rect x="346" y="22" width="111" height="147" rx="15" fill="url(#tTRf)" />
                <rect x="-24" y="177" width="108" height="174" rx="15" fill="rgba(218,211,255,0.25)" />
                <rect x="88" y="177" width="247" height="174" rx="15" fill="rgba(239,177,208,0.2)" />
                <rect x="344" y="175" width="113" height="176" rx="15" fill="url(#tMRf)" />
              </g>
              <g filter="url(#groutSoft)" fill="rgba(103,41,148,0.18)">
                <rect x="81" y="30" width="8" height="150" />
                <rect x="338" y="30" width="8" height="322" />
                <rect x="0" y="167" width="429" height="12" />
              </g>
            </svg>

            <div className="context-window">
              <div className="window-lines">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>

            <div className="metric metric--context">
              <div className="dot-number">{DOT_NUM_2_4}</div>
              <span className="metric__unit">M</span>
            </div>

            <p className="caption">Tokens processed<br />simultaneously</p>
            <Link href="/login" className="learn-more">Learn More</Link>
          </article>

          {/* Card 3: Connections */}
          <article className="card card--connections">
            <video
              className="card__media"
              muted
              loop
              playsInline
              preload="none"
              data-viewport-video="true"
              aria-hidden="true"
              poster="https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/da8d0242-4dee-4f6d-813f-a5887e86ad77.png"
              src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260826_130103_7550f407-f14b-40a6-9616-7a26d7a8bd9f.mp4"
            />
            <div className="card__grain" aria-hidden="true" />
            <h3 className="card__title">
              Intelligent Connections<br />Cross-Source Context
            </h3>

            <div className="connections-map">
              <svg viewBox="0 0 429 238" preserveAspectRatio="none" aria-hidden="true">
                <path opacity="0.20" fill="none" stroke="#fff" strokeWidth="1" d="M0 5H128c27 0 36 7 39 26 2 16 9 22 24 22h106c16 0 23-8 25-25 2-16 10-23 31-23h76" />
                <path opacity="0.30" fill="none" stroke="#fff" strokeWidth="1" d="M0 117h46c15 0 22 8 26 25 5 23 12 31 31 31h174c18 0 25-8 30-31 4-17 11-25 26-25h96" />
                <path opacity="0.34" fill="none" stroke="#fff" strokeWidth="1" d="M0 173h87c15 0 22 7 27 25 4 15 11 22 28 22h140c17 0 25-7 29-22 5-18 12-25 28-25h90" />
                <path opacity="0.16" fill="none" stroke="#fff" strokeWidth="1" d="M0 228h120c17 0 25-5 28-18 4-15 10-20 28-20h81c18 0 25 6 28 20 4 13 11 18 28 18h116" />
                <path opacity="0.26" fill="none" stroke="#fff" strokeWidth="1" d="M0 5H429M0 61H429M0 117H429" />
                <path opacity="0.09" fill="none" stroke="#fff" strokeWidth="1" d="M0 173H429" />

                <path opacity="0.52" fill="none" stroke="#fff8dd" strokeWidth="1.15" d="M0 61h95c14 0 22-6 27-20 4-13 12-20 27-20h115c15 0 23 6 27 20 5 14 13 20 28 20h110" />
                <path opacity="0.94" fill="none" stroke="#fff8dd" strokeWidth="1.15" d="M0 117h88c15 0 22-8 25-25 4-24 12-31 31-31h129c20 0 27 7 31 31 3 17 10 25 26 25h99" />

                <circle cx="45" cy="117" r="6.5" fill="#fff" />
                <circle cx="133" cy="61" r="6.5" fill="#fff4a7" />
                <circle cx="189" cy="61" r="6.5" fill="#fff1a4" />
                <circle cx="319" cy="61" r="6.5" fill="#fff4a6" />
                <circle cx="319" cy="117" r="6.5" fill="#fff2a0" />
              </svg>
            </div>

            <div className="metric metric--connections">
              <div className="dot-number">{DOT_NUM_16}</div>
              <span className="metric__unit">K</span>
            </div>

            <p className="caption">Connected data<br />sources</p>
            <Link href="/login" className="learn-more">Learn More</Link>
          </article>
        </div>
      </section>

      <FeatureMosaicSection />

      {/* =========================================================
          SECTION 3: CONTACT US CTA
          ========================================================= */}
      <ContactSection />

      {/* =========================================================
          SECTION 4: PROFESSIONAL DARK FOOTER
          ========================================================= */}
      <footer className="falcon-footer" aria-label="Site Footer">
        <div className="falcon-footer-inner">
          <div className="falcon-footer-top">
            <div className="falcon-footer-brand">
              <a
                href="#home"
                className="falcon-footer-brand-link"
                onClick={(e) => handleSectionLinkClick(e, "home", "home")}
              >
                <img
                  src="/assets/logo.webp"
                  alt=""
                  width={38}
                  height={38}
                  className="falcon-footer-logo"
                />
                <span className="falcon-footer-brand-name">FALCON</span>
              </a>
              <p className="falcon-footer-tagline">
                Autonomous intelligence engineered for high-speed execution,
                enterprise scale, and connected workflows.
              </p>
            </div>

            <div className="falcon-footer-cols">
              <div className="falcon-footer-col">
                <h3 className="falcon-footer-col-title">PRODUCT</h3>
                <ul className="falcon-footer-list">
                  <li>
                    <a
                      href="#home"
                      className="falcon-footer-link"
                      onClick={(e) => handleSectionLinkClick(e, "home", "home")}
                    >
                      Overview
                    </a>
                  </li>
                  <li>
                    <a
                      href="#performance"
                      className="falcon-footer-link"
                      onClick={(e) => handleSectionLinkClick(e, "performance", "product")}
                    >
                      Performance
                    </a>
                  </li>
                  <li>
                    <a
                      href="#capabilities"
                      className="falcon-footer-link"
                      onClick={(e) => handleSectionLinkClick(e, "capabilities", "capabilities")}
                    >
                      Capabilities
                    </a>
                  </li>
                </ul>
              </div>

              <div className="falcon-footer-col">
                <h3 className="falcon-footer-col-title">PLATFORM</h3>
                <ul className="falcon-footer-list">
                  <li><Link href="/login" className="falcon-footer-link">Sign In</Link></li>
                  <li><Link href="/dashboard" className="falcon-footer-link">Workspace</Link></li>
                  <li>
                    <a
                      href="#contact"
                      className="falcon-footer-link"
                      onClick={(e) => handleSectionLinkClick(e, "contact", "contact")}
                    >
                      Contact Us
                    </a>
                  </li>
                </ul>
              </div>

              <div className="falcon-footer-col">
                <h3 className="falcon-footer-col-title">CONNECT</h3>
                <ul className="falcon-footer-list">
                  <li><a href="mailto:hello@falcon.ai" className="falcon-footer-link">hello@falcon.ai</a></li>
                  <li>
                    <a
                      href="#performance"
                      className="falcon-footer-link"
                      onClick={(e) => handleSectionLinkClick(e, "performance", "product")}
                    >
                      Architecture
                    </a>
                  </li>
                  <li>
                    <a
                      href="#capabilities"
                      className="falcon-footer-link"
                      onClick={(e) => handleSectionLinkClick(e, "capabilities", "capabilities")}
                    >
                      Integrations
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <hr className="falcon-footer-divider" />

          <div className="falcon-footer-bottom">
            <span className="falcon-footer-copy">
              &copy; 2026 Falcon. All Rights Reserved.
            </span>

            <div className="falcon-footer-socials" aria-label="Social and contact links">
              <a
                href="#contact"
                className="falcon-social-btn"
                aria-label="X"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                  />
                </svg>
              </a>
              <a
                href="#contact"
                className="falcon-social-btn"
                aria-label="LinkedIn"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M6.94 8.5H3.56V19.5H6.94V8.5ZM5.25 3.5C4.14 3.5 3.25 4.39 3.25 5.5C3.25 6.6 4.14 7.5 5.25 7.5C6.35 7.5 7.25 6.6 7.25 5.5C7.25 4.39 6.35 3.5 5.25 3.5ZM20.44 13.02C20.44 9.88 18.76 8.22 16.16 8.22C14.37 8.22 13.48 9.2 13.02 9.93V8.5H9.65C9.7 9.48 9.65 19.5 9.65 19.5H13.02V13.36C13.02 13.02 13.05 12.69 13.15 12.45C13.42 11.78 14.03 11.09 15.07 11.09C16.41 11.09 17.06 12.11 17.06 13.6V19.5H20.44V13.02Z"
                  />
                </svg>
              </a>
              <a
                href="#capabilities"
                className="falcon-social-btn"
                aria-label="GitHub"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
              </a>
              <a
                href="mailto:hello@falcon.ai"
                className="falcon-social-btn"
                aria-label="Email"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6.5h16a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 16V8A1.5 1.5 0 0 1 4 6.5Zm0 0 8 6 8-6"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* =========================================================
          FIXED STICKY HEADER (FLOATING ACROSS ALL SECTIONS)
          ========================================================= */}
      <div className={`header-sticky-wrapper ${scrolled ? "scrolled" : ""}`}>
        <header className="header">
          <a
            href="#home"
            className="logo-btn"
            aria-label="Home"
            onClick={(e) => handleSectionLinkClick(e, "home", "home")}
          >
            <img
              src="/assets/logo.webp"
              alt=""
              width={52}
              height={52}
              className="logo-img"
            />
          </a>

          <nav className="nav-pill" aria-label="Main Navigation">
            <a
              href="#home"
              className={`nav-link ${activeSection === "home" ? "active" : ""}`}
              onClick={(e) => handleSectionLinkClick(e, "home", "home")}
            >
              Home
            </a>
            <a
              href="#performance"
              className={`nav-link ${activeSection === "product" ? "active" : ""}`}
              onClick={(e) => handleSectionLinkClick(e, "performance", "product")}
            >
              Product
            </a>
            <a
              href="#capabilities"
              className={`nav-link ${activeSection === "capabilities" ? "active" : ""}`}
              onClick={(e) => handleSectionLinkClick(e, "capabilities", "capabilities")}
            >
              Capabilities
            </a>
            <a
              href="#contact"
              className={`nav-link ${activeSection === "contact" ? "active" : ""}`}
              onClick={(e) => handleSectionLinkClick(e, "contact", "contact")}
            >
              Contact
            </a>
          </nav>

          <Link href={isAuthenticated ? "/dashboard" : "/login"} className="signin-btn">
            {isAuthenticated ? "Dashboard" : "Sign in"}
          </Link>

          <button
            className="burger-btn"
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className="burger-bar"></span>
            <span className="burger-bar"></span>
            <span className="burger-bar"></span>
          </button>
        </header>

        {/* Mobile Menu */}
        {menuOpen && (
          <>
            <div
              className="mobile-overlay open"
              id="mobile-overlay"
              onClick={() => setMenuOpen(false)}
            />
            <div className="mobile-sheet open" id="mobile-menu">
              <nav className="mobile-nav" aria-label="Mobile Navigation">
                <a
                  href="#home"
                  className={`mobile-nav-link ${activeSection === "home" ? "active" : ""}`}
                  onClick={(e) => handleSectionLinkClick(e, "home", "home")}
                >
                  Home
                </a>
                <a
                  href="#performance"
                  className={`mobile-nav-link ${activeSection === "product" ? "active" : ""}`}
                  onClick={(e) => handleSectionLinkClick(e, "performance", "product")}
                >
                  Product
                </a>
                <a
                  href="#capabilities"
                  className={`mobile-nav-link ${activeSection === "capabilities" ? "active" : ""}`}
                  onClick={(e) => handleSectionLinkClick(e, "capabilities", "capabilities")}
                >
                  Capabilities
                </a>
                <a
                  href="#contact"
                  className={`mobile-nav-link ${activeSection === "contact" ? "active" : ""}`}
                  onClick={(e) => handleSectionLinkClick(e, "contact", "contact")}
                >
                  Contact
                </a>
              </nav>
              <Link
                href={isAuthenticated ? "/dashboard" : "/login"}
                className="mobile-signin-btn"
                onClick={() => setMenuOpen(false)}
              >
                {isAuthenticated ? "Dashboard" : "Sign in"}
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}
