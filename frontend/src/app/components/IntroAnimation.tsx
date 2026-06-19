"use client";

import { useEffect, useState } from "react";

interface IntroAnimationProps {
  onComplete: () => void;
}

export default function IntroAnimation({ onComplete }: IntroAnimationProps) {
  const [showSkip, setShowSkip] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const skipTimer = window.setTimeout(() => {
      setShowSkip(true);
    }, 1000);

    const exitTimer = window.setTimeout(() => {
      setIsExiting(true);
    }, 2300);

    const completeTimer = window.setTimeout(() => {
      onComplete();
    }, 3500);

    return () => {
      window.clearTimeout(skipTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(completeTimer);
    };
  }, [onComplete]);

  const completeIntro = () => {
    setIsExiting(true);

    window.setTimeout(() => {
      onComplete();
    }, 500);
  };

  return (
    <div
      className={`intro-overlay fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-[var(--color-cream)] px-6 text-stone-950 ${
        isExiting ? "intro-overlay-exit" : ""
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,184,77,0.34),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.9),transparent_34%),linear-gradient(225deg,rgba(255,226,157,0.52),transparent_42%)]" />
      <div className="animate-grid-drift absolute inset-0 opacity-80 bg-[linear-gradient(rgba(255,138,0,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,138,0,0.08)_1px,transparent_1px)] bg-[size:48px_48px]" />

      <div className="intro-content relative text-center">
        <div className="intro-mark mx-auto mb-6 grid h-20 w-20 place-items-center overflow-hidden rounded-[1.75rem] bg-white shadow-[0_28px_90px_rgba(255,138,0,0.42)] ring-1 ring-white/80">
          <img
            src="/images/logo.png"
            alt="PawChain logo"
            className="h-full w-full object-contain"
          />
        </div>
        <h1 className="intro-title text-6xl font-black tracking-tight sm:text-7xl">
          PawChain
        </h1>
        <p className="intro-subtitle mt-4 text-lg font-semibold text-stone-600 sm:text-xl">
          Transparent donations for animal shelters
        </p>
      </div>

      {showSkip && (
        <button
          type="button"
          onClick={completeIntro}
          className="intro-skip absolute bottom-8 right-8 rounded-full border border-orange-200 bg-white/75 px-4 py-2 text-sm font-black text-stone-800 shadow-lg shadow-orange-100 transition hover:border-[var(--color-orange)] hover:text-[var(--color-orange)]"
        >
          Skip
        </button>
      )}
    </div>
  );
}
