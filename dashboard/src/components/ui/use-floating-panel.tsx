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
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function useDismissiblePanel(
  open: boolean,
  onClose: () => void,
  anchorRef: RefObject<HTMLElement | null>,
  panelRef?: RefObject<HTMLElement | null>
) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (panelRef?.current?.contains(target)) return;
      onCloseRef.current();
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, anchorRef, panelRef]);
}

/** Close panels when the route changes so unmount never races with open overlays. */
export function useCloseOnNavigation(onClose: () => void) {
  const pathname = usePathname();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    onCloseRef.current();
  }, [pathname]);
}

export function DropdownPanel({
  open,
  panelRef,
  children,
  className,
  minWidth = 240,
}: {
  open: boolean;
  panelRef?: RefObject<HTMLDivElement | null>;
  children: ReactNode;
  className?: string;
  minWidth?: number;
}) {
  if (!open) return null;

  return (
    <div
      ref={panelRef}
      style={{ minWidth }}
      className={cn(
        "absolute left-0 top-[calc(100%+6px)] z-[200] w-full",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Fixed-position portal panel. Escapes overflow:hidden / narrow grid cells
 * so calendars and large menus stay fully visible and clickable.
 *
 * - `down` (default): always open below the trigger
 * - `auto`: open below when there is room; flip above only when space below is insufficient
 */
export function PortalDropdownPanel({
  open,
  anchorRef,
  panelRef,
  children,
  className,
  width = 308,
  placement = "down",
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  panelRef?: RefObject<HTMLDivElement | null>;
  children: ReactNode;
  className?: string;
  width?: number;
  placement?: "down" | "auto";
}) {
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    maxHeight: number;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setCoords(null);
      return;
    }

    const update = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const margin = 8;
      let left = rect.left;
      if (left + width > window.innerWidth - margin) {
        left = Math.max(margin, rect.right - width);
      }
      left = Math.max(margin, left);

      const spaceBelow = window.innerHeight - rect.bottom - margin - 6;
      const spaceAbove = rect.top - margin - 6;
      // Flip up only in auto mode when the menu would be too cramped below.
      const minComfortable = 220;
      const openUp =
        placement === "auto" &&
        spaceBelow < minComfortable &&
        spaceAbove > spaceBelow;

      if (openUp) {
        const maxHeight = Math.max(160, spaceAbove);
        setCoords({
          bottom: window.innerHeight - rect.top + 6,
          left,
          maxHeight,
        });
      } else {
        const top = rect.bottom + 6;
        const maxHeight = Math.max(160, spaceBelow);
        setCoords({ top, left, maxHeight });
      }
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, anchorRef, width, placement]);

  if (!mounted || !open || !coords) return null;

  return createPortal(
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        top: coords.top,
        bottom: coords.bottom,
        left: coords.left,
        width,
        maxHeight: coords.maxHeight,
        // Expose available height so list menus can fill the viewport without nested clipping.
        ["--panel-max-height" as string]: `${coords.maxHeight}px`,
        zIndex: 9999,
      }}
      className={cn(className)}
    >
      {children}
    </div>,
    document.body
  );
}
