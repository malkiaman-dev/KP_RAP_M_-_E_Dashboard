"use client";

import Image from "next/image";
import { FIRMS, getOtherFirm } from "@/lib/brand";
import { useFirm } from "@/components/brand/firm-provider";

export function FirmToggle() {
  const { firmId, canSwitchFirm, setFirm } = useFirm();

  if (!canSwitchFirm) return null;

  const otherFirm = FIRMS[getOtherFirm(firmId)];

  return (
    <button
      type="button"
      onDoubleClick={() => setFirm(otherFirm.id)}
      className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-medium text-primary transition-colors select-none hover:bg-muted"
      aria-label={`Double-click to switch to ${otherFirm.name}`}
      title={`Double-click for ${otherFirm.shortName}`}
    >
      <span className="firm-brand-alliance inline-flex items-center gap-2">
        <Image
          src={FIRMS.alliance.favicon}
          alt=""
          width={18}
          height={18}
          className="h-[18px] w-[18px] object-contain"
          draggable={false}
        />
        <span className="hidden sm:inline">{FIRMS.alliance.shortName}</span>
      </span>
      <span className="firm-brand-pidc inline-flex items-center gap-2">
        <Image
          src={FIRMS.pidc.favicon}
          alt=""
          width={18}
          height={18}
          className="h-[18px] w-[18px] object-contain"
          draggable={false}
        />
        <span className="hidden sm:inline">{FIRMS.pidc.shortName}</span>
      </span>
    </button>
  );
}
