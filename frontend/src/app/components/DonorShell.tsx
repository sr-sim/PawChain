"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAppKitAccount } from "@reown/appkit/react";
import { DashboardTopBar } from "@/app/components/DashboardTopBar";
import { DonorSidebar } from "@/app/components/DonorSidebar";

export function DonorShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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

  return (
    <>
      <DashboardTopBar
        role="Donor"
        isMenuOpen={isSidebarOpen}
        notificationCount={1}
        notificationHref={notificationHref}
        onMenuClick={() => setIsSidebarOpen((current) => !current)}
      />
      <div className="flex min-h-screen bg-[var(--color-cream)] pt-16 text-stone-950">
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
          <section className="donor-motion mx-auto max-w-7xl">{children}</section>
        </main>
      </div>
    </>
  );
}
