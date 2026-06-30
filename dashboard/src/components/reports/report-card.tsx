"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function ReportCard({
  icon: Icon,
  title,
  description,
  status,
  accentClass = "bg-teal/10 text-teal",
  children,
  footer,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  status: "available" | "coming-soon";
  accentClass?: string;
  children?: React.ReactNode;
  footer?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl border border-border/60 bg-card shadow-sm",
        status === "coming-soon" && "opacity-90"
      )}
    >
      <div className="flex flex-col gap-4 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              accentClass
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium",
                  status === "available"
                    ? "bg-teal/10 text-teal"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {status === "available" ? "Available" : "Coming soon"}
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
      </div>

      {children && (
        <div className="px-5 py-4">{children}</div>
      )}

      {footer && (
        <p className="border-t border-border/60 px-5 py-2.5 text-[10px] text-muted-foreground">
          {footer}
        </p>
      )}
    </motion.div>
  );
}
