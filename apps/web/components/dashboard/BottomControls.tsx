"use client";

import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { NAV_ITEMS, PRESET_STEPS, type DashboardSectionId } from "./types";

interface BottomControlsProps {
  activeNavId: DashboardSectionId;
  ingestionProgress: number;
  ingestionLabel: string;
  storageProgress: number;
  storageLabel: string;
  activeStep: number;
  minimized: boolean;
  onToggleMinimize: () => void;
  containerRef?: React.RefObject<HTMLElement | null>;
  onSelectStep: (step: number) => void;
  onRefreshProgress: () => void;
}

const TOTAL_SEGMENTS = 14;

/**
 * Tactile precision meter & segmented equalizer card inspired by
 * modern hardware dashboards and Verification Stats' dotted gauge.
 */
export function BottomControls({
  ingestionProgress,
  storageLabel,
  activeStep,
  minimized,
  onToggleMinimize,
  containerRef,
  onSelectStep,
  onRefreshProgress,
}: BottomControlsProps) {
  const safeIngestion = Math.max(
    0,
    Math.min(100, Math.round(ingestionProgress))
  );
  const activeSegments = Math.max(
    1,
    Math.round((safeIngestion / 100) * TOTAL_SEGMENTS)
  );

  return (
    <section
      ref={containerRef}
      className={`db-progress-card ${
        minimized ? "db-progress-card--minimized" : ""
      }`}
      aria-label="Workspace Progress"
    >
      <div className="db-progress-header">
        <button
          type="button"
          className="db-controls-header-pill"
          aria-label="Refresh workspace progress"
          onClick={onRefreshProgress}
        >
          <span className="db-progress-dot-live" aria-hidden="true" />
          <span>Progress</span>
        </button>

        <div className="db-progress-header-right">
          <span className="db-progress-ratio-pill">
            <strong>{safeIngestion}%</strong> · {storageLabel}
          </span>
          <button
            type="button"
            className="db-inline-collapse-btn"
            aria-label={minimized ? "Expand progress" : "Minimize progress"}
            onClick={onToggleMinimize}
          >
            {minimized ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          <div
            className="db-seg-bars"
            role="progressbar"
            aria-valuenow={safeIngestion}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Pipeline readiness progress"
          >
            {Array.from({ length: TOTAL_SEGMENTS }).map((_, idx) => {
              const filled = idx < activeSegments;
              return (
                <span
                  key={idx}
                  className={`db-seg-bar ${
                    filled ? "db-seg-bar--filled" : ""
                  }`}
                />
              );
            })}
          </div>

          <div
            className="db-step-track"
            role="group"
            aria-label="Section Steps"
          >
            {PRESET_STEPS.map((step) => {
              const isActive = activeStep === step;
              const navTarget = NAV_ITEMS[step];
              return (
                <button
                  key={step}
                  type="button"
                  className={`db-step-seg ${
                    isActive ? "db-step-seg--active" : ""
                  }`}
                  aria-label={
                    navTarget ? navTarget.label : `Step ${step + 1}`
                  }
                  aria-pressed={isActive}
                  data-tooltip={
                    navTarget ? navTarget.label : `Step ${step + 1}`
                  }
                  onClick={() => onSelectStep(step)}
                />
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
