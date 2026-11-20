"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";

interface UseDraggableSheetOptions {
  open: boolean;
  onClose: () => void;
}

/**
 * Shared mobile/desktop sheet gesture controller:
 * - Drag/swipe UP (on grabber or scrollable sheet) expands sheet to fullscreen.
 * - Drag/swipe DOWN (on grabber or at scrollTop === 0) shrinks from full or dismisses the pop-up.
 */
export function useDraggableSheet({ open, onClose }: UseDraggableSheetOptions) {
  const [isFull, setIsFull] = useState(false);
  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const grabStartYRef = useRef<number | null>(null);
  const grabStartTimeRef = useRef<number>(0);
  const lastDyRef = useRef<number>(0);

  const touchStartYRef = useRef<number | null>(null);
  const touchStartAtTopRef = useRef<boolean>(false);
  const touchStartAtBottomRef = useRef<boolean>(false);
  const touchStartTimeRef = useRef<number>(0);
  const touchDraggingSheetRef = useRef<boolean>(false);

  useEffect(() => {
    if (!open) {
      setIsFull(false);
      setDragOffsetPx(0);
      setIsDragging(false);
      grabStartYRef.current = null;
      touchStartYRef.current = null;
      touchDraggingSheetRef.current = false;
    }
  }, [open]);

  const finishGesture = useCallback(
    (dy: number, velocityY: number, wasTapEligible: boolean) => {
      setIsDragging(false);
      setDragOffsetPx(0);

      if (wasTapEligible && Math.abs(dy) < 6) {
        setIsFull((prev) => !prev);
        return;
      }

      // Swipe / drag UP -> expand to fullscreen
      if (dy <= -48 || velocityY <= -0.55) {
        setIsFull(true);
        return;
      }

      // Swipe / drag DOWN -> shrink or dismiss
      if (dy >= 64 || velocityY >= 0.5) {
        if (isFull && dy < 170 && velocityY < 0.85) {
          setIsFull(false);
        } else {
          onClose();
        }
      }
    },
    [isFull, onClose]
  );

  const onGrabberPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      grabStartYRef.current = e.clientY;
      grabStartTimeRef.current = performance.now();
      lastDyRef.current = 0;
      setIsDragging(true);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture unavailable
      }
    },
    []
  );

  const onGrabberPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (grabStartYRef.current === null) return;
      const dy = e.clientY - grabStartYRef.current;
      lastDyRef.current = dy;
      if (dy > 0) {
        setDragOffsetPx(Math.min(420, dy));
      } else {
        setDragOffsetPx(Math.max(-90, dy * 0.45));
      }
    },
    []
  );

  const onGrabberPointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (grabStartYRef.current === null) return;
      const dy = e.clientY - grabStartYRef.current;
      const elapsed = Math.max(16, performance.now() - grabStartTimeRef.current);
      const velocityY = dy / elapsed;
      grabStartYRef.current = null;
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore
      }
      finishGesture(dy, velocityY, true);
    },
    [finishGesture]
  );

  const onGrabberPointerCancel = useCallback(() => {
    grabStartYRef.current = null;
    setIsDragging(false);
    setDragOffsetPx(0);
  }, []);

  const onBodyTouchStart = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (e.touches.length !== 1) return;
      const scrollEl = e.currentTarget.querySelector<HTMLElement>(
        ".dm-stream-scroll, .gc-ai-scroll, .gc-inspector-scroll"
      );
      const scrollTop = scrollEl ? scrollEl.scrollTop : 0;
      const atTop = scrollTop <= 2;
      const atBottom = scrollEl
        ? scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 2
        : true;

      touchStartYRef.current = e.touches[0].clientY;
      touchStartAtTopRef.current = atTop;
      touchStartAtBottomRef.current = atBottom;
      touchStartTimeRef.current = performance.now();
      touchDraggingSheetRef.current = false;
    },
    []
  );

  const onBodyTouchMove = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (touchStartYRef.current === null || e.touches.length !== 1) return;
      const dy = e.touches[0].clientY - touchStartYRef.current;

      // Pulling DOWN from scrollTop === 0 -> drag the sheet down toward close
      if (dy > 14 && touchStartAtTopRef.current) {
        touchDraggingSheetRef.current = true;
        setIsDragging(true);
        setDragOffsetPx(Math.min(420, dy * 0.85));
        return;
      }

      // Swiping UP when collapsed & either at scroll bottom or non-scrollable empty area -> preview expand
      if (dy < -24 && !isFull && touchStartAtBottomRef.current) {
        touchDraggingSheetRef.current = true;
        setIsDragging(true);
        setDragOffsetPx(Math.max(-72, dy * 0.38));
      }
    },
    [isFull]
  );

  const onBodyTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (touchStartYRef.current === null) return;
      const endY = e.changedTouches[0]?.clientY ?? touchStartYRef.current;
      const dy = endY - touchStartYRef.current;
      const elapsed = Math.max(16, performance.now() - touchStartTimeRef.current);
      const velocityY = dy / elapsed;
      const wasDraggingSheet = touchDraggingSheetRef.current;

      touchStartYRef.current = null;
      touchDraggingSheetRef.current = false;

      if (!wasDraggingSheet) {
        setIsDragging(false);
        setDragOffsetPx(0);
        return;
      }

      finishGesture(dy, velocityY, false);
    },
    [finishGesture]
  );

  const sheetInlineStyle: React.CSSProperties | undefined =
    isDragging || dragOffsetPx !== 0
      ? {
          transform: `translateY(${dragOffsetPx}px)`,
          transition: isDragging ? "none" : "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
        }
      : undefined;

  return {
    isFull,
    setIsFull,
    isDragging,
    sheetInlineStyle,
    grabberProps: {
      onPointerDown: onGrabberPointerDown,
      onPointerMove: onGrabberPointerMove,
      onPointerUp: onGrabberPointerUp,
      onPointerCancel: onGrabberPointerCancel,
    },
    bodyTouchProps: {
      onTouchStart: onBodyTouchStart,
      onTouchMove: onBodyTouchMove,
      onTouchEnd: onBodyTouchEnd,
    },
  };
}
