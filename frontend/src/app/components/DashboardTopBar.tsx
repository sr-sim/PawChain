"use client";

import Link from "next/link";
import { ConnectWallet } from "./ConnectWallet";

type DashboardTopBarProps = {
  role: string;
  onMenuClick?: () => void;
  isMenuOpen?: boolean;
  notificationHref?: string;
  notificationCount?: number;
};

export function DashboardTopBar({
  role: _role,
  onMenuClick,
  isMenuOpen,
  notificationHref,
  notificationCount,
}: DashboardTopBarProps) {
  return (
    <header className="donor-chain-topbar fixed inset-x-0 top-0 z-50 border-b border-orange-100 bg-white/92 shadow-[0_10px_32px_rgba(80,48,12,0.08)] backdrop-blur-2xl">
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
                "grid h-10 w-10 shrink-0 place-items-center rounded-2xl border text-slate-600 transition",
                "hover:border-orange-200 hover:bg-orange-50 hover:text-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)] focus:ring-offset-2",
                isMenuOpen
                  ? "border-orange-200 bg-orange-50 text-[var(--color-orange)]"
                  : "border-transparent",
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

          <p className="truncate text-lg font-black tracking-normal text-slate-950">
            PawChain
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center justify-end gap-2">
          {notificationHref ? (
            <Link
              href={notificationHref}
              aria-label="Open notifications"
              title="Notifications"
              className="relative grid h-10 w-10 place-items-center rounded-2xl border border-orange-100 bg-white text-slate-600 shadow-sm transition hover:border-orange-200 hover:bg-orange-50 hover:text-[var(--color-orange)]"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
                <path d="M10 21h4" />
              </svg>
              {notificationCount && notificationCount > 0 ? (
                <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[var(--color-orange)] px-1.5 py-0.5 text-center text-[0.65rem] font-black leading-none text-white ring-2 ring-white">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              ) : (
                <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[var(--color-orange)] ring-2 ring-white" />
              )}
            </Link>
          ) : null}
          <ConnectWallet />
        </div>
      </div>
    </header>
  );
}
