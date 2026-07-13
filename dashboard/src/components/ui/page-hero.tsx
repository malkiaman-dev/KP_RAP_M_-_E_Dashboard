"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Radio, type LucideIcon } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { cn } from "@/lib/utils";

export interface PageHeroStat {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  colorClass?: string;
  decimals?: number;
  suffix?: string;
}

export interface PageHeroLink {
  href: string;
  label: string;
}

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  accent?: string;
  description: string;
  stats?: PageHeroStat[];
  links?: PageHeroLink[];
  loading?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function PageHero({
  eyebrow = "Field operations live",
  title,
  accent,
  description,
  stats,
  links,
  loading,
  children,
  className,
}: PageHeroProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative mb-8 overflow-hidden rounded-2xl border border-border/60",
        "bg-gradient-to-br from-card via-card to-teal/[0.06] p-6 sm:p-8 dark:to-teal/[0.1]",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-teal/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-gold/15 blur-3xl" />
      </div>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.08 }}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal/25 bg-teal/5 px-3 py-1 text-xs font-medium text-teal dark:bg-teal/10"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-teal" />
          </span>
          <Radio className="h-3 w-3" aria-hidden="true" />
          {eyebrow}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          {title}
          {accent ? (
            <>
              {" "}
              <span className="bg-gradient-to-r from-teal via-deep-teal to-teal bg-clip-text text-transparent">
                {accent}
              </span>
            </>
          ) : null}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base"
        >
          {description}
        </motion.p>

        {links && links.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="mt-5 flex flex-wrap gap-2"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card/80 px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:border-teal/40 hover:bg-teal/5 hover:text-teal"
              >
                {link.label}
                <ArrowUpRight className="h-3 w-3 opacity-50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" />
              </Link>
            ))}
          </motion.div>
        )}

        {stats && stats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4"
          >
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="glass-card rounded-xl border border-border/50 px-4 py-3"
                >
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {Icon ? (
                      <Icon
                        className={cn("h-3 w-3", stat.colorClass || "text-teal")}
                        aria-hidden="true"
                      />
                    ) : null}
                    {stat.label}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-xl font-bold tabular-nums",
                      stat.colorClass || "text-foreground"
                    )}
                  >
                    {loading ? (
                      "-"
                    ) : typeof stat.value === "number" ? (
                      <AnimatedCounter
                        value={stat.value}
                        decimals={stat.decimals}
                        suffix={stat.suffix}
                      />
                    ) : (
                      stat.value
                    )}
                  </p>
                </div>
              );
            })}
          </motion.div>
        )}

        {children ? <div className="mt-6">{children}</div> : null}
      </div>
    </motion.section>
  );
}

export function SectionHeader({
  title,
  subtitle,
  className,
}: {
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-4", className)}>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {subtitle ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  );
}

export function ModeToggle<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex rounded-xl border border-border/60 bg-muted/30 p-1 shadow-sm",
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-lg px-4 py-2 text-xs font-semibold transition-all",
            value === option.value
              ? "bg-card text-foreground shadow-sm ring-1 ring-teal/15"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
