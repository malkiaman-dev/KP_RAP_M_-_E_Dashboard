"use client";

import Image from "next/image";
import { FIRM_IDS, FIRMS, type FirmId } from "@/lib/brand";
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

/** Renders all brands; `html[data-firm]` CSS picks which is visible (hydration-safe). */
export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="relative min-w-0 select-none">
      {FIRM_IDS.map((id) => (
        <div
          key={id}
          className={`firm-brand-${id} flex min-w-0 items-center gap-3`}
        >
          <FirmLogoContent firmId={id} collapsed={collapsed} />
        </div>
      ))}
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
      {FIRM_IDS.map((id) => (
        <Image
          key={id}
          src={FIRMS[id].logoMark}
          alt=""
          width={size}
          height={size}
          className={cn(`firm-brand-${id} object-contain`, className)}
          style={{ width: size, height: size }}
          draggable={false}
        />
      ))}
    </span>
  );
}
