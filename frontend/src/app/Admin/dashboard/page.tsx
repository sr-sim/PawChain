"use client";

import { type CSSProperties, type ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAppKitAccount } from "@reown/appkit/react";
import { DashboardTopBar } from "@/app/components/DashboardTopBar";
import { AdminSidebar as SharedAdminSidebar } from "@/app/Admin/components/AdminSidebar";
import { useEthMyrRate } from "@/lib/use-eth-myr-rate";
import {
  getWalletStyle,
  saveWalletStyle,
  WalletStylePicker,
  type WalletStyleId,
} from "@/app/components/wallet/WalletStyle";

type CampaignRow = {
  id: string;
  title: string;
  campaign_status: string;
  urgency_level: string;
  current_amount: number | string | null;
  goal_amount: number | string;
  created_at: string;
};

type DashboardData = {
  summary: {
    totalCampaigns: number;
    pendingCampaigns: number;
    activeCampaigns: number;
    rejectedCampaigns: number;
    pendingMilestones: number;
    totalDonationsWei: string;
    totalFundsReleasedWei: string;
  };
  campaignStatusDistribution: { status: string; count: number }[];
  recentCampaigns: CampaignRow[];
  reviewQueue: {
    pendingShelterCount: number;
    pendingCampaigns: CampaignRow[];
    submittedMilestones: {
      id: string;
      campaign_id: string;
      title: string;
      status: string;
      created_at: string;
    }[];
    pendingShelters: {
      id: string;
      shelter_name: string;
      status: string;
      created_at: string;
    }[];
  };
  dataSources: Record<string, "live" | "demo" | "unavailable">;
};

const navigation = [
  "Dashboard",
  "Shelter Verification",
  "Campaign Management",
  "Donor Management",
  "Milestone Verification",
  "Transactions",
  "Analytics",
];

const statusMeta: Record<string, { label: string; color: string; classes: string }> = {
  pending_approval: {
    label: "Pending",
    color: "rgba(var(--color-gold-rgb),0.72)",
    classes: "bg-[rgba(var(--color-gold-rgb),0.16)] text-stone-950 ring-[rgba(var(--color-gold-rgb),0.45)]",
  },
  active: {
    label: "Active",
    color: "rgba(var(--color-orange-rgb),0.55)",
    classes: "bg-[rgba(var(--color-orange-rgb),0.12)] text-[var(--color-orange)] ring-[rgba(var(--color-orange-rgb),0.35)]",
  },
  rejected: {
    label: "Rejected",
    color: "rgba(var(--color-black-rgb),0.22)",
    classes: "bg-stone-100 text-[var(--color-black)] ring-stone-300",
  },
  completed: {
    label: "Completed",
    color: "rgba(var(--color-gold-rgb),0.36)",
    classes: "bg-[rgba(var(--color-peach-rgb),0.3)] text-stone-950 ring-[var(--color-peach)]",
  },
  closed: {
    label: "Closed",
    color: "rgba(var(--color-cream-rgb),1)",
    classes: "bg-[var(--color-cream)] text-stone-700 ring-[var(--color-gold)]",
  },
};

function formatMoney(value: number | string | null) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    Dashboard: <path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z" />,
    "Shelter Verification": <path d="M4 20v-8l8-7 8 7v8h-6v-5h-4v5H4Zm5-11V5h6v4" />,
    "Campaign Management": <path d="M5 19V7l12-3v18L5 19Zm12-10h2a3 3 0 0 1 0 6h-2" />,
    "Milestone Verification": <path d="m5 12 4 4L19 6M5 5h6M5 19h14" />,
    Transactions: <path d="M4 7h16M4 12h16M4 17h10M17 15l3 2-3 2" />,
    "Donor Management": <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 10c1-5 3-7 7-7s6 2 7 7m1-10a3 3 0 1 0 0-6m1 9c2 .7 3.3 3 4 6" />,
    Analytics: <path d="M4 20V10m6 10V4m6 16v-7m5 7H2" />,
  };
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function AdminSidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const sections = [
    { label: "Overview", items: navigation.slice(0, 1) },
    { label: "Management", items: navigation.slice(1, 4) },
    { label: "Platform", items: navigation.slice(4) },
  ];
  return (
    <aside
      aria-label="Admin navigation"
      className={`fixed bottom-0 left-0 top-16 z-40 overflow-hidden border-r border-orange-100 bg-white/95 shadow-[14px_0_36px_rgba(155,86,20,0.05)] transition-[width] duration-300 ${open ? "w-64" : "w-0"}`}
    >
      <div className="donor-nav-rail flex h-full w-full min-w-64 flex-col px-4 py-4">
        <nav className="flex-1 space-y-4 overflow-y-auto">
          {sections.map((section) => (
            <div key={section.label}>
              <p className="mb-1.5 px-2 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {section.label}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = item === "Dashboard";
                  const shelterLink = item === "Shelter Verification";
                  const row = (
                    <>
                      <span className={`grid h-4.5 w-4.5 shrink-0 place-items-center [&>svg]:h-full [&>svg]:w-full ${active ? "text-[var(--color-orange)]" : "text-slate-400"}`}>
                        <Icon name={item} />
                      </span>
                      <span className="truncate">{item}</span>
                      {!active && !shelterLink ? <span className="ml-auto text-[9px] font-bold uppercase tracking-wide text-slate-400">Soon</span> : null}
                    </>
                  );
                  const classes = [
                    "donor-nav-row flex min-h-10 items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium",
                    active
                      ? "border-orange-200 bg-orange-50/55 text-[var(--color-orange)] shadow-[inset_3px_0_0_var(--color-orange)]"
                      : shelterLink
                        ? "border-transparent text-slate-700 hover:border-orange-100 hover:bg-orange-50"
                        : "cursor-not-allowed border-transparent text-slate-400",
                  ].join(" ");
                  return shelterLink ? <Link key={item} href="/Admin/shelter-verification" onClick={onNavigate} className={classes}>{row}</Link> : <div key={item} className={classes}>{row}</div>;
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-4 border-t border-orange-100 pt-3">
          <Link href="/" onClick={onNavigate} className="donor-nav-row flex min-h-10 items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-slate-700 hover:border-orange-100 hover:bg-orange-50/70 hover:text-stone-950">
            <span className="grid h-5 w-5 place-items-center text-slate-500"><svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m10 17-5-5 5-5" /><path d="M5 12h12" /><path d="M14 4h5v16h-5" /></svg></span>
            <span>Logout</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}

function SummaryCard({ label, value, note, tone }: { label: string; value: string | number; note: string; tone: string }) {
  return (
    <article className="relative overflow-hidden rounded-[1.4rem] border border-orange-100 bg-white p-5 shadow-[0_14px_38px_rgba(97,55,17,0.07)]">
      <span className={`absolute right-0 top-0 h-20 w-20 translate-x-7 -translate-y-7 rounded-full ${tone}`} />
      <p className="relative text-xs font-black uppercase tracking-[0.14em] text-stone-500">{label}</p>
      <p className="relative mt-3 text-3xl font-black tracking-tight text-stone-950">{value}</p>
      <p className="relative mt-2 text-xs font-bold text-stone-500">{note}</p>
    </article>
  );
}

function DashboardSkeleton() {
  return <div className="animate-pulse space-y-6"><div className="h-28 rounded-[2rem] bg-orange-100/70" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 7 }).map((_, index) => <div key={index} className="h-36 rounded-[1.4rem] bg-white" />)}</div><div className="grid gap-6 xl:grid-cols-5"><div className="h-96 rounded-[1.6rem] bg-white xl:col-span-3" /><div className="h-96 rounded-[1.6rem] bg-white xl:col-span-2" /></div></div>;
}

export default function AdminDashboard() {
  const {
    weiToMyr,
    source: rateSource,
  } = useEthMyrRate();
  const { address, isConnected } = useAppKitAccount();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [denied, setDenied] = useState(false);
  const [walletStyle, setWalletStyle] = useState<WalletStyleId>("classic");
  const [walletStyleMessage, setWalletStyleMessage] = useState("");

  useEffect(() => {
    setWalletStyle(getWalletStyle(address));
  }, [address]);

  function customizeWallet(style: WalletStyleId) {
    setWalletStyle(style);
    saveWalletStyle(address, style);
    setWalletStyleMessage("Wallet appearance updated.");
    window.setTimeout(() => setWalletStyleMessage(""), 2500);
  }

  useEffect(() => {
    if (!address || !isConnected) {
      setData(null);
      setError("");
      setDenied(false);
      return;
    }
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError("");
      setDenied(false);
      try {
        const response = await fetch(`/api/admin/dashboard?walletAddress=${encodeURIComponent(address)}`, { signal: controller.signal });
        const result = await response.json();
        if (response.status === 403) setDenied(true);
        if (!response.ok) throw new Error(result.message || "Unable to load admin analytics.");
        setData(result);
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name !== "AbortError") setError(loadError.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [address, isConnected]);

  const chartStyle = useMemo(() => {
    if (!data) return {};
    const total = data.summary.totalCampaigns;
    if (!total) return { background: "var(--color-cream)" };
    let cursor = 0;
    const slices = data.campaignStatusDistribution.filter((item) => item.count > 0).map((item) => {
      const start = cursor;
      cursor += (item.count / total) * 100;
      return `${statusMeta[item.status]?.color ?? "var(--color-peach)"} ${start}% ${cursor}%`;
    });
    return { background: `conic-gradient(${slices.join(", ")})` };
  }, [data]);

  return (
    <>
      <DashboardTopBar role="Admin" onMenuClick={() => setSidebarOpen((value) => !value)} isMenuOpen={sidebarOpen} />
      <SharedAdminSidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      <main className={`min-h-screen bg-[var(--color-cream)] px-4 pb-12 pt-24 text-stone-950 transition-[margin] duration-300 sm:px-8 ${sidebarOpen ? "lg:ml-64" : "ml-0"}`}>
        <div className="mx-auto max-w-[1500px]">
          {!isConnected || !address ? (
            <section className="grid min-h-[68vh] place-items-center"><div className="max-w-lg rounded-[2rem] border border-orange-100 bg-white p-9 text-center shadow-xl shadow-orange-200/30"><span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-orange-50 text-3xl">🔐</span><h1 className="mt-5 text-3xl font-black">Admin dashboard</h1><p className="mt-3 font-bold leading-7 text-stone-500">Connect your authorized admin wallet to view live platform analytics.</p></div></section>
          ) : loading ? <DashboardSkeleton /> : denied ? (
            <section className="grid min-h-[68vh] place-items-center"><div className="max-w-lg rounded-[2rem] border border-orange-100 bg-white p-9 text-center shadow-xl shadow-orange-200/30"><span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[var(--color-cream)] text-3xl text-[var(--color-orange)]">!</span><h1 className="mt-5 text-3xl font-black">Access denied</h1><p className="mt-3 font-bold leading-7 text-stone-500">The connected wallet does not have PawChain administrator access.</p></div></section>
          ) : error || !data ? (
            <section className="grid min-h-[68vh] place-items-center"><div className="max-w-lg rounded-[2rem] border border-orange-100 bg-white p-9 text-center shadow-xl shadow-orange-200/30"><h1 className="text-2xl font-black">Analytics unavailable</h1><p className="mt-3 font-bold text-stone-500">{error || "No dashboard data was returned."}</p><button type="button" onClick={() => window.location.reload()} className="mt-6 rounded-full bg-stone-950 px-5 py-3 text-sm font-black text-white">Try again</button></div></section>
          ) : (
            <div className="flex flex-col gap-6">
              <header className="relative overflow-hidden rounded-[2rem] border border-orange-100 bg-[linear-gradient(120deg,var(--color-white)_0%,var(--color-cream)_58%,var(--color-peach)_100%)] px-6 py-7 text-stone-950 shadow-xl shadow-orange-200/30 sm:px-8">
                <div className="absolute -right-10 -top-20 h-64 w-64 rounded-full bg-[rgba(var(--color-orange-rgb),0.14)] blur-3xl" />
                <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--color-orange)]">Platform command centre</p>
                    <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Good to see you, Admin.</h1>
                    <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-stone-600">Monitor campaign health, review priorities, and fund transparency from one live overview.</p>
                  </div>
                </div>
              </header>

              <section className="order-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard label="Total campaigns" value={data.summary.totalCampaigns} note="Across all campaign statuses" tone="bg-orange-100" />
                <SummaryCard label="Pending approvals" value={data.summary.pendingCampaigns} note="Campaigns awaiting review" tone="bg-[rgba(var(--color-gold-rgb),0.32)]" />
                <SummaryCard label="Active campaigns" value={data.summary.activeCampaigns} note="Approved and fundraising" tone="bg-[rgba(var(--color-orange-rgb),0.24)]" />
                <SummaryCard label="Rejected campaigns" value={data.summary.rejectedCampaigns} note="Require shelter revision" tone="bg-stone-200" />
                <SummaryCard label="Milestone reviews" value={data.summary.pendingMilestones} note="Submitted proof awaiting review" tone="bg-[rgba(var(--color-peach-rgb),0.55)]" />
                <SummaryCard label="Donations received" value={formatMoney(weiToMyr(data.summary.totalDonationsWei))} note={`Approx. live MYR · ${rateSource === "coingecko" ? "CoinGecko" : "configured fallback rate"}`} tone="bg-[rgba(var(--color-cream-rgb),0.9)]" />
                <SummaryCard label="Funds released" value={formatMoney(weiToMyr(data.summary.totalFundsReleasedWei))} note={`Approx. live MYR · ${rateSource === "coingecko" ? "CoinGecko" : "configured fallback rate"}`} tone="bg-[rgba(var(--color-gold-rgb),0.22)]" />
              </section>

              <section className="order-2 grid gap-6 xl:grid-cols-5">
                <article className="rounded-[1.6rem] border border-orange-100 bg-white p-5 shadow-[0_14px_38px_rgba(97,55,17,0.07)] xl:col-span-3">
                  <div className="text-center"><span className="inline-flex rounded-full bg-[rgba(var(--color-orange-rgb),0.1)] px-3 py-0.5 text-xs font-black leading-none text-[var(--color-orange)] ring-1 ring-[rgba(var(--color-orange-rgb),0.3)]">Live data</span><p className="mt-2 text-xs font-black uppercase leading-none tracking-[0.16em] text-[var(--color-orange)]">Live analytics</p><h2 className="mt-0.5 text-2xl font-black leading-tight">Campaign status overview</h2></div>
                  {data.summary.totalCampaigns ? <div className="mt-4"><div className="admin-chart-enter relative mx-auto h-46 w-44 rounded-full shadow-[0_10px_30px_rgba(244,183,56,0.18)]" style={chartStyle as CSSProperties}><div className="admin-chart-centre absolute inset-7 grid place-items-center rounded-full bg-white text-center shadow-inner"><div><p className="text-4xl font-black leading-none">{data.summary.totalCampaigns}</p><p className="mt-1 text-xs font-bold leading-none text-stone-500">Campaigns</p></div></div></div><div className="mx-auto mt-4 grid max-w-2xl gap-2 sm:grid-cols-2">{data.campaignStatusDistribution.filter((item) => item.count > 0).map((item) => { const meta = statusMeta[item.status]; return <div key={item.status} className="flex items-center gap-2.5 rounded-xl border border-orange-100 bg-[rgba(var(--color-cream-rgb),0.3)] px-3 py-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white" style={{ backgroundColor: meta?.color }} /><span className="min-w-0 flex-1 truncate text-sm font-bold leading-none">{meta?.label ?? item.status}</span><span className="text-sm font-black leading-none">{item.count} {item.count === 1 ? "campaign" : "campaigns"}</span></div>; })}</div></div> : <div className="mt-4 grid min-h-44 place-items-center rounded-3xl border border-dashed border-orange-200 bg-orange-50/50 text-center"><div><p className="text-lg font-black">No campaigns yet</p><p className="mt-1 text-sm font-bold text-stone-500">Campaign distribution will appear after the first submission.</p></div></div>}
                </article>

                <article className="rounded-[1.6rem] border border-orange-100 bg-white p-5 shadow-[0_14px_38px_rgba(97,55,17,0.07)] xl:col-span-2">
                  <p className="text-xs font-black uppercase leading-none tracking-[0.16em] text-[var(--color-orange)]">Shortcuts</p>
                  <h2 className="mt-0.5 text-2xl font-black leading-tight">Quick access</h2>
                  <p className="mt-1 text-xs font-bold text-stone-500">Common admin tasks in one place.</p>
                  <div className="mt-4 grid gap-2">
                    {[
                      { name: "Shelter Verification", detail: `${data.reviewQueue.pendingShelterCount} waiting` },
                      { name: "Campaign Management", detail: `${data.summary.pendingCampaigns} pending` },
                      { name: "Milestone Verification", detail: `${data.summary.pendingMilestones} submitted` },
                      { name: "Transactions", detail: "Fund activity" },
                    ].map((item) => (
                      <div key={item.name} title={`${item.name} — Coming soon`} className="flex min-w-0 cursor-not-allowed items-center gap-2.5 rounded-xl border border-orange-100 bg-[rgba(var(--color-cream-rgb),0.3)] px-3 py-2 transition hover:bg-[rgba(var(--color-peach-rgb),0.18)]">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[var(--color-orange)] shadow-sm ring-1 ring-orange-100"><Icon name={item.name} /></span>
                        <span className="min-w-0"><span className="block truncate text-sm font-black leading-tight text-stone-900">{item.name}</span><span className="mt-0.5 block truncate text-xs font-bold leading-none text-stone-500">{item.detail}</span></span>
                      </div>
                    ))}
                  </div>
                </article>
              </section>

              <section className="order-5 overflow-hidden rounded-[1.4rem] border border-orange-100 bg-white shadow-[0_14px_38px_rgba(97,55,17,0.07)]">
                <div className="flex flex-col gap-4 border-b border-orange-100 bg-orange-50/35 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5"><div><p className="text-[11px] font-black uppercase tracking-wider text-[var(--color-orange)]">Latest activity</p><h2 className="mt-1 text-base font-black text-stone-950">Recent campaigns</h2><p className="mt-0.5 text-xs font-medium text-stone-500">Newest submissions first</p></div><Link href="/Admin/campaign-management" className="inline-flex w-fit items-center gap-2 rounded-lg border border-orange-200 bg-white px-3 py-2 text-xs font-bold text-[var(--color-orange)] transition hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"><span>View campaign management</span><span aria-hidden="true">→</span></Link></div>
                {data.recentCampaigns.length ? <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="border-b border-orange-100 bg-[rgba(var(--color-cream-rgb),0.55)]"><tr className="text-[11px] uppercase tracking-wider text-stone-500"><th className="px-5 py-3 font-black">Campaign</th><th className="px-5 py-3 font-black">Status</th><th className="px-5 py-3 font-black">Urgency</th><th className="px-5 py-3 font-black">Progress</th><th className="px-5 py-3 text-right font-black">Submitted</th></tr></thead><tbody className="divide-y divide-orange-100">{data.recentCampaigns.map((campaign) => { const goal = Number(campaign.goal_amount || 0); const current = Number(campaign.current_amount || 0); const progress = goal ? Math.min(100, Math.round((current / goal) * 100)) : 0; const meta = statusMeta[campaign.campaign_status]; return <tr key={campaign.id} className="transition hover:bg-orange-50/35"><td className="px-5 py-4"><p className="max-w-xs truncate font-semibold">{campaign.title}</p><p className="mt-1 text-xs font-medium text-stone-400">{formatMoney(current)} of {formatMoney(goal)}</p></td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${meta?.classes ?? "bg-stone-100 text-stone-700 ring-stone-200"}`}>{meta?.label ?? campaign.campaign_status}</span></td><td className="px-5 py-4 text-sm font-medium capitalize">{campaign.urgency_level}</td><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="h-2 w-24 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-[var(--color-orange)]" style={{ width: `${progress}%` }} /></div><span className="text-xs font-bold">{progress}%</span></div></td><td className="px-5 py-4 text-right text-sm font-medium text-stone-500">{formatDate(campaign.created_at)}</td></tr>; })}</tbody></table></div> : <div className="p-12 text-center text-sm font-semibold text-stone-500">No campaign submissions to display.</div>}
              </section>

              <section className="order-6 rounded-[1.6rem] border border-orange-100 bg-white p-6 shadow-[0_14px_38px_rgba(97,55,17,0.07)]">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">
                      Wallet appearance
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-stone-950">
                      Customize your admin wallet
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-stone-500">
                      Your selection updates wallet buttons across PawChain on this device.
                    </p>
                  </div>
                  {walletStyleMessage ? (
                    <p className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 ring-1 ring-emerald-200" role="status">
                      {walletStyleMessage}
                    </p>
                  ) : null}
                </div>
                <div className="mt-5">
                  <WalletStylePicker
                    address={address}
                    value={walletStyle}
                    onChange={customizeWallet}
                  />
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
