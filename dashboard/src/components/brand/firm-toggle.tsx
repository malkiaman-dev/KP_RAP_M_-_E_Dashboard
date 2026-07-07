"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { FIRMS, type FirmId } from "@/lib/brand";
import { useFirm } from "@/components/brand/firm-provider";

const FIRM_ORDER: FirmId[] = ["alliance", "pidc"];

export function FirmToggle() {
  const { firmId, canSwitchFirm, setFirm } = useFirm();

  if (!canSwitchFirm) return null;

  return (
    <div
      className="flex items-center rounded-xl border border-border bg-card p-1"
      role="group"
      aria-label="Switch organization"
    >
      {FIRM_ORDER.map((id) => {
        const firm = FIRMS[id];
        const active = firmId === id;

        return (
          <button
            key={id}
            type="button"
            onClick={() => setFirm(id)}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            aria-pressed={active}
            aria-label={`Switch to ${firm.name}`}
            title={firm.name}
          >
            <Image
              src={firm.favicon}
              alt=""
              width={16}
              height={16}
              className="h-4 w-4 object-contain"
            />
            <span className="hidden sm:inline">{firm.shortName}</span>
          </button>
        );
      })}
    </div>
  );
}
