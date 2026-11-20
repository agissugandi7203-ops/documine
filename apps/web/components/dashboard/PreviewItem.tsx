"use client";

import React from "react";
import { ArrowUpRight, GripVertical } from "lucide-react";
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
 * Illustrated Atelier quick-stage card displaying clean editorial art on the
 * right side, live workspace stats on the left, and a direct shortcut button.
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
      aria-label={`${item.title}: ${item.statValue || item.metric || "Open"}. Click to open ${item.canvasTag} or drag to reorder`}
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
      <img
        src={item.imageSrc}
        alt=""
        draggable={false}
        className="db-preview-card-art"
        aria-hidden="true"
      />
      <span className="db-preview-scrim" aria-hidden="true" />

      <span className="db-preview-indicator" aria-hidden="true">
        <GripVertical className="db-preview-grip-icon" strokeWidth={2} />
      </span>

      <div className="db-preview-card-body">
        <div className="db-preview-chip-bar">
          <span className="db-preview-title-pill">
            <span className="db-preview-code">{item.code}</span>
            <span className="db-preview-title-text">{item.title}</span>
          </span>

          <button
            type="button"
            className="db-preview-shortcut-btn"
            aria-label={`Open ${item.canvasTag}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onKeySelect();
            }}
          >
            <span>{item.shortcutLabel || item.canvasTag}</span>
            <ArrowUpRight size={11} strokeWidth={2.4} />
          </button>
        </div>

        <div className="db-preview-sub-row">
          <span className="db-preview-stat-val">
            {item.statValue || item.metric || "-"}
          </span>
          <span className="db-preview-subtitle">
            {item.statDetail || item.subtitle}
          </span>
        </div>
      </div>
    </div>
  );
}
