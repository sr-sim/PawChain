"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const notifications = [
  {
    title: "Treatment payment proof submitted",
    campaignId: "medical-recovery",
    campaign: "Medical Recovery Fund",
    time: "Today, 10:24 AM",
    status: "Under review",
    read: false,
    description:
      "Safe Tails Rescue uploaded invoice evidence for the second milestone.",
  },
  {
    title: "Food supplier invoice approved",
    campaignId: "food-support",
    campaign: "Emergency Food Support",
    time: "Yesterday, 4:10 PM",
    status: "Approved",
    read: true,
    description:
      "The first milestone proof was accepted and the related fund release is completed.",
  },
  {
    title: "Kennel setup proof pending",
    campaignId: "kennel-upgrade",
    campaign: "Warm Kennel Upgrade",
    time: "21 Jun 2026",
    status: "Pending proof",
    read: false,
    description:
      "The shelter has not uploaded the next milestone evidence yet.",
  },
];

const tabs = ["All", "Unread", "Read"];

const statusStyles: Record<string, string> = {
  Approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Under review": "border-amber-200 bg-amber-50 text-amber-700",
  "Pending proof": "border-slate-200 bg-slate-50 text-slate-600",
};

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={[
        "inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold",
        statusStyles[status] ?? "border-slate-200 bg-slate-50 text-slate-600",
      ].join(" ")}
    >
      {status}
    </span>
  );
}

export default function DonorNotificationsPage() {
  const [activeTab, setActiveTab] = useState("All");
  const [readTitles, setReadTitles] = useState<string[]>([]);
  const filteredNotifications = useMemo(() => {
    const withReadState = notifications.map((item) => ({
      ...item,
      read: item.read || readTitles.includes(item.title),
    }));

    if (activeTab === "Unread") {
      return withReadState.filter((item) => !item.read);
    }

    if (activeTab === "Read") {
      return withReadState.filter((item) => item.read);
    }

    return withReadState;
  }, [activeTab, readTitles]);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
          Notifications
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-stone-950 sm:text-3xl">
          Campaign milestone updates
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          Review proof submissions, approval updates, and release statuses for
          campaigns you donated to.
        </p>
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
            {filteredNotifications.length} updates
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={[
                "rounded-xl border px-3 py-2 text-xs font-semibold transition",
                activeTab === tab
                  ? "border-[var(--color-orange)] bg-orange-50 text-[var(--color-orange)]"
                  : "border-orange-100 bg-white text-stone-600 hover:border-orange-200",
              ].join(" ")}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mt-4 divide-y divide-orange-100 overflow-hidden rounded-xl border border-orange-100">
          {filteredNotifications.map((item) => (
            <article
              key={`${item.campaign}-${item.title}`}
              className={[
                "grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-start",
                item.read ? "bg-white" : "bg-orange-50/30",
              ].join(" ")}
            >
              <div>
                <div className="flex items-center gap-2">
                  {!item.read ? (
                    <span className="h-2 w-2 rounded-full bg-[var(--color-orange)]" />
                  ) : null}
                  <p className="text-sm font-semibold text-stone-950">
                    {item.title}
                  </p>
                </div>
                <p className="mt-1 text-xs font-medium text-stone-500">
                  {item.campaign} - {item.time}
                </p>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  {item.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/Donor/campaigns/${item.campaignId}`}
                    className="rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-semibold text-[var(--color-orange)] transition hover:border-[var(--color-orange)] hover:bg-orange-50"
                  >
                    Open campaign
                  </Link>
                  <Link
                    href="/Donor/tracking"
                    className="rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition hover:border-[var(--color-orange)] hover:bg-orange-50"
                  >
                    View proof
                  </Link>
                  {!item.read ? (
                    <button
                      type="button"
                      onClick={() =>
                        setReadTitles((current) => [...current, item.title])
                      }
                      className="rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition hover:border-[var(--color-orange)] hover:bg-orange-50"
                    >
                      Mark as read
                    </button>
                  ) : null}
                </div>
              </div>
              <StatusPill status={item.status} />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
