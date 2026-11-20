"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, PanelRightClose } from "lucide-react";
import { PreviewItem } from "./PreviewItem";
import type { PreviewLayerItem } from "./types";

interface PreviewPanelProps {
  items: PreviewLayerItem[];
  selectedIndex: number;
  minimized: boolean;
  onToggleMinimize: () => void;
  onCollapseRail: () => void;
  onSelectPreview: (index: number) => void;
  onReorderPreviews: (fromIndex: number, toIndex: number) => void;
  onDropPreviewToCanvas?: (index: number) => void;
}

interface CardDragState {
  id: string;
  startSlot: number;
  currentSlot: number;
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  moved: boolean;
}

/**
 * Top-right preview card stack section (Quick Stage · 03)
 * Decoupled from global Search bar so Search can appear across every dashboard view.
 */
export function PreviewPanel({
  items,
  selectedIndex,
  minimized,
  onToggleMinimize,
  onCollapseRail,
  onSelectPreview,
  onReorderPreviews,
  onDropPreviewToCanvas,
}: PreviewPanelProps) {
  const stackRef = useRef<HTMLDivElement>(null);
  const [stackHeight, setStackHeight] = useState(230);
  const [dragState, setDragState] = useState<CardDragState | null>(null);
  const dragRef = useRef<CardDragState | null>(null);

  useEffect(() => {
    if (minimized) return;
    const el = stackRef.current;
    if (!el) return;

    const updateSize = () => {
      const h = el.getBoundingClientRect().height;
      if (h > 40) setStackHeight(h);
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [minimized]);

  const cardHeight = Math.max(84, Math.round(stackHeight * 0.54));
  const slotCount = Math.max(1, items.length - 1);
  const slotStep = Math.max(28, (stackHeight - cardHeight) / slotCount);

  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    item: PreviewLayerItem,
    index: number
  ) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);

    const initial: CardDragState = {
      id: item.id,
      startSlot: index,
      currentSlot: index,
      startX: e.clientX,
      startY: e.clientY,
      dx: 0,
      dy: 0,
      moved: false,
    };
    dragRef.current = initial;
    setDragState(initial);
  };

  const handlePointerMove = (
    e: React.PointerEvent<HTMLDivElement>,
    itemId: string
  ) => {
    const cur = dragRef.current;
    if (!cur || cur.id !== itemId) return;

    const dx = e.clientX - cur.startX;
    const dy = e.clientY - cur.startY;
    const moved = cur.moved || Math.hypot(dx, dy) > 5;

    let nextSlot = cur.currentSlot;
    if (moved) {
      const visualTop = cur.startSlot * slotStep + dy;
      const clampedSlot = Math.max(
        0,
        Math.min(items.length - 1, Math.round(visualTop / slotStep))
      );
      if (clampedSlot !== cur.currentSlot) {
        onReorderPreviews(cur.currentSlot, clampedSlot);
        nextSlot = clampedSlot;
      }
    }

    const updated: CardDragState = {
      ...cur,
      currentSlot: nextSlot,
      dx,
      dy,
      moved,
    };
    dragRef.current = updated;
    setDragState(updated);
  };

  const handlePointerFinish = (
    e: React.PointerEvent<HTMLDivElement>,
    itemId: string
  ) => {
    const cur = dragRef.current;
    if (!cur || cur.id !== itemId) return;

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (!cur.moved) {
      onSelectPreview(cur.currentSlot);
    } else if (cur.dx < -140 && onDropPreviewToCanvas) {
      onDropPreviewToCanvas(cur.currentSlot);
    }

    dragRef.current = null;
    setDragState(null);
  };

  return (
    <section
      className={`db-preview-section ${
        minimized ? "db-preview-section--minimized" : ""
      }`}
      aria-label="Quick Stage Preview Stack"
    >
      <div className="db-section-subbar">
        <span className="db-section-sublabel">Quick Stage · 03</span>
        <div className="db-subbar-actions">
          <button
            type="button"
            className="db-inline-collapse-btn"
            aria-label={minimized ? "Expand quick cards" : "Minimize quick cards"}
            onClick={onToggleMinimize}
          >
            {minimized ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </button>
          <button
            type="button"
            className="db-inline-collapse-btn"
            aria-label="Minimize right rail"
            data-tooltip="Collapse Rail"
            onClick={onCollapseRail}
          >
            <PanelRightClose size={13} />
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="db-preview-stack" ref={stackRef}>
          {items.map((item, index) => {
            const isDragging = dragState?.id === item.id;
            const topPx = isDragging
              ? dragState.startSlot * slotStep
              : index * slotStep;

            return (
              <PreviewItem
                key={item.id}
                item={item}
                index={index}
                selected={selectedIndex === index}
                isDragging={isDragging}
                cardHeight={cardHeight}
                topPx={topPx}
                dragDx={isDragging ? dragState.dx : 0}
                dragDy={isDragging ? dragState.dy : 0}
                onPointerDown={(e) => handlePointerDown(e, item, index)}
                onPointerMove={(e) => handlePointerMove(e, item.id)}
                onPointerUp={(e) => handlePointerFinish(e, item.id)}
                onPointerCancel={(e) => handlePointerFinish(e, item.id)}
                onKeySelect={() => onSelectPreview(index)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
