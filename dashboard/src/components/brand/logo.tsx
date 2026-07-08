"use client";

import Image from "next/image";
import { FIRMS } from "@/lib/brand";
import { useFirm } from "@/components/brand/firm-provider";
import { cn } from "@/lib/utils";

export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  const { firmId } = useFirm();
  const firm = FIRMS[firmId];

  return (
    <div className="flex min-w-0 items-center gap-3 select-none">
      <Image
        src={firm.logoMark}
        alt=""
        width={40}
        height={40}
        className="h-10 w-10 shrink-0 object-contain"
        draggable={false}
      />
      {!collapsed && (
        <div className="min-w-0 flex flex-col">
          <span className="truncate text-sm font-semibold tracking-tight text-foreground">
            {firm.name}
          </span>
          <span className="truncate text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            M&amp;E Platform
          </span>
        </div>
      )}
    </div>
  );
}

export function LogoMark({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const { firmId } = useFirm();
  const firm = FIRMS[firmId];

  return (
    <Image
      src={firm.logoMark}
      alt=""
      width={size}
      height={size}
      className={cn("object-contain", className)}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}
