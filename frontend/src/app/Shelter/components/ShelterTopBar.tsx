"use client";

import { ConnectWallet } from "@/app/components/ConnectWallet";

export function ShelterTopBar() {
  return (
    <header className="sticky top-0 z-[100] h-16 border-b border-orange-100 bg-white shadow-[0_10px_32px_rgba(80,48,12,0.08)]">
      <div className="flex h-full w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-orange-50 shadow-sm ring-1 ring-orange-100">
            <img
              src="/images/logo.png"
              alt="PawChain logo"
              className="h-full w-full object-contain"
            />
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-black text-stone-950">PawChain</p>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-orange)]">
              Shelter Portal
            </p>
          </div>
        </div>
        <ConnectWallet />
      </div>
    </header>
  );
}
