"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowLeftRight, GripHorizontal } from "lucide-react";
import type { DeckLayerItem } from "./types";

interface LayerPanelProps {
  layers: DeckLayerItem[];
  selectedLayerIndex: number;
  onSelectLayer: (index: number) => void;
  onReorderLayers: (fromIndex: number, toIndex: number) => void;
  onCycleLayer: () => void;
}

interface FanDragState {
  id: string;
  startSlot: number;
  currentSlot: number;
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  moved: boolean;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function getSlotPose(slotIndex: number, fanWidth: number) {
  const stepX = fanWidth * 0.145;
  if (slotIndex === 0) {
    return { x: fanWidth * 0.05, y: 12, rotate: -18 };
  }
  if (slotIndex === 1) {
    return { x: fanWidth * 0.05 + stepX, y: 5, rotate: -9 };
  }
  return { x: fanWidth * 0.05 + stepX * 2, y: 0, rotate: -2 };
}

/**
 * Bottom-right fanned playing-card deck supporting live pointer drag and
 * card-switching animations without browser drag blur.
 */
export function LayerPanel({
  layers,
  selectedLayerIndex,
  onSelectLayer,
  onReorderLayers,
  onCycleLayer,
}: LayerPanelProps) {
  const fanRef = useRef<HTMLDivElement>(null);
  const [fanSize, setFanSize] = useState({ w: 260, h: 140 });
  const [dragState, setDragState] = useState<FanDragState | null>(null);
  const dragRef = useRef<FanDragState | null>(null);

  useEffect(() => {
    const el = fanRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 40 && rect.height > 40) {
        setFanSize({ w: rect.width, h: rect.height });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const activeLayer = layers[selectedLayerIndex] ?? layers[layers.length - 1];
  const cardWidth = Math.max(105, Math.round(fanSize.w * 0.6));
  const cardHeight = Math.max(96, Math.round(fanSize.h * 1.04));

  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    layer: DeckLayerItem,
    index: number
  ) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);

    const initial: FanDragState = {
      id: layer.id,
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
    layerId: string
  ) => {
    const cur = dragRef.current;
    if (!cur || cur.id !== layerId) return;

    const dx = e.clientX - cur.startX;
    const dy = e.clientY - cur.startY;
    const moved = cur.moved || Math.hypot(dx, dy) > 5;

    let nextSlot = cur.currentSlot;
    if (moved) {
      const startPose = getSlotPose(cur.startSlot, fanSize.w);
      const visualX = startPose.x + dx;
      const poses = [0, 1, 2].map((i) => getSlotPose(i, fanSize.w).x);

      let closestSlot = cur.currentSlot;
      let bestDist = Infinity;
      poses.forEach((px, idx) => {
        const dist = Math.abs(visualX - px);
        if (dist < bestDist) {
          bestDist = dist;
          closestSlot = idx;
        }
      });

      if (closestSlot !== cur.currentSlot && closestSlot < layers.length) {
        onReorderLayers(cur.currentSlot, closestSlot);
        nextSlot = closestSlot;
      }
    }

    const updated: FanDragState = {
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
    layerId: string
  ) => {
    const cur = dragRef.current;
    if (!cur || cur.id !== layerId) return;

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (!cur.moved) {
      onSelectLayer(cur.currentSlot);
    }

    dragRef.current = null;
    setDragState(null);
  };

  return (
    <section className="db-layer-panel" aria-label="Layer Deck">
      <div className="db-layer-header">
        <div className="db-layer-header-pill" title="Drag playing cards to switch order">
          <span className="db-layer-pill-dot" aria-hidden="true" />
          <span className="db-layer-pill-text">
            {activeLayer ? activeLayer.label : "Layer Deck"}
          </span>
        </div>

        <button
          type="button"
          className="db-layer-circle-btn"
          aria-label="Cycle layer card"
          data-tooltip="Switch Deck"
          onClick={onCycleLayer}
        >
          <ArrowLeftRight className="db-layer-circle-icon" strokeWidth={2} />
        </button>
      </div>

      <div className="db-layer-fan" ref={fanRef}>
        {layers.map((layer, index) => {
          const selected = selectedLayerIndex === index;
          const isDragging = dragState?.id === layer.id;
          const restPose = getSlotPose(index, fanSize.w);
          const dragStartPose = isDragging
            ? getSlotPose(dragState.startSlot, fanSize.w)
            : restPose;

          const x = isDragging ? dragStartPose.x + dragState.dx : restPose.x;
          const y = isDragging ? dragStartPose.y + dragState.dy : restPose.y;
          const rot = isDragging
            ? dragStartPose.rotate * 0.35 + clamp(dragState.dx * 0.08, -6, 6)
            : restPose.rotate;

          const toneClass =
            layer.tone === "light"
              ? "db-layer-card--light"
              : layer.tone === "mid"
              ? "db-layer-card--mid"
              : "db-layer-card--dark";

          return (
            <div
              key={layer.id}
              role="button"
              tabIndex={0}
              className={`db-layer-card ${toneClass} ${
                selected ? "db-layer-card--selected" : ""
              } ${isDragging ? "db-layer-card--dragging" : ""}`}
              style={{
                width: `${cardWidth}px`,
                height: `${cardHeight}px`,
                left: 0,
                bottom: "-12px",
                zIndex: isDragging ? 45 : index + 1,
                transform: `translate3d(${x}px, ${y}px, 0) rotate(${rot}deg) scale(${
                  isDragging ? 1.04 : 1
                })`,
                transition: isDragging
                  ? "box-shadow 140ms ease, border-color 140ms ease"
                  : "transform 250ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 180ms ease, border-color 180ms ease",
              }}
              aria-label={`${layer.label}. Drag to switch position`}
              aria-pressed={selected}
              onPointerDown={(e) => handlePointerDown(e, layer, index)}
              onPointerMove={(e) => handlePointerMove(e, layer.id)}
              onPointerUp={(e) => handlePointerFinish(e, layer.id)}
              onPointerCancel={(e) => handlePointerFinish(e, layer.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectLayer(index);
                }
              }}
            >
              <div className="db-layer-card-top">
                <span className="db-layer-card-code">{layer.code}</span>
                <GripHorizontal className="db-layer-card-grip" strokeWidth={2} />
              </div>
              <div className="db-layer-card-label">{layer.label}</div>
              <div className="db-layer-card-tag">{layer.shortLabel}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
