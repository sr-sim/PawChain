"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { AdminSidebar } from "@/app/Admin/components/AdminSidebar";
import { DashboardTopBar } from "@/app/components/DashboardTopBar";

type AdminNotification = {
  id: string;
  title: string;
  message: string;
  status: string;
  is_read: boolean;
  created_at: string;
  href: string;
};

const formatDate = (value: string) => new Intl.DateTimeFormat("en-MY", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
}).format(new Date(value));

export default function AdminNotificationsPage() {
  const { address, isConnected } = useAppKitAccount();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [activeTab, setActiveTab] = useState<"All" | "Unread" | "Read">("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const storageKey = address ? `pawchain:admin-notifications-read:${address.toLowerCase()}` : "";
  const clearedStorageKey = address ? `pawchain:admin-notifications-cleared:${address.toLowerCase()}` : "";

  useEffect(() => {
    if (!address || !isConnected) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/admin/notifications?walletAddress=${encodeURIComponent(address)}`, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message ?? "Unable to load notifications.");
        const readIds = new Set<string>(JSON.parse(window.localStorage.getItem(storageKey) || "[]") as string[]);
        const clearedIds = new Set<string>(JSON.parse(window.localStorage.getItem(clearedStorageKey) || "[]") as string[]);
        if (active) setNotifications((Array.isArray(result.notifications) ? result.notifications : []).filter((item: AdminNotification) => !clearedIds.has(item.id)).map((item: AdminNotification) => ({ ...item, is_read: readIds.has(item.id) })));
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Unable to load notifications.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [address, clearedStorageKey, isConnected, storageKey]);

  const unreadCount = notifications.filter((item) => !item.is_read).length;
  const filtered = useMemo(() => activeTab === "Unread"
    ? notifications.filter((item) => !item.is_read)
    : activeTab === "Read"
      ? notifications.filter((item) => item.is_read)
      : notifications, [activeTab, notifications]);

  const markRead = (ids: string[]) => {
    if (!storageKey) return;
    const stored = new Set<string>(JSON.parse(window.localStorage.getItem(storageKey) || "[]") as string[]);
    ids.forEach((id) => stored.add(id));
    window.localStorage.setItem(storageKey, JSON.stringify([...stored]));
    setNotifications((current) => current.map((item) => ids.includes(item.id) ? { ...item, is_read: true } : item));
    window.dispatchEvent(new Event("pawchain:admin-notifications-updated"));
  };

  const clearAll = () => {
    if (!clearedStorageKey || !notifications.length) return;
    const cleared = new Set<string>(JSON.parse(window.localStorage.getItem(clearedStorageKey) || "[]") as string[]);
    notifications.forEach((item) => cleared.add(item.id));
    window.localStorage.setItem(clearedStorageKey, JSON.stringify([...cleared]));
    setNotifications([]);
    window.dispatchEvent(new Event("pawchain:admin-notifications-updated"));
  };

  return (
    <>
      <DashboardTopBar role="Admin" isMenuOpen={sidebarOpen} onMenuClick={() => setSidebarOpen((value) => !value)} />
      <AdminSidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      <main className={`min-h-screen bg-[var(--color-cream)] pt-16 transition-[padding] ${sidebarOpen ? "lg:pl-64" : ""}`}>
        <div className="mx-auto max-w-6xl space-y-5 px-4 py-7 sm:px-8">
          <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">Notifications</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-950">Admin notification inbox</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">Review shelter applications, campaign approvals, milestone proofs, and Hero Donor certificate reminders.</p>
          </section>

          <section className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">Admin activity</p><h2 className="mt-1 text-xl font-black text-stone-950">Latest updates</h2></div>
              <p className="text-xs font-medium text-stone-500">{filtered.length} shown · {unreadCount} unread</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(["All", "Unread", "Read"] as const).map((tab) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`rounded-full border px-4 py-2 text-sm font-black transition ${activeTab === tab ? "border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-200/70" : "border-orange-100 bg-orange-50/60 text-stone-700 hover:bg-orange-100"}`}>{tab}</button>)}
              <div className="ml-auto flex flex-wrap gap-2">
                <button type="button" onClick={() => markRead(notifications.map((item) => item.id))} disabled={!unreadCount} className="rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-black text-orange-600 transition hover:border-orange-500 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-45">Mark all as read</button>
                <button type="button" onClick={clearAll} disabled={!notifications.length} className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-black text-stone-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-45">Clear all</button>
              </div>
            </div>
            {error ? <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
            <div className="mt-4 divide-y divide-orange-100 overflow-hidden rounded-xl border border-orange-100">
              {loading ? <div className="p-8 text-center text-sm font-semibold text-stone-500">Loading notifications...</div> : filtered.length ? filtered.map((item) => (
                <article key={item.id} className={`grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center ${item.is_read ? "bg-white" : "bg-orange-50/40"}`}>
                  <div><div className="flex items-center gap-2">{!item.is_read ? <span className="h-2 w-2 rounded-full bg-orange-500" /> : null}<h3 className="text-sm font-bold text-stone-950">{item.title}</h3></div><p className="mt-1 text-xs font-medium text-stone-400">{formatDate(item.created_at)}</p><p className="mt-2 text-sm leading-6 text-stone-600">{item.message}</p></div>
                  <div className="flex flex-wrap gap-2"><Link href={item.href} onClick={() => markRead([item.id])} className="rounded-xl bg-orange-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-orange-600">Review now ↗</Link>{!item.is_read ? <button type="button" onClick={() => markRead([item.id])} className="rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 hover:bg-orange-50">Mark as read</button> : null}</div>
                </article>
              )) : <div className="p-8 text-center"><h3 className="font-black text-stone-950">No notifications found</h3><p className="mt-2 text-sm text-stone-500">New admin review requests will appear here.</p></div>}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
