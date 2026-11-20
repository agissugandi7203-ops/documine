"use client";

import React from "react";
import { Orb } from "@yogesharc/thinking-orbs";

export type OrbStateName =
  | "idle"
  | "working"
  | "reasoning"
  | "searching"
  | "background"
  | "retrying"
  | "compacting"
  | "waiting"
  | "using";

/**
 * Valid states & variants supported by `@yogesharc/thinking-orbs@0.1.2`.
 */
export const VALID_ORB_VARIANTS: Record<OrbStateName, readonly string[]> = {
  idle: ["default", "blink"],
  working: ["default", "gyro"],
  reasoning: ["default", "twins"],
  searching: ["default", "lighthouse"],
  background: ["default", "spiral"],
  retrying: ["default", "surge"],
  compacting: ["default", "squeeze", "fuse"],
  waiting: ["default"],
  using: ["default", "tap", "scroll", "type", "zoom", "snap", "record"],
};

/**
 * Activity presets mapping DocuMind AI phases to `@yogesharc/thinking-orbs` states.
 */
export const ORB_ACTIVITY_PRESETS = {
  ready: { state: "idle" as OrbStateName, variant: "blink" },
  deepReady: { state: "reasoning" as OrbStateName, variant: "twins" },
  searching: { state: "searching" as OrbStateName, variant: "lighthouse" },
  reasoning: { state: "reasoning" as OrbStateName, variant: "default" },
  deepReasoning: { state: "reasoning" as OrbStateName, variant: "twins" },
  generating: { state: "working" as OrbStateName, variant: "gyro" },
  writing: { state: "working" as OrbStateName, variant: "default" },
  verifying: { state: "compacting" as OrbStateName, variant: "squeeze" },
  retrying: { state: "retrying" as OrbStateName, variant: "surge" },
  uploading: { state: "background" as OrbStateName, variant: "spiral" },
  waiting: { state: "waiting" as OrbStateName, variant: "default" },
} as const;

export function resolveSafeOrbProps(rawState?: string, rawVariant?: string) {
  const safeState: OrbStateName =
    rawState && Object.prototype.hasOwnProperty.call(VALID_ORB_VARIANTS, rawState)
      ? (rawState as OrbStateName)
      : "reasoning";
  const allowed = VALID_ORB_VARIANTS[safeState];
  const safeVariant =
    rawVariant && allowed.includes(rawVariant) ? rawVariant : "default";
  return { state: safeState, variant: safeVariant };
}

interface ThinkingOrbStageProps {
  mode?: "inline" | "hero";
  state?: string;
  variant?: string;
  size?: number;
  speed?: number;
  paused?: boolean;
  label?: string;
  showLabel?: boolean;
  className?: string;
}

export function ThinkingOrbStage({
  mode = "inline",
  state = "reasoning",
  variant = "default",
  size,
  speed = 1,
  paused = false,
  label,
  showLabel = false,
  className = "",
}: ThinkingOrbStageProps) {
  const resolved = resolveSafeOrbProps(state, variant);
  const resolvedSize = typeof size === "number" ? size : mode === "hero" ? 56 : 24;

  if (mode === "hero") {
    return (
      <div
        className={`dm-orb-hero state-${resolved.state} ${className}`.trim()}
        data-orb-state={resolved.state}
        data-orb-variant={resolved.variant}
      >
        <div className="dm-orb-hero__core">
          <Orb
            state={resolved.state}
            variant={resolved.variant as never}
            size={resolvedSize}
            speed={speed}
            paused={paused}
            label={label || `DocuMind AI ${resolved.state}`}
          />
        </div>
      </div>
    );
  }

  return (
    <span
      className={`dm-orb-inline state-${resolved.state} ${className}`.trim()}
      data-orb-state={resolved.state}
      data-orb-variant={resolved.variant}
    >
      <span className="dm-orb-inline__glyph" aria-hidden="true">
        <Orb
          state={resolved.state}
          variant={resolved.variant as never}
          size={resolvedSize}
          speed={speed}
          paused={paused}
          label={label || `DocuMind AI ${resolved.state}`}
        />
      </span>
      {showLabel && label && (
        <span className="dm-orb-inline__label">{label}</span>
      )}
    </span>
  );
}

export default ThinkingOrbStage;
