"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

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

/** Close panels when the route changes so unmount never races with open overlays. */
export function useCloseOnNavigation(onClose: () => void) {
  const pathname = usePathname();

  useEffect(() => {
    onClose();
  }, [pathname, onClose]);
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
