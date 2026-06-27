"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

interface FloatingPosition {
  top: number;
  left: number;
  width: number;
  maxHeight?: number;
}

export function useFloatingPanel(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  panelWidth?: number
) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<FloatingPosition>({
    top: 0,
    left: 0,
    width: 0,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;

    const update = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const width = panelWidth ?? rect.width;
      const gap = 6;
      const margin = 8;

      // Always open downward (below the anchor). Instead of flipping above when
      // there isn't enough room, cap the panel height so it scrolls internally
      // and stays anchored to the bottom of the trigger.
      const top = rect.bottom + gap;
      const maxHeight = Math.max(120, window.innerHeight - top - margin);

      setPosition({
        top,
        left: Math.min(Math.max(margin, rect.left), window.innerWidth - width - margin),
        width,
        maxHeight,
      });
    };

    update();
    const frame = requestAnimationFrame(update);

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, anchorRef, panelWidth]);

  return { panelRef, position, mounted };
}

export function useDismissiblePanel(
  open: boolean,
  onClose: () => void,
  anchorRef: RefObject<HTMLElement | null>,
  panelRef?: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (panelRef?.current?.contains(target)) return;
      onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, onClose, anchorRef, panelRef]);
}

export function FloatingPanel({
  open,
  mounted,
  position,
  panelRef,
  children,
  className,
}: {
  open: boolean;
  mounted: boolean;
  position: FloatingPosition;
  panelRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
  className?: string;
}) {
  if (!open || !mounted) return null;

  return createPortal(
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        width: position.width,
        maxHeight: position.maxHeight,
        overflowY: position.maxHeight ? "auto" : undefined,
        zIndex: 9999,
      }}
      className={className}
    >
      {children}
    </div>,
    document.body
  );
}
