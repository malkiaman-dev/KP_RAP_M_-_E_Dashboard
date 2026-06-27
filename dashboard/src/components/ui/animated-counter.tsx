"use client";

import { useEffect, useState } from "react";
import { useSpring } from "framer-motion";

export function AnimatedCounter({
  value,
  suffix = "",
  decimals = 0,
}: {
  value: number;
  suffix?: string;
  decimals?: number;
}) {
  const spring = useSpring(0, { stiffness: 75, damping: 20 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    return spring.on("change", (v) => setDisplay(v));
  }, [spring]);

  const formatted =
    decimals > 0
      ? display.toFixed(decimals)
      : Math.round(display).toLocaleString();

  return (
    <span className="tabular-nums">
      {formatted}
      {suffix}
    </span>
  );
}
