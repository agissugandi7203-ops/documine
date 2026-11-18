"use client";

import React, { useEffect, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { PreviewItem } from "./PreviewItem";
import type { PreviewLayerItem } from "./types";

interface PreviewPanelProps {
  items: PreviewLayerItem[];
  selectedIndex: number;
  searchQuery: string;
  searchLoading: boolean;
  searchResultCount: number | null;
  onSearchChange: (q: string) => void;
  onSearchClear: () => void;
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
 * Top-right section with integrated workspace Search bar and 3 physical
 * playing-card style preview items that smoothly switch positions when dragged.
 */
export function PreviewPanel({
  items,
  selectedIndex,
  searchQuery,
  searchLoading,
  searchResultCount,
  onSearchChange,
  onSearchClear,
  onSelectPreview,
  onReorderPreviews,
  onDropPreviewToCanvas,
}: PreviewPanelProps) {
  const stackRef = useRef<HTMLDivElement>(null);
  const [stackHeight, setStackHeight] = useState(260);
  const [dragState, setDragState] = useState<CardDragState | null>(null);
  const dragRef = useRef<CardDragState | null>(null);

  useEffect(() => {
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
  }, []);

  const cardHeight = Math.max(66, Math.round(stackHeight * 0.44));
  const slotCount = Math.max(1, items.length - 1);
  const slotStep = Math.max(24, (stackHeight - cardHeight) / slotCount);

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
    <section className="db-preview-section" aria-label="Search and Preview Stack">
      <div className="db-right-search-pill">
        <Search className="db-right-search-icon" strokeWidth={2.2} aria-hidden="true" />
        <input
          type="search"
          className="db-right-search-input"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search documents..."
          aria-label="Search workspace documents and chunks"
        />
        {searchLoading ? (
          <Loader2 className="db-right-search-spinner db-spin" aria-hidden="true" />
        ) : searchQuery.trim() ? (
          <button
            type="button"
            className="db-right-search-clear"
            aria-label="Clear search"
            onClick={onSearchClear}
          >
            <X size={12} />
          </button>
        ) : null}
        {searchResultCount !== null && searchQuery.trim() && !searchLoading && (
          <span className="db-right-search-count">{searchResultCount}</span>
        )}
      </div>

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
    </section>
  );
}
