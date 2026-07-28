"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAppKitAccount } from "@reown/appkit/react";
import { DashboardTopBar } from "@/app/components/DashboardTopBar";
import { DonorSidebar } from "@/app/components/DonorSidebar";

export function DonorShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { address, isConnected } = useAppKitAccount();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const notificationHref = address
    ? `/Donor/notifications?walletAddress=${encodeURIComponent(address)}`
    : "/Donor/notifications";

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isConnected || !address || !pathname.startsWith("/Donor")) {
      return;
    }

    if (searchParams.get("walletAddress") === address) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("walletAddress", address);
    router.replace(`${pathname}?${nextParams.toString()}`);
  }, [address, isConnected, pathname, router, searchParams]);

  useEffect(() => {
    let isMounted = true;

    async function loadUnreadCount() {
      if (!isConnected || !address) {
        setUnreadCount(0);
        return;
      }

      try {
        const response = await fetch(
          `/api/donor/notifications?walletAddress=${encodeURIComponent(address)}`,
          { cache: "no-store" },
        );
        const result = await response.json();

        if (isMounted && response.ok) {
          setUnreadCount(Number(result.unreadCount) || 0);
        }
      } catch {
        if (isMounted) {
          setUnreadCount(0);
        }
      }
    }

    loadUnreadCount();

    return () => {
      isMounted = false;
    };
  }, [address, isConnected, pathname]);

  return (
    <>
      <DashboardTopBar
        role="Donor"
        isMenuOpen={isSidebarOpen}
        notificationCount={unreadCount}
        notificationHref={notificationHref}
        onMenuClick={() => setIsSidebarOpen((current) => !current)}
      />
      <div className="donor-chain-bg flex min-h-screen bg-[var(--color-cream)] pt-16 text-stone-950">
        <DonorSidebar
          isOpen={isSidebarOpen}
          onNavigate={() => setIsSidebarOpen(false)}
          walletAddress={address}
        />
        <main
          className={[
            "min-w-0 flex-1 px-4 pb-10 pt-5 transition-[margin] duration-300 sm:px-8",
            isSidebarOpen ? "lg:ml-64" : "ml-0",
          ].join(" ")}
        >
          <section className="donor-motion donor-chain-shell mx-auto max-w-7xl">
            {children}
          </section>
        </main>
      </div>
    </>
  );
}
