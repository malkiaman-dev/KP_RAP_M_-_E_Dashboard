"use client";

import Image from "next/image";
import { useFirm } from "@/components/brand/firm-provider";

export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  const { firm } = useFirm();

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
        <Image
          src={firm.logoMark}
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 object-contain"
          priority
        />
      </div>
      {!collapsed && (
        <div className="flex flex-col overflow-hidden">
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
  const { firm } = useFirm();

  return (
    <Image
      src={firm.logoMark}
      alt=""
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}
