"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppKitAccount } from "@reown/appkit/react";
import { DashboardTopBar } from "@/app/components/DashboardTopBar";

export default function AdminDashboard() {
  const { address, isConnected } = useAppKitAccount();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(false);

  useEffect(() => {
    if (!address || !isConnected) {
      setIsAdmin(false);
      setIsCheckingAdmin(false);
      return;
    }

    let isMounted = true;

    const checkAdmin = async () => {
      setIsCheckingAdmin(true);

      try {
        const response = await fetch(
          `/api/auth/admin-status?walletAddress=${encodeURIComponent(address)}`,
        );
        const result = await response.json();

        if (isMounted) {
          setIsAdmin(response.ok && Boolean(result.isAdmin));
        }
      } catch {
        if (isMounted) {
          setIsAdmin(false);
        }
      } finally {
        if (isMounted) {
          setIsCheckingAdmin(false);
        }
      }
    };

    void checkAdmin();

    return () => {
      isMounted = false;
    };
  }, [address, isConnected]);

  return (
    <>
      <DashboardTopBar role="Admin" />
      <main className="min-h-screen bg-[var(--color-cream)] px-4 pb-8 pt-28 text-stone-950 sm:px-8">
        <h1 className="text-3xl font-black">Admin Dashboard</h1>
        <p className="mt-4 text-lg font-bold">
          Admin access is checked by connected wallet address.
        </p>
        <div className="mt-6 space-y-2 rounded-2xl border border-orange-100 bg-white p-5 text-sm font-bold shadow-sm">
          <p>Wallet: {address ?? "Not connected"}</p>
          <p>Access: {isAdmin ? "Admin wallet" : "Not admin"}</p>
        </div>

        {!isConnected ? (
          <div className="mt-6 rounded-2xl border border-orange-100 bg-white p-5 text-sm font-bold shadow-sm">
          Connect an admin wallet first.
        </div>
        ) : isCheckingAdmin ? (
          <div className="mt-6 rounded-2xl border border-orange-100 bg-white p-5 text-sm font-bold shadow-sm">
            Checking admin access...
          </div>
        ) : !isAdmin ? (
          <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-600 shadow-sm">
            Access denied. This wallet is not in the admin allowlist.
          </div>
        ) : (
          <Link
            href="/Admin/shelter-approved"
            className="mt-6 inline-flex rounded-full bg-stone-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-200/70 transition hover:-translate-y-0.5 hover:bg-[var(--color-orange)]"
          >
            Review shelter applications
          </Link>
        )}
      </main>
    </>
  );
}
