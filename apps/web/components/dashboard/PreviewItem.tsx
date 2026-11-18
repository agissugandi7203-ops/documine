"use client";

import React from "react";
import { GripVertical } from "lucide-react";
import type { PreviewLayerItem } from "./types";

interface PreviewItemProps {
  item: PreviewLayerItem;
  index: number;
  selected: boolean;
  isDragging: boolean;
  cardHeight: number;
  topPx: number;
  dragDx: number;
  dragDy: number;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void;
  onKeySelect: () => void;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Physical playing-card style preview item supporting smooth pointer drag
 * and live slot switching with zero blur.
 */
export function PreviewItem({
  item,
  index,
  selected,
  isDragging,
  cardHeight,
  topPx,
  dragDx,
  dragDy,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onKeySelect,
}: PreviewItemProps) {
  const toneClass =
    item.tone === "light"
      ? "db-preview-card--light"
      : item.tone === "mid"
      ? "db-preview-card--mid"
      : "db-preview-card--dark";

  const tilt = isDragging ? clamp(dragDx * 0.045, -4, 4) : 0;

  return (
    <div
      role="button"
      tabIndex={0}
      className={`db-preview-card ${toneClass} ${
        selected ? "db-preview-card--selected" : ""
      } ${isDragging ? "db-preview-card--dragging" : ""}`}
      style={{
        height: `${cardHeight}px`,
        top: `${topPx}px`,
        zIndex: isDragging ? 45 : index + 1,
        transform: isDragging
          ? `translate3d(${dragDx}px, ${dragDy}px, 0) scale(1.03) rotate(${tilt}deg)`
          : "translate3d(0, 0, 0) scale(1) rotate(0deg)",
        transition: isDragging
          ? "box-shadow 140ms ease, border-color 140ms ease"
          : "top 240ms cubic-bezier(0.22, 1, 0.36, 1), transform 240ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 180ms ease, border-color 180ms ease",
      }}
      aria-label={`${item.title}: ${item.subtitle}. Drag to switch position`}
      aria-pressed={selected}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onKeySelect();
        }
      }}
    >
      <span className="db-preview-indicator" aria-hidden="true">
        <GripVertical className="db-preview-grip-icon" strokeWidth={2} />
      </span>

      <div className="db-preview-content">
        <div className="db-preview-row">
          <span className="db-preview-title">
            <span className="db-preview-code">{item.code}</span>
            {item.title}
          </span>
          {item.metric && <span className="db-preview-badge">{item.metric}</span>}
        </div>
        <span className="db-preview-subtitle">{item.subtitle}</span>
      </div>
    </div>
  );
}
