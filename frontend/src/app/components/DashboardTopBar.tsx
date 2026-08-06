"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { ConnectWallet } from "./ConnectWallet";

type NotificationPreview = {
  id: string;
  title: string;
  message: string;
  status: string;
  is_read: boolean;
  created_at: string;
  campaign_id: string | null;
  href?: string;
};

type DashboardTopBarProps = {
  role: string;
  onMenuClick?: () => void;
  isMenuOpen?: boolean;
  notificationHref?: string;
  notificationCount?: number;
  notificationPreview?: NotificationPreview[];
  onMarkAllNotificationsRead?: () => Promise<void> | void;
};

export function DashboardTopBar({
  role,
  onMenuClick,
  isMenuOpen,
  notificationHref,
  notificationCount,
  notificationPreview = [],
  onMarkAllNotificationsRead,
}: DashboardTopBarProps) {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement | null>(null);
  const [adminNotifications, setAdminNotifications] = useState<
    NotificationPreview[]
  >([]);
  const [adminNotificationCount, setAdminNotificationCount] = useState(0);
  const { address, isConnected } = useAppKitAccount();
  const isAdmin = role.toLowerCase() === "admin";
  const resolvedNotificationHref =
    notificationHref ?? (isAdmin ? "/Admin/notifications" : undefined);
  const resolvedNotificationPreview = isAdmin
    ? adminNotifications.slice(0, 6)
    : notificationPreview;
  const unreadCount = Number(
    isAdmin ? adminNotificationCount : (notificationCount ?? 0),
  );
  const hasUnread = unreadCount > 0;
  const adminReadStorageKey = address
    ? `pawchain:admin-notifications-read:${address.toLowerCase()}`
    : "";
  const adminClearedStorageKey = address
    ? `pawchain:admin-notifications-cleared:${address.toLowerCase()}`
    : "";

  const markAdminNotificationsRead = () => {
    if (!adminReadStorageKey) return;
    const readIds = adminNotifications.map((item) => item.id);
    window.localStorage.setItem(adminReadStorageKey, JSON.stringify(readIds));
    setAdminNotifications((current) =>
      current.map((item) => ({ ...item, is_read: true })),
    );
    setAdminNotificationCount(0);
  };

  const resolvedMarkAllNotificationsRead = isAdmin
    ? markAdminNotificationsRead
    : onMarkAllNotificationsRead;

  useEffect(() => {
    if (!isAdmin || !isConnected || !address) {
      if (isAdmin) {
        setAdminNotifications([]);
        setAdminNotificationCount(0);
      }
      return;
    }

    let active = true;
    const loadAdminNotifications = async () => {
      try {
        const response = await fetch(
          `/api/admin/notifications?walletAddress=${encodeURIComponent(address)}`,
          { cache: "no-store" },
        );
        const result = await response.json();
        if (!active || !response.ok) return;
        const storedReadIds = new Set<string>(
          JSON.parse(
            window.localStorage.getItem(adminReadStorageKey) || "[]",
          ) as string[],
        );
        const clearedIds = new Set<string>(
          JSON.parse(
            window.localStorage.getItem(adminClearedStorageKey) || "[]",
          ) as string[],
        );
        const notifications = (
          Array.isArray(result.notifications) ? result.notifications : []
        ).filter((item: NotificationPreview) => !clearedIds.has(item.id)).map((item: NotificationPreview) => ({
          ...item,
          is_read: storedReadIds.has(item.id),
        }));
        setAdminNotifications(notifications);
        setAdminNotificationCount(
          notifications.filter((item: NotificationPreview) => !item.is_read)
            .length,
        );
      } catch {
        // Keep the last successful notification state and retry automatically.
      }
    };

    void loadAdminNotifications();
    window.addEventListener("pawchain:admin-notifications-updated", loadAdminNotifications);
    const interval = window.setInterval(
      () => void loadAdminNotifications(),
      30_000,
    );
    return () => {
      active = false;
      window.removeEventListener("pawchain:admin-notifications-updated", loadAdminNotifications);
      window.clearInterval(interval);
    };
  }, [address, adminClearedStorageKey, adminReadStorageKey, isAdmin, isConnected]);

  useEffect(() => {
    if (!isNotificationOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setIsNotificationOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsNotificationOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isNotificationOpen]);

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
          {resolvedNotificationHref ? (
            <div ref={notificationRef} className="relative">
              <button
                type="button"
                aria-label="Open notifications"
                title="Notifications"
                onClick={() => setIsNotificationOpen((current) => !current)}
                suppressHydrationWarning
                className={[
                  "relative grid h-10 w-10 place-items-center rounded-2xl border bg-white text-slate-600 shadow-sm transition hover:border-orange-200 hover:bg-orange-50 hover:text-[var(--color-orange)]",
                  isNotificationOpen
                    ? "border-orange-200 bg-orange-50 text-[var(--color-orange)]"
                    : "border-orange-100",
                ].join(" ")}
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
                {hasUnread ? (
                  <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[var(--color-orange)] px-1.5 py-0.5 text-center text-[0.65rem] font-black leading-none text-white ring-2 ring-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </button>

              {isNotificationOpen ? (
                <div className="absolute right-0 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-[0_24px_70px_rgba(68,64,60,0.18)]">
                  <div className="flex items-center justify-between gap-3 border-b border-orange-100 bg-orange-50/45 px-4 py-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">
                        Notifications
                      </p>
                      <p className="text-sm font-black text-stone-950">
                        {hasUnread
                          ? isAdmin
                            ? `${unreadCount} pending reminder${unreadCount === 1 ? "" : "s"}`
                            : `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}`
                          : "All caught up"}
                      </p>
                    </div>
                    {hasUnread && resolvedMarkAllNotificationsRead ? (
                      <button
                        type="button"
                        onClick={() => void resolvedMarkAllNotificationsRead()}
                        suppressHydrationWarning
                        className="rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs font-black text-[var(--color-orange)] transition hover:bg-orange-50"
                      >
                        Mark all
                      </button>
                    ) : null}
                  </div>

                  <div className="max-h-80 overflow-y-auto p-2">
                    {resolvedNotificationPreview.length > 0 ? (
                      resolvedNotificationPreview.map((item) => (
                        <Link
                          key={item.id}
                          href={
                            item.href
                              ? item.href
                              : item.campaign_id
                                ? `/Donor/campaigns/${item.campaign_id}`
                                : resolvedNotificationHref
                          }
                          onClick={() => setIsNotificationOpen(false)}
                          className={[
                            "block rounded-xl px-3 py-3 transition hover:bg-orange-50",
                            item.is_read ? "bg-white" : "bg-orange-50/55",
                          ].join(" ")}
                        >
                          <div className="flex items-start gap-2">
                            {!item.is_read ? (
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-orange)]" />
                            ) : null}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-stone-950">
                                {item.title}
                              </p>
                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-500">
                                {item.message}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="px-4 py-7 text-center">
                        <p className="text-sm font-black text-stone-950">
                          No notifications yet
                        </p>
                        <p className="mt-1 text-xs font-semibold text-stone-500">
                          {isAdmin
                            ? "Review requests and Hero Donor certificate reminders will appear here."
                            : "Donation, refund, and milestone updates will appear here."}
                        </p>
                      </div>
                    )}
                  </div>

                  <Link
                    href={resolvedNotificationHref}
                    onClick={() => setIsNotificationOpen(false)}
                    className="block border-t border-orange-100 px-4 py-3 text-center text-sm font-black text-[var(--color-orange)] transition hover:bg-orange-50"
                  >
                    View all notifications
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}
          <ConnectWallet />
        </div>
      </div>
    </header>
  );
}
