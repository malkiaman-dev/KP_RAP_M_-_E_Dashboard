import { PROJECT_BRAND } from "@/lib/brand";

export function LoginBrand() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
        <img
          src={PROJECT_BRAND.logo}
          alt=""
          width={48}
          height={48}
          className="h-12 w-12 object-contain"
        />
      </div>
      <div className="flex flex-col text-left">
        <span className="text-sm font-semibold tracking-tight text-foreground">
          {PROJECT_BRAND.name}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          {PROJECT_BRAND.platformLabel}
        </span>
      </div>
    </div>
  );
}
