"use client";

import React from "react";
import { NAV_ITEMS, PRESET_STEPS, type DashboardSectionId } from "./types";

interface BottomControlsProps {
  activeNavId: DashboardSectionId;
  ingestionProgress: number;
  ingestionLabel: string;
  storageProgress: number;
  storageLabel: string;
  activeStep: number;
  containerRef?: React.RefObject<HTMLElement | null>;
  onSelectStep: (step: number) => void;
  onRefreshProgress: () => void;
}

const TOTAL_SEGMENTS = 14;

/**
 * Editorial segmented progress panel blending vertical pill segments and
 * capsule storage indicator, replacing the legacy 9-button grid.
 */
export function BottomControls({
  activeNavId,
  ingestionProgress,
  ingestionLabel,
  storageProgress,
  storageLabel,
  activeStep,
  containerRef,
  onSelectStep,
  onRefreshProgress,
}: BottomControlsProps) {
  const safeIngestion = Math.max(0, Math.min(100, Math.round(ingestionProgress)));
  const safeStorage = Math.max(0, Math.min(100, Math.round(storageProgress)));
  const activeSegments = Math.round((safeIngestion / 100) * TOTAL_SEGMENTS);

  return (
    <section
      ref={containerRef}
      className="db-progress-card"
      aria-label="Workspace Progress"
    >
      <div className="db-progress-header">
        <button
          type="button"
          className="db-controls-header-pill"
          aria-label="Refresh workspace progress"
          data-tooltip="Sync Progress"
          onClick={onRefreshProgress}
        >
          <span>Progress</span>
        </button>
        <span className="db-progress-mode-tag">{activeNavId.toUpperCase()}</span>
      </div>

      <div className="db-progress-stack">
        <div className="db-progress-item">
          <div className="db-progress-meta">
            <span className="db-progress-title">Pipeline Readiness</span>
            <span className="db-progress-value">
              {ingestionLabel} · {safeIngestion}%
            </span>
          </div>
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
                  className={`db-seg-bar ${filled ? "db-seg-bar--filled" : ""}`}
                />
              );
            })}
          </div>
        </div>

        <div className="db-progress-item">
          <div className="db-progress-meta">
            <span className="db-progress-title">Storage Quota</span>
            <span className="db-progress-value">{storageLabel}</span>
          </div>
          <div
            className="db-progress-track"
            role="progressbar"
            aria-valuenow={safeStorage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Workspace storage utilization"
          >
            <div
              className="db-progress-fill"
              style={{ width: `${Math.max(safeStorage, 4)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="db-step-track" role="group" aria-label="Section Steps">
        {PRESET_STEPS.map((step) => {
          const isActive = activeStep === step;
          const navTarget = NAV_ITEMS[step];
          return (
            <button
              key={step}
              type="button"
              className={`db-step-seg ${isActive ? "db-step-seg--active" : ""}`}
              aria-label={navTarget ? navTarget.label : `Step ${step + 1}`}
              aria-pressed={isActive}
              data-tooltip={navTarget ? navTarget.label : `Step ${step + 1}`}
              onClick={() => onSelectStep(step)}
            />
          );
        })}
      </div>
    </section>
  );
}
