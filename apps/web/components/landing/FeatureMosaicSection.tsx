"use client";

import { useEffect, useRef, useState } from "react";
import "./feature-mosaic.css";

interface ChartDay {
  day: string;
  label: string;
  heightUnits?: number;
  isSunday?: boolean;
}

const CHART_DAYS: ChartDay[] = [
  { day: "MON", label: "2h", heightUnits: 43.2 },
  { day: "TUE", label: "6h", heightUnits: 80.9 },
  { day: "WED", label: "12h", heightUnits: 131.7 },
  { day: "THU", label: "20h", heightUnits: 165.5 },
  { day: "FRI", label: "31h", heightUnits: 203.2 },
  { day: "SAT", label: "40h", heightUnits: 235.2 },
  { day: "SUN", label: "48h", isSunday: true },
];

type MotionPhase = "idle" | "pending" | "run" | "done";

export function FeatureMosaicSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const hasPlayedRef = useRef(false);
  const [motionPhase, setMotionPhase] = useState<MotionPhase>("idle");

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || hasPlayedRef.current) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || typeof IntersectionObserver === "undefined") {
      setMotionPhase("done");
      return;
    }

    let cancelled = false;
    let raf1 = 0;
    let runTimer: number | undefined;
    let failSafeTimer: number | undefined;

    const finish = () => {
      if (cancelled) return;
      setMotionPhase("done");
      if (failSafeTimer !== undefined) window.clearTimeout(failSafeTimer);
      if (runTimer !== undefined) window.clearTimeout(runTimer);
    };

    const startChoreography = () => {
      failSafeTimer = window.setTimeout(finish, 1800);
      raf1 = window.requestAnimationFrame(() => {
        if (cancelled) return;
        setMotionPhase("run");
        runTimer = window.setTimeout(finish, 1450);
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (hasPlayedRef.current) return;
        const visible = entries.some((entry) => entry.isIntersecting);
        if (!visible) return;
        hasPlayedRef.current = true;
        observer.disconnect();
        startChoreography();
      },
      { rootMargin: "140px 0px", threshold: 0.04 }
    );

    observer.observe(el);

    return () => {
      cancelled = true;
      observer.disconnect();
      if (raf1) window.cancelAnimationFrame(raf1);
      if (failSafeTimer !== undefined) window.clearTimeout(failSafeTimer);
      if (runTimer !== undefined) window.clearTimeout(runTimer);
    };
  }, []);

  const sectionClassName = [
    "fm-section",
    motionPhase === "pending" ? "motion-pending" : "",
    motionPhase === "run" ? "entrance-run" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      ref={sectionRef}
      id="capabilities"
      className={sectionClassName}
      aria-label="Capabilities feature overview"
    >
      <header className="fm-masthead">
        <h2 className="fm-section-headline">
          <span className="fm-section-headline__line">Everything You Need</span>
          <span className="fm-section-headline__line">
            to <span className="fm-section-headline__accent">Analyze</span> Docs
          </span>
        </h2>
        <p className="fm-section-intro">
          Organize file repositories, trace semantic links across your knowledge
          graph, query spreadsheets with SQL, and surface cited answers in seconds.
        </p>
      </header>

      <div className="fm-frame">
        <div className="fm-stage" role="region" aria-label="Product feature overview">
        {/* CARD 1: NOTIFICATION */}
        <article className="fm-card fm-notif" aria-label="Indexing notification">
          <div className="fm-toast-wrap">
            <div className="fm-toast-ledge" aria-hidden="true" />
            <div className="fm-toast">
              <svg
                className="fm-toast-icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="12" fill="#0d0d0d" />
                <path
                  d="M7.8 12.2L10.7 15.1L16.4 9.2"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="fm-toast-copy">
                <p className="fm-toast-title">Indexing completed!</p>
                <p className="fm-toast-sub">
                  Q4 filings indexed with verified citations
                </p>
              </div>
              <span className="fm-toast-time">2:34 PM</span>
            </div>
          </div>
        </article>

        {/* CARD 2: CONNECT YOUR SOURCES */}
        <article className="fm-card fm-connect" aria-label="Integrations">
          <h2>
            Connect your
            <br />
            Sources Now.
          </h2>
          <p className="fm-sub">Sync docs across 120+ repositories</p>

          <div className="fm-chips">
            <div className="fm-chip-row r1">
              <div className="fm-chip">
                <span>Microsoft Teams</span>
                <svg
                  className="fm-chip-icon"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle cx="18.2" cy="7.2" r="2.1" fill="#5059C9" />
                  <path
                    d="M15.2 10.5H20.2C21.1 10.5 21.8 11.2 21.8 12.1V15.5C21.8 17.2 20.4 18.5 18.7 18.5C17 18.5 15.6 17.2 15.6 15.5V10.5Z"
                    fill="#5059C9"
                  />
                  <circle cx="13.8" cy="6.2" r="2.8" fill="#7B83EB" />
                  <path
                    d="M9.4 10H16.8C17.8 10 18.6 10.8 18.6 11.8V16.6C18.6 19 16.7 20.8 14.3 20.8H13.7C11.3 20.8 9.4 19 9.4 16.6V10Z"
                    fill="#7B83EB"
                  />
                  <rect
                    x="2.2"
                    y="6.8"
                    width="10.4"
                    height="10.4"
                    rx="1.6"
                    fill="#4B53BC"
                  />
                  <path
                    d="M5.1 9.5H9.7V10.75H8.05V14.7H6.75V10.75H5.1V9.5Z"
                    fill="#ffffff"
                  />
                </svg>
              </div>
            </div>

            <div className="fm-chip-row r2">
              <div className="fm-chip">
                <span>Notion</span>
                <svg
                  className="fm-chip-icon"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d="M4.6 5.4L16.3 4.5C17.1 4.45 17.7 4.75 18.3 5.2L20.1 6.55C20.5 6.85 20.6 7.1 20.6 7.55V18.8C20.6 19.6 20 20.2 19.2 20.25L7.1 21C6.4 21.05 5.9 20.75 5.5 20.2L3.8 17.95C3.5 17.55 3.4 17.2 3.4 16.75V6.7C3.4 5.95 3.9 5.45 4.6 5.4Z"
                    fill="#ffffff"
                    stroke="#141414"
                    strokeWidth="1.45"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4.2 5.9L6.4 7.75C6.7 8 7.05 8.1 7.45 8.08L19.6 7.3"
                    fill="none"
                    stroke="#141414"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                  />
                  <path
                    d="M9.6 17.3V10.7H11.1L14.9 16.1V10.7H16.25V17.3H14.8L10.95 11.85V17.3H9.6Z"
                    fill="#141414"
                  />
                </svg>
              </div>

              <div className="fm-chip">
                <span>GitHub</span>
                <svg
                  className="fm-chip-icon"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fill="#0d0d0d"
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
              </div>
            </div>

            <div className="fm-chip-row r3">
              <div className="fm-chip">
                <span>Google Drive</span>
                <svg
                  className="fm-chip-icon"
                  viewBox="0 0 87.3 78"
                  aria-hidden="true"
                >
                  <path
                    d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z"
                    fill="#0066da"
                  />
                  <path
                    d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3L1.2 48.5A9.06 9.06 0 0 0 0 53h27.5z"
                    fill="#00ac47"
                  />
                  <path
                    d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 11.5z"
                    fill="#ea4335"
                  />
                  <path
                    d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z"
                    fill="#00832d"
                  />
                  <path
                    d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"
                    fill="#2684fc"
                  />
                  <path
                    d="M73.4 26.5l-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h27.45c0-1.55-.4-3.1-1.2-4.5z"
                    fill="#ffba00"
                  />
                </svg>
              </div>

              <div className="fm-chip">
                <span>Figma</span>
                <svg
                  className="fm-chip-icon"
                  viewBox="0 0 38 57"
                  aria-hidden="true"
                >
                  <path
                    d="M9.5 57a9.5 9.5 0 0 0 9.5-9.5V38H9.5a9.5 9.5 0 0 0 0 19z"
                    fill="#0acf83"
                  />
                  <path
                    d="M0 28.5A9.5 9.5 0 0 1 9.5 19H19v19H9.5A9.5 9.5 0 0 1 0 28.5z"
                    fill="#a259ff"
                  />
                  <path
                    d="M0 9.5A9.5 9.5 0 0 1 9.5 0H19v19H9.5A9.5 9.5 0 0 1 0 9.5z"
                    fill="#f24e1e"
                  />
                  <path
                    d="M19 0h9.5a9.5 9.5 0 1 1 0 19H19V0z"
                    fill="#ff7262"
                  />
                  <path
                    d="M38 28.5A9.5 9.5 0 1 1 28.5 19 9.5 9.5 0 0 1 38 28.5z"
                    fill="#1abcfe"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="fm-chip fm-chip-slack">
            <span>Slack</span>
            <svg
              className="fm-chip-icon"
              viewBox="0 0 122.8 122.8"
              aria-hidden="true"
            >
              <path
                d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z"
                fill="#E01E5A"
              />
              <path
                d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z"
                fill="#36C5F0"
              />
              <path
                d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z"
                fill="#2EB67D"
              />
              <path
                d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z"
                fill="#ECB22E"
              />
            </svg>
          </div>
        </article>

        {/* CARD 3: AUTOMATE YOUR WORK (HERO CENTER) */}
        <article className="fm-card fm-automate" aria-label="Understand your documents">
          <div className="fm-automate-copy">
            <h2>
              <span className="g">Understand</span> your docs.
              <br />
              Focus on decisions.
            </h2>
            <p className="fm-sub">
              Grounded AI synthesis across PDFs, CSVs, and knowledge graphs.
            </p>
          </div>

          <div className="fm-illo" aria-hidden="true">
            <div className="fm-win fm-win-back">
              <div className="fm-win-bar">
                <span className="fm-win-dot" />
                <span className="fm-win-dot" />
                <span className="fm-win-dot" />
              </div>
              <div className="fm-win-body">
                <div className="fm-win-strip" />
              </div>
            </div>

            <div className="fm-win fm-win-front">
              <div className="fm-win-bar">
                <span className="fm-win-dot" />
                <span className="fm-win-dot" />
                <span className="fm-win-dot" />
              </div>
              <div className="fm-win-body">
                <div className="fm-win-strip" />
              </div>
            </div>

            <div className="fm-pill-wf">
              <span className="fm-tick">
                <svg viewBox="0 0 14 14" aria-hidden="true">
                  <path
                    d="M3 7.2L5.8 10L11 4.4"
                    fill="none"
                    stroke="#161616"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span>Citations Verified</span>
            </div>

            <div className="fm-pill-ai">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect
                  x="4"
                  y="3.5"
                  width="13"
                  height="16.5"
                  rx="2.6"
                  fill="#eff4e6"
                  stroke="#4f7433"
                  strokeWidth="2"
                />
                <path
                  d="M7.5 8.5H13.5M7.5 12H12M7.5 15.5H10.5"
                  fill="none"
                  stroke="#4f7433"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                />
                <circle cx="17.5" cy="17.5" r="3.2" fill="#eff4e6" stroke="#4f7433" strokeWidth="2" />
              </svg>
              <div className="fm-skel-lines">
                <div className="fm-skel-line" />
                <div className="fm-skel-line short" />
              </div>
            </div>

            <svg
              className="fm-cursor"
              viewBox="0 0 24 28"
              aria-hidden="true"
            >
              <path
                d="M4.2 2.4L4.2 22.8L9.6 17.5L13.3 25.1L16.5 23.6L12.8 16.1L19.8 16.1L4.2 2.4Z"
                fill="#ffffff"
                stroke="#2b2b2b"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </article>

        {/* CARD 4: PRODUCTIVITY INSIGHTS */}
        <article
          className="fm-card fm-insights"
          aria-label="Productivity insights"
        >
          <span className="fm-tag">Research Velocity</span>
          <h2>48 hours</h2>
          <p className="fm-sub">saved this week!</p>

          <div
            className="fm-chart"
            aria-label="Hours saved per day: Monday 2, Tuesday 6, Wednesday 12, Thursday 20, Friday 31, Saturday 40, Sunday 48"
          >
            {CHART_DAYS.map((item) => (
              <div className="fm-bar-col" key={item.day}>
                <div
                  className={item.isSunday ? "fm-bar fm-bar--sun" : "fm-bar"}
                  style={
                    item.heightUnits !== undefined
                      ? { height: `calc(${item.heightUnits} * var(--u))` }
                      : undefined
                  }
                >
                  <span>{item.label}</span>
                </div>
                <span className="fm-bar-day">{item.day}</span>
              </div>
            ))}
          </div>
        </article>

        {/* CARD 5: SEARCH */}
        <article className="fm-card fm-search" aria-label="Search">
          <h2>
            Find anything
            <br />
            instantly
          </h2>
          <div className="fm-bar-search">
            <span className="fm-search-circle" aria-hidden="true">
              <svg viewBox="0 0 22 22">
                <circle
                  cx="9.6"
                  cy="9.6"
                  r="7.1"
                  fill="none"
                  stroke="#121212"
                  strokeWidth="2.2"
                />
                <path
                  d="M15.1 15.1L19.8 19.8"
                  fill="none"
                  stroke="#121212"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span className="fm-search-ph">
              Search files, topics, citations...
            </span>
            <svg
              className="fm-mic"
              viewBox="0 0 16 20"
              aria-hidden="true"
            >
              <rect x="5" y="1.5" width="6" height="9.5" rx="3" fill="#141414" />
              <path
                d="M2.5 9.5C2.5 12.54 4.96 15 8 15C11.04 15 13.5 12.54 13.5 9.5"
                fill="none"
                stroke="#141414"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M8 15V18.2M5.2 18.2H10.8"
                fill="none"
                stroke="#141414"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </article>
        </div>
      </div>
    </section>
  );
}
