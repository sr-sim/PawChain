"use client";

import { ConnectWallet } from "./ConnectWallet";

type DashboardTopBarProps = {
  role: string;
  onMenuClick?: () => void;
  isMenuOpen?: boolean;
};

export function DashboardTopBar({ role: _role, onMenuClick, isMenuOpen }: DashboardTopBarProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-orange-100 bg-white/95 shadow-[0_10px_32px_rgba(80,48,12,0.08)] backdrop-blur-2xl">
      <div className="flex min-h-16 w-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          {onMenuClick ? (
            <button
              type="button"
              onClick={onMenuClick}
              aria-label="Toggle dashboard navigation"
              aria-expanded={isMenuOpen}
              suppressHydrationWarning
              className={[
                "grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-slate-600 transition",
                "hover:bg-orange-50 hover:text-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)] focus:ring-offset-2",
                isMenuOpen ? "bg-orange-50 text-[var(--color-orange)]" : "",
              ].join(" ")}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.3"
                strokeLinecap="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
              </svg>
            </button>
          ) : (
            <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-orange-50 shadow-sm ring-1 ring-orange-100">
              <img
                src="/images/logo.png"
                alt="PawChain logo"
                className="h-full w-full object-contain"
              />
            </span>
          )}

          {onMenuClick ? (
            <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-orange-50 shadow-sm ring-1 ring-orange-100">
              <img
                src="/images/logo.png"
                alt="PawChain logo"
                className="h-full w-full object-contain"
              />
            </span>
          ) : null}

          <p className="truncate text-lg font-semibold tracking-normal text-slate-950">
            PawChain
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center justify-end">
          <ConnectWallet />
        </div>
      </div>
    </header>
  );
}
