"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { formatEther } from "viem";
import { useAppKitAccount } from "@reown/appkit/react";
import { AdminSidebar } from "@/app/Admin/components/AdminSidebar";
import { DashboardTopBar } from "@/app/components/DashboardTopBar";
import { useEthMyrRate } from "@/lib/use-eth-myr-rate";

type AnalyticsData = {
  range: { from: string; to: string; period: string };
  campaigns: { id: string; title: string }[];
  financial: {
    donatedWei: string;
    donatedMyr: number;
    releasedWei: string;
    releasedMyr: number;
    lockedWei: string;
    lockedMyr: number;
    refundedWei: string;
    refundedMyr: number;
    donationChange: number;
  };
  donorMetrics: {
    donationCount: number;
    uniqueDonors: number;
    firstTimeDonors: number;
    returningDonors: number;
    averageDonationEth: number;
    returningDonorRate: number;
  };
  trend: {
    date: string;
    amountEth: number;
    amountMyr: number;
    count: number;
    uniqueDonors: number;
  }[];
  campaignSummary: {
    active: number;
    completed: number;
    fullyFunded: number;
    approachingDeadline: number;
    underperforming: number;
  };
  campaignPerformance: {
    id: string;
    title: string;
    status: string;
    raisedEth: number;
    raisedMyr: number;
    goalEth: number;
    progress: number;
    donors: number;
    refundRate: number;
    deadline: string | null;
  }[];
  fundDistribution: {
    label: string;
    amountEth: number;
    amountMyr: number;
  }[];
  milestoneMetrics: {
    statuses: { status: string; count: number }[];
    averageReviewHours: number;
    delayed: number;
    readyForRelease: number;
  };
  shelterMetrics: {
    verified: number;
    active: number;
    shelters: {
      id: string;
      name: string;
      active: boolean;
      campaigns: number;
      raisedEth: number;
      completionRate: number;
      refundRate: number;
    }[];
  };
  blockchainHealth: {
    confirmed: number;
    pending: number;
    failed: number;
    actionTypes: { type: string; count: number }[];
  };
};

const money = (value: number) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    currencyDisplay: "code",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const eth = (value: string | number) => {
  const amount = typeof value === "string" ? Number(formatEther(BigInt(value || "0"))) : value;
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(amount)} ETH`;
};

const percent = (value: number) =>
  `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value)}%`;

function Panel({
  title,
  description,
  action,
  children,
  className = "",
  contentClassName = "",
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={`overflow-hidden rounded-[1.4rem] border border-orange-100 bg-white p-5 shadow-[0_14px_38px_rgba(97,55,17,0.07)] ${className}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-black text-stone-950">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-stone-500">{description}</p>
        </div>
        {action}
      </div>
      <div className={`mt-5 ${contentClassName}`}>{children}</div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  secondary,
  change,
  tone = "orange",
}: {
  label: string;
  value: string;
  secondary: string;
  change?: number;
  tone?: "orange" | "emerald" | "blue" | "stone";
}) {
  const colors = {
    orange: "bg-orange-500",
    emerald: "bg-emerald-500",
    blue: "bg-sky-500",
    stone: "bg-stone-500",
  };
  return (
    <article className="relative overflow-hidden rounded-2xl border border-orange-100 bg-white px-4 py-3.5 shadow-[0_10px_28px_rgba(97,55,17,0.06)]">
      <span className={`absolute inset-y-0 left-0 w-1 ${colors[tone]}`} />
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-stone-500">{label}</p>
      <p className="mt-1.5 text-xl font-black tracking-tight text-stone-950">{value}</p>
      <div className="mt-0.5 flex flex-wrap items-center gap-2">
        <p className="text-[11px] font-medium text-stone-400">{secondary}</p>
      </div>
    </article>
  );
}

function TrendChart({ data }: { data: AnalyticsData["trend"] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  if (!data.length) {
    return <EmptyState text="Donation activity will appear after confirmed donations in this period." />;
  }
  const width = 760;
  const height = 250;
  const padding = 34;
  const maxEth = Math.max(...data.map((item) => item.amountEth), 0.000001);
  const maxCount = Math.max(...data.map((item) => item.count), 1);
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const x = (index: number) =>
    padding + (data.length === 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth);
  const linePoints = data
    .map((item, index) => `${x(index)},${padding + plotHeight - (item.count / maxCount) * plotHeight}`)
    .join(" ");
  const barWidth = Math.max(5, Math.min(28, plotWidth / Math.max(data.length, 1) - 5));

  return (
    <div>
      <div className="mb-3 flex gap-4 text-[11px] font-semibold text-stone-500">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-orange-300" /> ETH donated</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-stone-800" /> Donation count</span>
      </div>
      <div className="overflow-x-auto">
        <div className="relative min-w-[620px]" onMouseLeave={() => setHoveredIndex(null)}>
        <svg viewBox={`0 0 ${width} ${height}`} className="block w-full" role="img" aria-label="ETH donated and donation count over time">
          {[0, 1, 2, 3].map((line) => (
            <line key={line} x1={padding} x2={width - padding} y1={padding + (plotHeight / 3) * line} y2={padding + (plotHeight / 3) * line} stroke="#e7e5e4" strokeWidth="1" />
          ))}
          {data.map((item, index) => {
            const barHeight = (item.amountEth / maxEth) * plotHeight;
            return (
              <g key={item.date}>
                <rect x={x(index) - barWidth / 2} y={padding + plotHeight - barHeight} width={barWidth} height={barHeight} rx="4" fill="#fdba74">
                  <title>{`${item.date}: ${eth(item.amountEth)}, ${item.count} donations`}</title>
                </rect>
                {(index === 0 || index === data.length - 1 || index % Math.ceil(data.length / 5) === 0) ? (
                  <text x={x(index)} y={height - 8} textAnchor="middle" fontSize="10" fill="#78716c">
                    {new Date(`${item.date}T00:00:00`).toLocaleDateString("en-MY", { day: "2-digit", month: "short" })}
                  </text>
                ) : null}
              </g>
            );
          })}
          <polyline points={linePoints} fill="none" stroke="#292524" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {data.map((item, index) => (
            <circle key={item.date} cx={x(index)} cy={padding + plotHeight - (item.count / maxCount) * plotHeight} r="3" fill="#292524">
              <title>{`${item.count} donation${item.count === 1 ? "" : "s"}`}</title>
            </circle>
          ))}
          {data.map((item, index) => {
            const hitWidth = plotWidth / Math.max(data.length, 1);
            return <rect key={`hover-${item.date}`} x={x(index) - hitWidth / 2} y={padding} width={hitWidth} height={plotHeight} fill="transparent" onMouseEnter={() => setHoveredIndex(index)} />;
          })}
          {hoveredIndex !== null ? <line x1={x(hoveredIndex)} x2={x(hoveredIndex)} y1={padding} y2={padding + plotHeight} stroke="#f97316" strokeWidth="1" strokeDasharray="4 4" pointerEvents="none" /> : null}
        </svg>
        {hoveredIndex !== null ? (
          <div className="pointer-events-none absolute top-2 z-10 w-64 rounded-2xl border border-orange-100 bg-white p-4 shadow-xl" style={{ left: `${(x(hoveredIndex) / width) * 100}%`, transform: x(hoveredIndex) / width >= 0.78 ? "translateX(-100%)" : x(hoveredIndex) / width <= 0.22 ? "translateX(0)" : "translateX(-50%)" }}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-orange-600">{new Date(`${data[hoveredIndex].date}T00:00:00`).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" })}</p>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between gap-3"><span className="text-stone-500">Total ETH donated</span><span className="font-bold text-stone-900">{eth(data[hoveredIndex].amountEth)}</span></div>
              <div className="flex justify-between gap-3"><span className="text-stone-500">Total donations</span><span className="font-bold text-stone-900">{data[hoveredIndex].count}</span></div>
            </div>
          </div>
        ) : null}
        </div>
      </div>
    </div>
  );
}

function CampaignFundingChart({ data, showFilters = true }: { data: AnalyticsData["campaignPerformance"]; showFilters?: boolean }) {
  const [view, setView] = useState<"top" | "lowest" | "active" | "completed">("top");
  const displayed = useMemo(() => {
    if (!showFilters) return data.slice(0, 1);
    const matching = view === "active" || view === "completed"
      ? data.filter((campaign) => campaign.status === view)
      : [...data];
    return matching
      .sort((a, b) => view === "lowest" ? a.progress - b.progress : b.progress - a.progress)
      .slice(0, 8);
  }, [data, showFilters, view]);

  if (!data.length) return <EmptyState text="Campaign performance will appear when campaigns receive donations." />;

  return (
    <div>
      {showFilters ? <div className="mb-4 flex flex-wrap gap-1.5 rounded-xl bg-stone-50 p-1.5 sm:w-fit">
        {[
          ["top", "Top funded"],
          ["lowest", "Lowest funded"],
          ["active", "Active"],
          ["completed", "Completed"],
        ].map(([value, label]) => (
          <button key={value} type="button" onClick={() => setView(value as typeof view)} className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${view === value ? "bg-white text-orange-600 shadow-sm" : "text-stone-500 hover:text-stone-800"}`}>{label}</button>
        ))}
      </div> : null}
      {displayed.length ? <div className="overflow-x-auto pb-2">
      <div className="relative mx-auto h-72 min-w-[720px] pt-14" style={{ width: `${Math.max(720, displayed.length * 120)}px` }}>
        <div className="absolute inset-x-0 top-14 h-44">
          {[0, 25, 50, 75, 100].map((value) => (
            <div key={value} className="absolute inset-x-0 border-t border-stone-200" style={{ bottom: `${value}%` }}>
              <span className="absolute -top-2.5 left-0 bg-white pr-2 text-[9px] font-semibold text-stone-400">{value}%</span>
            </div>
          ))}
        </div>
        <div className="absolute inset-x-8 top-14 flex h-44 items-end justify-around gap-5">
          {displayed.map((campaign) => (
            <div key={campaign.id} className="group relative flex h-full min-w-16 flex-1 items-end justify-center">
              <div className="pointer-events-none absolute left-1/2 top-[-48px] z-10 hidden w-52 -translate-x-1/2 rounded-xl border border-orange-100 bg-white p-3 shadow-xl group-hover:block">
                <p className="truncate text-xs font-bold text-stone-900">{campaign.title}</p>
                <div className="mt-2 space-y-1 text-[10px] text-stone-500">
                  <p className="flex justify-between gap-3"><span>Funding progress</span><strong className="text-stone-800">{percent(campaign.progress)}</strong></p>
                  <p className="flex justify-between gap-3"><span>Raised</span><strong className="text-stone-800">{eth(campaign.raisedEth)}</strong></p>
                  <p className="flex justify-between gap-3"><span>Goal</span><strong className="text-stone-800">{eth(campaign.goalEth)}</strong></p>
                </div>
              </div>
              <div className="w-full max-w-14 rounded-t-lg bg-gradient-to-t from-orange-500 to-orange-300 transition group-hover:from-orange-600 group-hover:to-orange-400" style={{ height: `${Math.max(campaign.progress > 0 ? 3 : 0, Math.min(100, campaign.progress))}%` }} />
              <span className="absolute -bottom-7 left-1/2 w-24 -translate-x-1/2 truncate text-center text-[10px] font-semibold text-stone-500" title={campaign.title}>{campaign.title}</span>
              <span className="absolute text-[10px] font-black text-stone-700" style={{ bottom: `calc(${Math.min(100, campaign.progress)}% + 5px)` }}>{percent(campaign.progress)}</span>
            </div>
          ))}
        </div>
      </div>
      </div> : <EmptyState text={`No ${view} campaigns are available.`} />}
    </div>
  );
}

function Donut({
  data,
  center,
  stacked = false,
  hideLegend = false,
}: {
  data: { label: string; value: number; color: string }[];
  center: string;
  stacked?: boolean;
  hideLegend?: boolean;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cursor = 0;
  const stops = data.map((item) => {
    const start = cursor;
    cursor += total ? (item.value / total) * 100 : 0;
    return `${item.color} ${start}% ${cursor}%`;
  });
  const style = {
    background: total ? `conic-gradient(${stops.join(",")})` : "#e7e5e4",
  } as CSSProperties;
  return (
    <div className={stacked ? "grid gap-5" : "grid gap-5 sm:grid-cols-[180px_1fr] sm:items-center"}>
      <div className="relative mx-auto h-40 w-40 rounded-full" style={style}>
        <div className="absolute inset-7 grid place-items-center rounded-full bg-white text-center shadow-inner">
          <div><p className="text-xl font-bold text-stone-950">{center}</p><p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">Total</p></div>
        </div>
      </div>
      {!hideLegend ? (
        <div className={stacked ? "grid gap-3 sm:grid-cols-3" : "space-y-3"}>
          {data.map((item) => (
            <div key={item.label} className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="flex-1 text-xs font-semibold text-stone-600">{item.label}</span>
              <span className="text-xs font-bold text-stone-950">{item.value}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-orange-200 bg-orange-50/30 p-6 text-center text-sm font-medium text-stone-400">{text}</div>;
}

export default function AdminAnalyticsPage() {
  const { address, isConnected } = useAppKitAccount();
  const { ethToMyr, weiToMyr } = useEthMyrRate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [period, setPeriod] = useState("30");
  const [campaignId, setCampaignId] = useState("all");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [campaignOptions, setCampaignOptions] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async () => {
    if (!address || !isConnected) {
      setLoading(false);
      setError("Connect the approved admin wallet to view analytics.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ walletAddress: address, period, campaignId });
      const response = await fetch(`/api/admin/analytics?${query}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Unable to load analytics.");
      setData(result);
      if (campaignId === "all") setCampaignOptions(result.campaigns);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  }, [address, campaignId, isConnected, period]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const fundTotal = useMemo(
    () => data?.fundDistribution.reduce((sum, item) => sum + item.amountEth, 0) ?? 0,
    [data],
  );

  return (
    <>
      <DashboardTopBar role="Admin" isMenuOpen={sidebarOpen} onMenuClick={() => setSidebarOpen((value) => !value)} />
      <AdminSidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      <main className={`min-h-screen bg-[var(--color-cream)] pt-16 transition-[padding] ${sidebarOpen ? "lg:pl-64" : ""}`}>
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-7 sm:px-8">
          <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Platform intelligence</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-950">Analytics &amp; Insights</h1>
              <p className="mt-1 max-w-2xl text-sm text-stone-500">Monitor donation activity, campaign performance, fund distribution, and verified on-chain outcomes.</p>
            </div>
            <div className="flex flex-wrap gap-1.5 rounded-2xl border border-orange-100 bg-white p-1.5 shadow-sm">
              {["7", "30", "90", "all"].map((value) => (
                <button key={value} type="button" onClick={() => setPeriod(value)} className={`rounded-xl px-3 py-2 text-xs font-bold transition ${period === value ? "bg-orange-500 text-white shadow-sm" : "text-stone-500 hover:bg-orange-50 hover:text-orange-700"}`}>
                  {value === "all" ? "All time" : `${value} days`}
                </button>
              ))}
            </div>
          </header>

          <section className="flex flex-col gap-3 rounded-[1.4rem] border border-orange-100 bg-white p-4 shadow-[0_14px_38px_rgba(97,55,17,0.06)] md:flex-row md:items-end">
            <label className="flex-1 text-xs font-bold uppercase tracking-wide text-stone-500">
              Campaign
              <select value={campaignId} onChange={(event) => setCampaignId(event.target.value)} className="mt-2 w-full rounded-xl border border-orange-100 bg-orange-50/20 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-stone-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100">
                <option value="all">All campaigns</option>
                {campaignOptions.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.title}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => void loadAnalytics()} className="rounded-xl bg-stone-950 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">Refresh analytics</button>
          </section>

          {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div> : null}
          {loading ? <div className="grid min-h-96 place-items-center rounded-2xl border border-stone-200 bg-white text-sm font-semibold text-stone-500">Calculating platform analytics…</div> : null}

          {!loading && data ? (
            <>
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Donations received" value={eth(data.financial.donatedWei)} secondary={`≈ ${money(weiToMyr(data.financial.donatedWei))} (current rate)`} change={data.financial.donationChange} />
                <MetricCard label="Milestone funds released" value={eth(data.financial.releasedWei)} secondary={`≈ ${money(weiToMyr(data.financial.releasedWei))} (current rate)`} tone="emerald" />
                <MetricCard label="Funds currently locked" value={eth(data.financial.lockedWei)} secondary={`≈ ${money(weiToMyr(data.financial.lockedWei))} (current rate)`} tone="blue" />
                <MetricCard label="Refunds returned to donors" value={eth(data.financial.refundedWei)} secondary={`≈ ${money(weiToMyr(data.financial.refundedWei))} (current rate)`} tone="stone" />
              </section>

              <section>
                <Panel title="Donation activity" description="Confirmed ETH donations and transaction volume during the selected period.">
                  <TrendChart data={data.trend} />
                </Panel>
              </section>

              <section className="grid gap-5 xl:grid-cols-2">
                <Panel title="Fund distribution" description="How confirmed campaign funds are currently allocated. ETH remains the primary value." className="xl:flex xl:flex-col" contentClassName="xl:flex xl:flex-1 xl:flex-col xl:justify-center">
                  {fundTotal ? (
                    <Donut stacked hideLegend center={eth(fundTotal)} data={data.fundDistribution.map((item, index) => ({ label: item.label, value: item.amountEth, color: ["#10b981", "#38bdf8", "#78716c"][index] }))} />
                  ) : <EmptyState text="No confirmed financial distribution is available for this period." />}
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    {data.fundDistribution.map((item, index) => <div key={item.label} className="rounded-xl border border-orange-100 bg-orange-50/25 p-3"><p className="flex items-center gap-2 text-[10px] font-bold uppercase text-stone-500"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ["#10b981", "#38bdf8", "#78716c"][index] }} />{item.label}</p><p className="mt-2 text-sm font-bold">{eth(item.amountEth)}</p><p className="text-[10px] text-stone-400">≈ {money(ethToMyr(item.amountEth))} (current rate)</p></div>)}
                  </div>
                </Panel>
                <Panel title="Campaign funding progress" description="Percentage of each campaign's funding goal that has been raised." action={<Link href="/Admin/campaign-management" className="text-xs font-bold text-orange-600 hover:underline">View all campaigns ↗</Link>} className="order-3 xl:col-span-2">
                  <CampaignFundingChart data={data.campaignPerformance} showFilters={campaignId === "all"} />
                </Panel>
                <Panel title="Verified transaction activity" description="Confirmed donations, fund releases, and refunds from the same on-chain records as Financial Transaction Records." action={<Link href="/Admin/transactions" className="text-xs font-bold text-orange-600 hover:underline">View transactions ↗</Link>} className="order-2">
                  <Donut center={String(data.blockchainHealth.confirmed + data.blockchainHealth.pending + data.blockchainHealth.failed)} data={[
                    { label: "Confirmed", value: data.blockchainHealth.confirmed, color: "#10b981" },
                    { label: "Pending", value: data.blockchainHealth.pending, color: "#f59e0b" },
                    { label: "Failed / invalid", value: data.blockchainHealth.failed, color: "#ef4444" },
                  ]} />
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    {data.blockchainHealth.actionTypes.map((item) => <div key={item.type} className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-xs"><span className="text-stone-500">{item.type}</span><span className="font-bold">{item.count}</span></div>)}
                  </div>
                </Panel>
              </section>

              <Panel title="Shelter insights" description="Fundraising and milestone delivery across verified shelters." action={<Link href="/Admin/shelter-management/verified" className="text-xs font-bold text-orange-600 hover:underline">View verified shelters ↗</Link>}>
                <div className="mb-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-orange-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-orange-700">Verified shelters</p><p className="mt-1 text-2xl font-bold">{data.shelterMetrics.verified}</p></div>
                  <div className="rounded-xl bg-emerald-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Active verified shelters</p><p className="mt-1 text-2xl font-bold">{data.shelterMetrics.active}</p></div>
                </div>
                {data.shelterMetrics.shelters.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left text-xs">
                      <thead><tr className="border-b border-stone-200 text-[10px] uppercase tracking-wide text-stone-400"><th className="pb-3">Shelter</th><th className="pb-3">ETH raised</th><th className="pb-3">Campaigns</th><th className="pb-3">Milestone completion</th><th className="pb-3">Refund rate</th><th className="pb-3">Status</th></tr></thead>
                      <tbody>{data.shelterMetrics.shelters.map((shelter) => <tr key={shelter.id} className="border-b border-stone-100 last:border-0"><td className="py-3 font-semibold">{shelter.name}</td><td className="py-3 font-bold">{eth(shelter.raisedEth)}</td><td className="py-3 text-stone-500">{shelter.campaigns}</td><td className="py-3"><div className="flex items-center gap-2"><div className="h-1.5 w-20 overflow-hidden rounded-full bg-stone-100"><div className="h-full bg-orange-400" style={{ width: `${shelter.completionRate}%` }} /></div><span>{percent(shelter.completionRate)}</span></div></td><td className="py-3">{percent(shelter.refundRate)}</td><td className="py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${shelter.active ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>{shelter.active ? "Active" : "Deactivated"}</span></td></tr>)}</tbody>
                    </table>
                  </div>
                ) : <EmptyState text="Verified shelter performance will appear here." />}
              </Panel>
            </>
          ) : null}
        </div>
      </main>
    </>
  );
}
