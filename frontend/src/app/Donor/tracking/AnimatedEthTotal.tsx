"use client";

import { useEffect, useState } from "react";

type AnimatedEthTotalProps = {
  value: number;
  className?: string;
};

export function AnimatedEthTotal({ value, className = "" }: AnimatedEthTotalProps) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      setDisplayValue(value);
      return;
    }

    let animationFrame = 0;
    const duration = 1250;
    const startTime = performance.now();
    const startValue = 0;
    const endValue = Number.isFinite(value) ? value : 0;

    const animate = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(startValue + (endValue - startValue) * easedProgress);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [value]);

  return (
    <p className={className}>
      {displayValue.toLocaleString("en-MY", {
        minimumFractionDigits: 6,
        maximumFractionDigits: 6,
      })}{" "}
      ETH
    </p>
  );
}
