import { FIRMS, type FirmId } from "@/lib/brand";

const FIRM_ORDER: FirmId[] = ["alliance", "pidc"];

export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-10 w-10 shrink-0">
        {FIRM_ORDER.map((id) => (
          <img
            key={id}
            src={FIRMS[id].logoMark}
            alt=""
            width={40}
            height={40}
            className={`firm-brand-${id} absolute inset-0 h-full w-full object-contain`}
          />
        ))}
      </div>
      {!collapsed && (
        <div className="relative flex flex-col overflow-hidden">
          {FIRM_ORDER.map((id) => (
            <span
              key={id}
              className={`firm-brand-${id} truncate text-sm font-semibold tracking-tight text-foreground`}
            >
              {FIRMS[id].name}
            </span>
          ))}
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
  return (
    <span
      className={`relative inline-block ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      {FIRM_ORDER.map((id) => (
        <img
          key={id}
          src={FIRMS[id].logoMark}
          alt=""
          width={size}
          height={size}
          className={`firm-brand-${id} absolute inset-0 h-full w-full object-contain`}
        />
      ))}
    </span>
  );
}
