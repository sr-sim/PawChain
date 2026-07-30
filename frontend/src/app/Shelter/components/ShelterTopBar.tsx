"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { ConnectWallet } from "@/app/components/ConnectWallet";

export function ShelterTopBar() {
  const { address, isConnected } = useAppKitAccount();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationHref = address
    ? `/Shelter/notifications?walletAddress=${encodeURIComponent(address)}`
    : "/Shelter/notifications";

  useEffect(() => {
    let isMounted = true;

    async function loadUnreadCount() {
      if (!isConnected || !address) {
        setUnreadCount(0);
        return;
      }

      try {
        const response = await fetch(
          `/api/shelter/notifications?walletAddress=${encodeURIComponent(address)}`,
          { cache: "no-store" },
        );
        const result = await response.json();
        if (isMounted && response.ok) {
          setUnreadCount(Number(result.unreadCount) || 0);
        }
      } catch {
        if (isMounted) setUnreadCount(0);
      }
    }

    void loadUnreadCount();
    const interval = window.setInterval(loadUnreadCount, 60_000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [address, isConnected, pathname]);

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
        <div className="flex items-center gap-3">
          <Link
            href={notificationHref}
            aria-label={`${unreadCount} unread shelter notifications`}
            title="Shelter notifications"
            className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-orange-100 bg-white text-stone-700 shadow-sm transition hover:border-[var(--color-orange)] hover:bg-orange-50 hover:text-[var(--color-orange)]"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
              <path d="M6.5 10a5.5 5.5 0 0 1 11 0v3.4l1.6 2.6H4.9l1.6-2.6V10Zm3.2 8a2.5 2.5 0 0 0 4.6 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--color-orange)] px-1 text-[10px] font-black text-white ring-2 ring-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </Link>
          <ConnectWallet />
        </div>
      </div>
    </header>
  );
}
