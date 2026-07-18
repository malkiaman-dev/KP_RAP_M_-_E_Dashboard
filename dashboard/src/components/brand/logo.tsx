"use client";

import Image from "next/image";
import { FIRMS, type FirmId } from "@/lib/brand";
import { cn } from "@/lib/utils";

function FirmLogoContent({
  firmId,
  collapsed,
}: {
  firmId: FirmId;
  collapsed: boolean;
}) {
  const firm = FIRMS[firmId];

  return (
    <>
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
    </>
  );
}

/** Renders both brands; `html[data-firm]` CSS picks which is visible (hydration-safe). */
export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="relative min-w-0 select-none">
      <div className="firm-brand-alliance flex min-w-0 items-center gap-3">
        <FirmLogoContent firmId="alliance" collapsed={collapsed} />
      </div>
      <div className="firm-brand-pidc flex min-w-0 items-center gap-3">
        <FirmLogoContent firmId="pidc" collapsed={collapsed} />
      </div>
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
  return (
    <span className="relative inline-flex">
      <Image
        src={FIRMS.alliance.logoMark}
        alt=""
        width={size}
        height={size}
        className={cn("firm-brand-alliance object-contain", className)}
        style={{ width: size, height: size }}
        draggable={false}
      />
      <Image
        src={FIRMS.pidc.logoMark}
        alt=""
        width={size}
        height={size}
        className={cn("firm-brand-pidc object-contain", className)}
        style={{ width: size, height: size }}
        draggable={false}
      />
    </span>
  );
}
