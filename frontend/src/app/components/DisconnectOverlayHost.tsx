"use client";

import { useEffect, useState } from "react";

export const walletDisconnectEvent = "pawchain:wallet-disconnect-start";

export function DisconnectOverlayHost() {
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    let redirectTimer: number | undefined;
    let hideTimer: number | undefined;

    function handleDisconnectStart() {
      setIsDisconnecting(true);

      if (redirectTimer) {
        window.clearTimeout(redirectTimer);
      }

      if (hideTimer) {
        window.clearTimeout(hideTimer);
      }

      redirectTimer = window.setTimeout(() => {
        window.location.replace("/");
      }, 3500);

      hideTimer = window.setTimeout(() => {
        setIsDisconnecting(false);
      }, 4300);
    }

    window.addEventListener(walletDisconnectEvent, handleDisconnectStart);

    return () => {
      window.removeEventListener(walletDisconnectEvent, handleDisconnectStart);

      if (redirectTimer) {
        window.clearTimeout(redirectTimer);
      }

      if (hideTimer) {
        window.clearTimeout(hideTimer);
      }
    };
  }, []);

  if (!isDisconnecting) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center overflow-hidden bg-[var(--color-cream)] px-6 text-center text-stone-950">
      <div className="animate-grid-drift pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,138,0,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,138,0,0.08)_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-[var(--color-gold)]/35 blur-3xl" />

      <div className="relative w-full max-w-md rounded-[2rem] border border-orange-100 bg-white/88 p-7 shadow-[0_28px_90px_rgba(244,183,56,0.2)] backdrop-blur-xl">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-orange-100 shadow-[0_0_34px_rgba(255,138,0,0.24)]">
          <svg
            aria-hidden="true"
            className="h-8 w-8 text-[var(--color-orange)]"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>

        <p className="mt-6 text-sm font-black uppercase tracking-[0.18em] text-[var(--color-orange)]">
          Wallet disconnected
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          Disconnected and logout
        </h1>
        <p className="mx-auto mt-3 max-w-xs text-sm font-bold leading-6 text-stone-600">
          Clearing your wallet session and returning you to PawChain.
        </p>

        <div className="mt-7 overflow-hidden rounded-full bg-orange-100">
          <div className="h-2 w-full origin-left animate-[disconnect-progress_3.5s_ease-out_forwards] rounded-full bg-gradient-to-r from-[var(--color-orange)] via-[var(--color-gold)] to-[var(--color-orange)]" />
        </div>
      </div>
    </div>
  );
}
