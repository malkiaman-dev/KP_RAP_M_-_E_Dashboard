"use client";

import Image from "next/image";
import { FIRMS, getOtherFirm } from "@/lib/brand";
import { useFirm } from "@/components/brand/firm-provider";

export function FirmToggle() {
  const { firmId, canSwitchFirm, setFirm } = useFirm();

  if (!canSwitchFirm) return null;

  const firm = FIRMS[firmId];
  const otherFirm = FIRMS[getOtherFirm(firmId)];

  return (
    <button
      type="button"
      onDoubleClick={() => setFirm(otherFirm.id)}
      className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-medium text-primary transition-colors select-none hover:bg-muted"
      aria-label={`Current organization: ${firm.name}. Double-click to switch to ${otherFirm.name}.`}
      title={`${firm.shortName} — double-click for ${otherFirm.shortName}`}
    >
      <Image
        src={firm.favicon}
        alt=""
        width={18}
        height={18}
        className="h-[18px] w-[18px] object-contain"
        draggable={false}
      />
      <span className="hidden sm:inline">{firm.shortName}</span>
    </button>
  );
}
