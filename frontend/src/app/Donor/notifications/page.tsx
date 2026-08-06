"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  isNotificationAllowedByPreferences,
  loadDonorPreferences,
} from "@/lib/donor-preferences";

type DonorNotification = {
  id: string;
  campaign_id: string | null;
  title: string;
  message: string;
  status: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

const statusStyles: Record<string, string> = {
  info: "border-slate-200 bg-slate-50 text-slate-600",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  urgent: "border-red-200 bg-red-50 text-red-700",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={[
        "inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold capitalize",
        statusStyles[status] ?? statusStyles.info,
      ].join(" ")}
    >
      {status}
    </span>
  );
}

export default function DonorNotificationsPage() {
  const searchParams = useSearchParams();
  const walletAddress = searchParams.get("walletAddress") ?? "";
  const [notifications, setNotifications] = useState<DonorNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"All" | "Unread" | "Read">("All");
  const [preferenceVersion, setPreferenceVersion] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadNotifications() {
      setIsLoading(true);
      setErrorMessage("");

      if (!walletAddress) {
        setNotifications([]);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/donor/notifications?walletAddress=${encodeURIComponent(walletAddress)}`,
          { cache: "no-store" },
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message ?? "Unable to load notifications.");
        }

        if (isMounted) {
          setNotifications(
            Array.isArray(result.notifications) ? result.notifications : [],
          );
        }
      } catch (error) {
        if (isMounted) {
          setNotifications([]);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load notifications.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadNotifications();

    return () => {
      isMounted = false;
    };
  }, [walletAddress]);

  useEffect(() => {
    function handleStorage(event: Event) {
      if (
        !(event instanceof StorageEvent) ||
        event.key?.startsWith("pawchain:donor-settings")
      ) {
        setPreferenceVersion((current) => current + 1);
      }
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener("pawchain:donor-settings-changed", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        "pawchain:donor-settings-changed",
        handleStorage,
      );
    };
  }, []);

  async function markAsRead(notificationId: string) {
    try {
      const response = await fetch("/api/donor/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress,
          notificationId,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Unable to update notification.");
      }

      setNotifications((current) =>
        current.map((item) =>
          item.id === notificationId
            ? {
                ...item,
                is_read: true,
                read_at: result.notification?.read_at ?? new Date().toISOString(),
              }
            : item,
        ),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to update notification.",
      );
    }
  }

  async function markAllAsRead() {
    if (!walletAddress || unreadCount === 0) {
      return;
    }

    try {
      const response = await fetch("/api/donor/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress,
          markAll: true,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Unable to update notifications.");
      }

      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          is_read: true,
          read_at: item.read_at ?? readAt,
        })),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to update notifications.",
      );
    }
  }

  async function deleteNotification(notificationId: string) {
    if (!walletAddress || deletingId || isClearingAll) {
      return;
    }

    setDeletingId(notificationId);
    setErrorMessage("");

    try {
      const response = await fetch("/api/donor/notifications", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress,
          notificationId,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Unable to delete notification.");
      }

      setNotifications((current) =>
        current.filter((item) => item.id !== notificationId),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete notification.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function clearAllNotifications() {
    if (!walletAddress || notifications.length === 0 || isClearingAll) {
      return;
    }

    setIsClearingAll(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/donor/notifications", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress,
          clearAll: true,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Unable to clear notifications.");
      }

      setNotifications([]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to clear notifications.",
      );
    } finally {
      setIsClearingAll(false);
    }
  }

  const preferences = loadDonorPreferences(walletAddress);
  const preferenceVisibleNotifications = notifications.filter((item) =>
    isNotificationAllowedByPreferences(item, preferences),
  );
  const hiddenByPreferences =
    notifications.length - preferenceVisibleNotifications.length;
  const unreadCount = preferenceVisibleNotifications.filter(
    (item) => !item.is_read,
  ).length;
  const readCount = preferenceVisibleNotifications.length - unreadCount;
  const filteredNotifications =
    activeTab === "Unread"
      ? preferenceVisibleNotifications.filter((item) => !item.is_read)
      : activeTab === "Read"
        ? preferenceVisibleNotifications.filter((item) => item.is_read)
        : preferenceVisibleNotifications;
  void preferenceVersion;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
              Notifications
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-stone-950 sm:text-3xl">
              Donor notification inbox
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Read donor-specific milestone updates, report replies, and admin
              messages from PawChain.
            </p>
          </div>
          <Link
            href="/Donor/tracking"
            className="inline-flex w-fit items-center justify-center rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-900 transition hover:border-[var(--color-orange)] hover:bg-orange-50"
          >
            View tracking
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
              Inbox
            </p>
            <h2 className="mt-1 text-xl font-black text-stone-950">
              Latest updates
            </h2>
          </div>
          <p className="text-xs font-medium text-stone-500">
            {filteredNotifications.length} shown
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(["All", "Unread", "Read"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={[
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black transition",
                activeTab === tab
                  ? "relative z-10 scale-110 border-[var(--color-orange)] bg-[var(--color-orange)] text-white shadow-lg shadow-orange-200/70 ring-2 ring-orange-100"
                  : "border-orange-100 bg-orange-50/60 text-stone-700 hover:bg-orange-100",
              ].join(" ")}
            >
              <span className={`${activeTab === tab ? "h-2.5 w-2.5 bg-white ring-2 ring-white/30" : "h-1.5 w-1.5 bg-current"} rounded-full opacity-90 transition-all`} />
              {tab}
            </button>
          ))}
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={!walletAddress || unreadCount === 0}
              className="rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-black text-[var(--color-orange)] transition hover:border-[var(--color-orange)] hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Mark all as read
            </button>
            <button
              type="button"
              onClick={clearAllNotifications}
              disabled={!walletAddress || notifications.length === 0 || isClearingAll}
              className="rounded-full border border-red-100 bg-red-50 px-4 py-2 text-sm font-black text-red-700 transition hover:border-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isClearingAll ? "Clearing..." : "Clear all"}
            </button>
          </div>
        </div>

        {errorMessage ? (
          <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {errorMessage}
          </p>
        ) : null}

        {hiddenByPreferences > 0 ? (
          <p className="mt-4 rounded-xl border border-orange-100 bg-orange-50/40 px-3 py-2 text-sm font-semibold text-stone-600">
            {hiddenByPreferences} update{hiddenByPreferences === 1 ? "" : "s"} hidden by your notification settings.
          </p>
        ) : null}

        <div className="mt-4 divide-y divide-orange-100 overflow-hidden rounded-xl border border-orange-100">
          {isLoading ? (
            <div className="p-6 text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-orange-100 border-t-[var(--color-orange)]" />
              <p className="mt-3 text-sm font-semibold text-stone-600">
                Loading notifications...
              </p>
            </div>
          ) : filteredNotifications.length > 0 ? (
            filteredNotifications.map((item) => (
              <article
                key={item.id}
                className={[
                  "grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-start",
                  item.is_read ? "bg-white" : "bg-orange-50/35",
                ].join(" ")}
              >
                <div>
                  <div className="flex items-center gap-2">
                    {!item.is_read ? (
                      <span className="h-2 w-2 rounded-full bg-[var(--color-orange)]" />
                    ) : null}
                    <p className="text-sm font-semibold text-stone-950">
                      {item.title}
                    </p>
                  </div>
                  <p className="mt-1 text-xs font-medium text-stone-500">
                    {formatDate(item.created_at)}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    {item.message}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.campaign_id ? (
                      <Link
                        href={`/Donor/campaigns/${item.campaign_id}`}
                        className="rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-semibold text-[var(--color-orange)] transition hover:border-[var(--color-orange)] hover:bg-orange-50"
                      >
                        Open campaign
                      </Link>
                    ) : null}
                    {!item.is_read ? (
                      <button
                        type="button"
                        onClick={() => markAsRead(item.id)}
                        className="rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition hover:border-[var(--color-orange)] hover:bg-orange-50"
                      >
                        Mark as read
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <StatusPill status={item.status} />
                  <button
                    type="button"
                    onClick={() => deleteNotification(item.id)}
                    disabled={deletingId === item.id || isClearingAll}
                    aria-label={`Delete ${item.title}`}
                    title="Delete notification"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-orange-100 bg-white text-stone-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                      aria-hidden="true"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="p-6 text-center">
              <h3 className="text-base font-black text-stone-950">
                No donor notifications yet
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
                Updates that match your notification settings will appear here.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
