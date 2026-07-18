"use client";

import Image from "next/image";
import { FIRM_IDS, FIRMS, getNextFirm } from "@/lib/brand";
import { useFirm } from "@/components/brand/firm-provider";

export function FirmToggle() {
  const { firmId, canSwitchFirm, setFirm } = useFirm();

  if (!canSwitchFirm) return null;

  const current = FIRMS[firmId];
  const nextFirm = FIRMS[getNextFirm(firmId)];

  return (
    <button
      type="button"
      onDoubleClick={() => setFirm(nextFirm.id)}
      className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-medium text-primary transition-colors select-none hover:bg-muted"
      aria-label={`Current brand: ${current.name}. Double-click to switch to ${nextFirm.name}.`}
      title={`${current.shortName} — double-click for ${nextFirm.shortName}`}
    >
      {FIRM_IDS.map((id) => (
        <span
          key={id}
          className={`firm-brand-${id} inline-flex items-center gap-2`}
        >
          <Image
            src={FIRMS[id].favicon}
            alt=""
            width={18}
            height={18}
            className="h-[18px] w-[18px] object-contain"
            draggable={false}
          />
          <span className="hidden sm:inline">{FIRMS[id].shortName}</span>
        </span>
      ))}
    </button>
  );
}
