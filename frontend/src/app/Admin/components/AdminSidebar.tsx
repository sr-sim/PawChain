"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const items = [
  ["Dashboard", "/Admin/dashboard"],
  ["Campaign Management", "/Admin/campaign-management"],
  ["User Management", "/Admin/user-management"],
  ["Transactions", "/Admin/transactions"],
  ["Analytics & Insights", "/Admin/analytics"],
] as const;

export function AdminSidebar({
  open,
  onNavigate,
}: {
  open: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const shelterActive = pathname.startsWith("/Admin/shelter-");
  const [shelterOpen, setShelterOpen] = useState(shelterActive);
  useEffect(() => {
    if (shelterActive) setShelterOpen(true);
  }, [shelterActive]);

  const row =
    "flex min-h-10 items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium transition";
  return (
    <aside
      aria-label="Admin navigation"
      className={`fixed bottom-0 left-0 top-16 z-40 overflow-hidden border-r border-orange-100 bg-white/95 shadow-[14px_0_36px_rgba(155,86,20,0.05)] transition-[width] duration-300 ${open ? "w-64" : "w-0"}`}
    >
      <div className="flex h-full min-w-64 flex-col px-4 py-4">
        <nav className="flex-1 space-y-1 overflow-y-auto">
          <p className="mb-2 px-2 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Admin portal
          </p>
          <Link
            href="/Admin/dashboard"
            onClick={onNavigate}
            className={`${row} ${pathname === "/Admin/dashboard" ? "border-orange-200 bg-orange-50/55 text-[var(--color-orange)] shadow-[inset_3px_0_0_var(--color-orange)]" : "border-transparent text-slate-700 hover:bg-orange-50"}`}
          >
            ▦ <span>Dashboard</span>
          </Link>
          <button
            type="button"
            onClick={() => setShelterOpen((value) => !value)}
            className={`${row} w-full ${shelterActive ? "border-orange-100 bg-orange-50/30 text-[var(--color-orange)]" : "border-transparent text-slate-700 hover:bg-orange-50"}`}
          >
            <span>⌂</span>
            <span>Shelter Management</span>
            <span
              className={`ml-auto transition ${shelterOpen ? "rotate-90" : ""}`}
            >
              ›
            </span>
          </button>
          {shelterOpen ? (
            <div className="ml-4 space-y-1 border-l border-orange-100 pl-3">
              <Link
                href="/Admin/shelter-verification"
                onClick={onNavigate}
                className={`${row} ${pathname === "/Admin/shelter-verification" ? "border-orange-200 bg-orange-50/55 text-[var(--color-orange)]" : "border-transparent text-slate-600 hover:bg-orange-50"}`}
              >
                Shelter Verification
              </Link>
              <Link
                href="/Admin/shelter-management/verified"
                onClick={onNavigate}
                className={`${row} ${pathname === "/Admin/shelter-management/verified" ? "border-orange-200 bg-orange-50/55 text-[var(--color-orange)]" : "border-transparent text-slate-600 hover:bg-orange-50"}`}
              >
                Verified Shelters
              </Link>
            </div>
          ) : null}
          <Link
            href="/Admin/campaign-management"
            onClick={onNavigate}
            className={`${row} ${pathname === "/Admin/campaign-management" ? "border-orange-200 bg-orange-50/55 text-[var(--color-orange)]" : "border-transparent text-slate-700 hover:bg-orange-50"}`}
          >
            ○ <span>Campaign Management</span>
          </Link>
          <Link
            href="/Admin/user-management"
            onClick={onNavigate}
            className={`${row} ${pathname === "/Admin/user-management" ? "border-orange-200 bg-orange-50/55 text-[var(--color-orange)] shadow-[inset_3px_0_0_var(--color-orange)]" : "border-transparent text-slate-700 hover:bg-orange-50"}`}
          >
            <span>○</span>
            <span>User Management</span>
          </Link>
          <Link
            href="/Admin/transactions"
            onClick={onNavigate}
            className={`${row} ${pathname === "/Admin/transactions" ? "border-orange-200 bg-orange-50/55 text-[var(--color-orange)] shadow-[inset_3px_0_0_var(--color-orange)]" : "border-transparent text-slate-700 hover:bg-orange-50"}`}
          >
            <span>↔</span>
            <span>Transactions</span>
          </Link>
          <Link
            href="/Admin/analytics"
            onClick={onNavigate}
            className={`${row} ${pathname === "/Admin/analytics" ? "border-orange-200 bg-orange-50/55 text-[var(--color-orange)] shadow-[inset_3px_0_0_var(--color-orange)]" : "border-transparent text-slate-700 hover:bg-orange-50"}`}
          >
            <span>⌁</span>
            <span>Analytics &amp; Insights</span>
          </Link>
          {items.slice(2).filter(([, href]) => !href).map(([label]) => (
            <div
              key={label}
              className={`${row} cursor-not-allowed border-transparent text-slate-400`}
            >
              <span>○</span>
              <span>{label}</span>
              <span className="ml-auto text-[9px] font-bold uppercase">
                Soon
              </span>
            </div>
          ))}
        </nav>
        <Link
          href="/"
          className="border-t border-orange-100 px-3 pt-4 text-sm font-bold text-slate-600"
        >
          ← Logout
        </Link>
      </div>
    </aside>
  );
}
