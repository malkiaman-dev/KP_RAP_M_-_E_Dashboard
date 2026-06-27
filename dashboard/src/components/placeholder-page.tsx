"use client";

import { motion } from "framer-motion";
import { Construction } from "lucide-react";

export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-border/60 bg-card p-12 text-center"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal/10">
        <Construction className="h-7 w-7 text-teal" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      <p className="mt-6 text-xs text-muted-foreground">
        This module will be available in the next release.
      </p>
    </motion.div>
  );
}
