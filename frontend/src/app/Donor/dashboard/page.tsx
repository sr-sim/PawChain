import Link from "next/link";
import { DonorCampaignSlideshow } from "@/app/components/DonorCampaignSlideshow";
import { DonorDashboardMetrics } from "@/app/components/DonorDashboardMetrics";
import { DonorRoleNFTCard } from "@/app/components/DonorRoleNFTCard";
import { getDashboardProfile } from "@/lib/dashboard-access";
import { getActiveDonorCampaigns } from "@/lib/donor-campaigns";
import { getDonorDonations } from "@/lib/donor-donations";
import {
  getTransactionExplorerUrl,
} from "@/lib/block-explorer";
import { RefundClaimButton } from "../tracking/RefundClaimButton";
import { formatPercentage } from "@/lib/format-percentage";

type DashboardProps = {
  searchParams?: Promise<{
    walletAddress?: string;
    range?: string;
  }>;
};

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Waiting: "border-slate-200 bg-slate-50 text-slate-600",
    Confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Failed: "border-red-200 bg-red-50 text-red-700",
    Refunded: "border-red-200 bg-red-50 text-red-700",
    "Under review": "border-amber-200 bg-amber-50 text-amber-700",
    "Funds released": "border-emerald-200 bg-emerald-50 text-emerald-700",
    "Pending proof": "border-slate-200 bg-slate-50 text-slate-600",
  };

  return (
    <span
      className={[
        "inline-flex min-w-[6.5rem] items-center justify-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        styles[status] ?? "bg-slate-100 text-slate-600",
      ].join(" ")}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
        {status === "Waiting" || status === "Pending proof" ? (
          <><circle cx="12" cy="12" r="8" /><path d="M12 8v4l2 2" /></>
        ) : status === "Failed" ? (
          <path d="m9 9 6 6m0-6-6 6" />
        ) : status === "Refunded" ? (
          <path d="M7 12h10m-4-4 4 4-4 4" />
        ) : (
          <path d="M9 12.5 11 14.5 15.5 9.5" />
        )}
      </svg>
      {status}
    </span>
  );
}

function formatAmount(amount: number, currency: string) {
  const displayCurrency = currency === "RM" ? "MYR" : currency;
  return `${displayCurrency} ${amount.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatEth(amount: number) {
  return `${amount.toLocaleString("en-MY", {
    maximumFractionDigits: 6,
  })} ETH`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function shortHash(value: string) {
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

function dashboardRangeHref(range: string, walletAddress?: string) {
  const params = new URLSearchParams();
  if (walletAddress && walletAddress !== "-") params.set("walletAddress", walletAddress);
  if (range !== "30") params.set("range", range);
  const query = params.toString();
  return query ? `/Donor/dashboard?${query}` : "/Donor/dashboard";
}

export default async function DonorDashboard({ searchParams }: DashboardProps) {
  const params = await searchParams;
  const activeRange = ["30", "90", "all"].includes(params?.range ?? "")
    ? (params?.range as "30" | "90" | "all")
    : "30";
  const { userId, profile, accessMode, roleNFT } = await getDashboardProfile(
    "donor",
    params?.walletAddress,
  );
  const displayName = profile?.full_name ?? "Anwen";
  const walletAddress = profile?.wallet_address ?? params?.walletAddress ?? "-";
  let activeCampaigns: Awaited<ReturnType<typeof getActiveDonorCampaigns>> = [];
  let donationData: Awaited<ReturnType<typeof getDonorDonations>> = {
    donations: [],
    summary: {
      totalAmount: 0,
      totalEth: 0,
      currency: "MYR",
      donationCount: 0,
      confirmedCount: 0,
      latestDonation: null,
    },
  };

  try {
    donationData = await getDonorDonations(walletAddress);
    activeCampaigns = await getActiveDonorCampaigns();
  } catch {
    activeCampaigns = [];
  }

  const latestCampaigns = activeCampaigns.slice(0, 3);
  const contractConnectedCampaigns = activeCampaigns.filter(
    (campaign) => Boolean(campaign.contractAddress),
  );
  const claimedRefunds = donationData.donations.filter(
    (donation) => donation.refundTxHash,
  );
  const potentialRefunds = donationData.donations.filter(
    (donation) =>
      !donation.refundTxHash &&
      donation.contractAddress &&
      ["Closed", "Refunding"].includes(donation.campaignStatus),
  );
  const totalRefundedEth = claimedRefunds.reduce(
    (total, donation) => total + donation.refundAmountEth,
    0,
  );
  const totalRefundedMyr = claimedRefunds.reduce(
    (total, donation) => total + donation.refundAmount,
    0,
  );
  const latestRefund = claimedRefunds[0];
  const now = Date.now();
  const rangeDays = activeRange === "30" ? 30 : activeRange === "90" ? 90 : null;
  const earliestDonationTime = donationData.donations.length > 0
    ? Math.min(...donationData.donations.map((donation) => new Date(donation.createdAt).getTime()))
    : now - 30 * 86_400_000;
  const rangeStart = rangeDays
    ? now - rangeDays * 86_400_000
    : earliestDonationTime;
  const rangeDonations = donationData.donations.filter(
    (donation) => new Date(donation.createdAt).getTime() >= rangeStart,
  );
  const rangeConfirmed = rangeDonations.filter(
    (donation) => !["Failed", "Refunded"].includes(donation.status),
  );
  const rangeTotalMyr = rangeConfirmed.reduce(
    (total, donation) => total + donation.amount,
    0,
  );
  const previousRangeTotalMyr = rangeDays
    ? donationData.donations
        .filter((donation) => {
          const timestamp = new Date(donation.createdAt).getTime();
          return (
            timestamp >= rangeStart - rangeDays * 86_400_000 &&
            timestamp < rangeStart &&
            !["Failed", "Refunded"].includes(donation.status)
          );
        })
        .reduce((total, donation) => total + donation.amount, 0)
    : null;
  const rangeTrend = previousRangeTotalMyr && previousRangeTotalMyr > 0
    ? ((rangeTotalMyr - previousRangeTotalMyr) / previousRangeTotalMyr) * 100
    : null;
  const rangeCampaignCount = new Set(
    rangeConfirmed.map((donation) => donation.campaignId),
  ).size;
  const chartStart = Math.min(rangeStart, now - 86_400_000);
  const bucketDuration = Math.max(1, (now - chartStart) / 6);
  const chartData = Array.from({ length: 6 }, (_, index) => {
    const start = chartStart + index * bucketDuration;
    const end = index === 5 ? now + 1 : start + bucketDuration;
    const value = rangeConfirmed
      .filter((donation) => {
        const timestamp = new Date(donation.createdAt).getTime();
        return timestamp >= start && timestamp < end;
      })
      .reduce((total, donation) => total + donation.amount, 0);
    return {
      label: new Intl.DateTimeFormat("en-MY", { day: "numeric", month: "short" }).format(new Date(end - 1)),
      value,
    };
  });
  const maxChartValue = Math.max(...chartData.map((point) => point.value), 1);
  const summaryStats = [
    {
      label: "Total donated",
      value: formatAmount(rangeTotalMyr, "MYR"),
      detail:
        activeRange === "all"
          ? "Lifetime recorded value"
          : rangeTrend !== null
            ? `${rangeTrend >= 0 ? "Up" : "Down"} ${formatPercentage(Math.abs(rangeTrend))}% vs previous ${activeRange} days`
            : rangeTotalMyr > 0
              ? "New support in this period"
              : `Last ${activeRange} days`,
      tone: "orange",
    },
    {
      label: "Confirmed support",
      value: String(rangeConfirmed.length),
      detail: `${rangeCampaignCount} campaigns in this period`,
      tone: "violet",
    },
    {
      label: "Refund status",
      value:
        potentialRefunds.length > 0
          ? `${potentialRefunds.length} claimable`
          : claimedRefunds.length > 0
            ? `${claimedRefunds.length} claimed`
            : "Clear",
      detail:
        potentialRefunds.length > 0
          ? "Ready to claim"
          : totalRefundedEth > 0
            ? `${formatEth(totalRefundedEth)} received`
            : "No refunds",
      tone: potentialRefunds.length > 0 ? "amber" : claimedRefunds.length > 0 ? "emerald" : "slate",
    },
  ];

  return (
    <div className="space-y-5">
      <DonorCampaignSlideshow
        campaigns={latestCampaigns}
        overview={
        <div className="grid min-h-[21rem] w-full gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="donor-dashboard-premium relative flex min-h-[21rem] overflow-hidden p-5 sm:p-6">
            <div className="relative z-10">
              <h1 className="max-w-2xl text-2xl font-black tracking-tight text-stone-950 sm:text-4xl">
                Welcome back, {displayName}.
              </h1>
              <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-950">
                    Total donated
                  </p>
                  <p className="donor-eth-gradient mt-1 text-5xl font-black tracking-tight sm:text-6xl">
                    {formatAmount(donationData.summary.totalAmount, "MYR")}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-stone-500">
                    Saved donation value
                  </p>
                </div>
                <DonorDashboardMetrics
                  verifiedActions={donationData.summary.confirmedCount}
                  smartCampaigns={contractConnectedCampaigns.length}
                />
              </div>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/Donor/discover"
                  className="donor-premium-primary inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5"
                >
                  Donate now
                </Link>
                <Link
                  href="/Donor/tracking"
                  className="inline-flex items-center justify-center rounded-xl border border-orange-200 bg-white/90 px-5 py-3 text-sm font-black text-stone-900 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--color-orange)] hover:bg-white"
                >
                  View donation history
                </Link>
              </div>
            </div>
          </div>

          <div className="border-t border-orange-100 bg-white p-5 sm:p-6 lg:border-t-0 lg:border-l">
            <DonorRoleNFTCard
              accessMode={accessMode}
              roleNFT={roleNFT}
              userId={userId}
              variant="compact"
              walletAddress={walletAddress}
            />
          </div>
        </div>
        }
      />

      <section className="overflow-hidden rounded-[1.35rem] border border-orange-100 bg-white shadow-sm">
        <div className="border-b border-orange-100 p-4 sm:p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-orange)]">
                Dashboard overview
              </p>
              <h2 className="mt-1 text-xl font-black text-stone-950">
                Your giving at a glance
              </h2>
              </div>
              <div className="flex flex-wrap gap-2" aria-label="Dashboard date range">
                {[
                  ["30", "30 days"],
                  ["90", "90 days"],
                  ["all", "All time"],
                ].map(([value, label]) => (
                  <Link
                    key={value}
                    href={dashboardRangeHref(value, walletAddress)}
                    scroll={false}
                    className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${activeRange === value ? "border-violet-300 bg-violet-100 text-violet-800 ring-2 ring-violet-100" : "border-slate-200 bg-white text-stone-600 hover:bg-slate-50"}`}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
            {summaryStats.map((stat) => (
              <div
                key={stat.label}
                className={[
                  "rounded-2xl border p-3 shadow-sm",
                  stat.tone === "violet"
                    ? "border-violet-100 bg-violet-50/45"
                    : stat.tone === "amber"
                      ? "border-amber-200 bg-amber-50/55"
                      : stat.tone === "emerald"
                        ? "border-emerald-200 bg-emerald-50/55"
                        : stat.tone === "red"
                          ? "border-red-200 bg-red-50/55"
                          : stat.tone === "slate"
                            ? "border-slate-200 bg-slate-50/70"
                            : "border-orange-100 bg-orange-50/45",
                ].join(" ")}
              >
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-stone-400">
                  {stat.label}
                </p>
                <p className="mt-1 text-xl font-black text-stone-950">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs font-semibold text-stone-500">
                  {stat.detail}
                </p>
              </div>
            ))}
            </div>
          </div>
        </div>

        <div className="grid gap-0 xl:grid-cols-[0.72fr_1.28fr]">
          <div className="border-b border-orange-100 bg-orange-50/15 p-4 xl:border-r xl:border-b-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-orange)]">
                  Refund status
                </p>
                <h3 className="mt-1 text-lg font-black text-stone-950">
                  {potentialRefunds.length > 0
                    ? "Refund available"
                    : latestRefund
                      ? "Refund received"
                      : "No refund available"}
                </h3>
              </div>
              <span
                className={[
                  "w-fit rounded-full border px-3 py-1 text-xs font-black",
                  potentialRefunds.length > 0
                    ? "border-orange-200 bg-orange-50 text-[var(--color-orange)]"
                    : latestRefund
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-50 text-slate-600",
                ].join(" ")}
              >
                {potentialRefunds.length > 0
                  ? "Claimable"
                  : latestRefund
                    ? "Received"
                    : "Clear"}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="p-2.5">
                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-stone-400">Available</p>
                <p className="mt-1 text-lg font-black text-amber-700">{potentialRefunds.length}</p>
              </div>
              <div className="border-l border-slate-100 bg-emerald-50/30 p-2.5">
                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-stone-400">Received</p>
                <p className="mt-1 text-lg font-black text-emerald-700">{claimedRefunds.length}</p>
              </div>
              <div className="border-l border-slate-100 bg-emerald-50/30 p-2.5">
                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-stone-400">Refunded</p>
                <p className="mt-1 text-sm font-black text-emerald-800">{formatEth(totalRefundedEth)}</p>
                <p className="mt-0.5 text-[10px] font-semibold leading-4 text-stone-500">
                  {formatAmount(totalRefundedMyr, "MYR")}
                </p>
              </div>
            </div>
            <div className="mt-3">
              {potentialRefunds.length > 0 ? (
                potentialRefunds.slice(0, 1).map((donation) => (
                  <article key={donation.id}>
                    <div className="rounded-2xl border border-orange-100 bg-white p-3 shadow-sm">
                      <p className="text-sm font-black text-stone-950">
                        {donation.campaignTitle}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-stone-500">
                        Campaign is {donation.campaignStatus.toLowerCase()}.
                      </p>
                    </div>
                    <RefundClaimButton
                      campaignId={donation.campaignId}
                      contractAddress={donation.contractAddress}
                    />
                  </article>
                ))
              ) : latestRefund ? (
                <article className="rounded-xl border border-emerald-100 bg-white p-3 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
                    Latest refund
                  </p>
                  <p className="mt-1 text-xl font-black text-stone-950">
                    +{latestRefund.refundAmountEth > 0
                      ? formatEth(latestRefund.refundAmountEth)
                      : "Confirmed"}
                  </p>
                  {latestRefund.refundAmountEth > 0 ? (
                    <p className="mt-1 text-xs font-semibold text-stone-500">
                      {formatAmount(latestRefund.refundAmount, "MYR")}
                    </p>
                  ) : null}
                  <p className="mt-1 text-sm font-semibold text-stone-600">
                    {latestRefund.campaignTitle}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-black">
                    {latestRefund.refundTxHash ? (
                      <a
                        href={getTransactionExplorerUrl(latestRefund.refundTxHash)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-orange-700 transition hover:bg-orange-100"
                      >
                        View proof
                      </a>
                    ) : null}
                    <Link
                      href="/Donor/tracking"
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-emerald-700 transition hover:bg-emerald-100"
                    >
                      View history
                    </Link>
                  </div>
                </article>
              ) : (
                <div className="rounded-2xl border border-dashed border-orange-200 bg-white/70 p-4 text-sm font-semibold text-stone-600">
                  Your supported campaigns do not have claimable refunds.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-orange)]">
                  Contribution trend
                </p>
                <h3 className="mt-1 text-lg font-black text-stone-950">
                  Recorded MYR over time
                </h3>
              </div>
              <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">
                {activeRange === "all" ? "All time" : `${activeRange} days`}
              </span>
            </div>
            <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50/25 p-4">
              <div className="flex h-44 items-end gap-2 border-b border-orange-100 pb-2">
                {chartData.map((point, index) => (
                  <div key={`${point.label}-${index}`} className="group flex h-full min-w-0 flex-1 flex-col justify-end">
                    <div className="mb-1 text-center text-[9px] font-black text-orange-700 opacity-0 transition group-hover:opacity-100">
                      {point.value > 0 ? formatAmount(point.value, "MYR") : "MYR 0"}
                    </div>
                    <div
                      className="rounded-t-lg bg-[var(--color-orange)] shadow-[0_0_14px_rgba(249,115,22,0.16)] transition hover:bg-orange-600"
                      style={{ height: point.value > 0 ? `${Math.max(4, (point.value / maxChartValue) * 100)}%` : "0%" }}
                      title={`${point.label}: ${formatAmount(point.value, "MYR")}`}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-6 gap-2 text-center text-[9px] font-semibold text-stone-400">
                {chartData.map((point, index) => <span key={`${point.label}-axis-${index}`} className="truncate">{point.label}</span>)}
              </div>
              <p className="mt-3 text-xs leading-5 text-stone-500">
                Uses the MYR value saved when each donation was confirmed, not today&apos;s exchange rate.
              </p>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <Link href="/Donor/tracking" className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-center text-xs font-black text-violet-700 transition hover:bg-violet-100">Track funds</Link>
              <Link href="/Donor/badges" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs font-black text-amber-700 transition hover:bg-amber-100">NFT progress</Link>
              <Link href="/Donor/discover" className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-center text-xs font-black text-orange-700 transition hover:bg-orange-100">Support again</Link>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-orange)]">
                Activity
              </p>
              <h2 className="mt-1 text-xl font-black text-stone-950">
                Latest donation activities
              </h2>
            </div>
            <Link
              href="/Donor/tracking"
              className="text-sm font-semibold text-[var(--color-orange)] transition hover:text-stone-950"
            >
              View all
            </Link>
          </div>

          {donationData.donations.length > 0 ? (
            <div className="mt-4 divide-y divide-orange-100 overflow-hidden rounded-xl border border-orange-100">
              {donationData.donations.slice(0, 3).map((donation) => (
                <article
                  key={donation.id}
                  className="donor-ledger-row grid gap-3 px-3 py-3 sm:grid-cols-[1fr_auto] sm:items-start"
                >
                  <div>
                    <Link
                      href={`/Donor/campaigns/${donation.campaignId}`}
                      className="text-sm font-semibold text-stone-950 transition hover:text-[var(--color-orange)]"
                    >
                      {donation.campaignTitle}
                    </Link>
                    <p className="mt-1 text-xs font-medium text-stone-500">
                      {donation.shelterName} - {formatDate(donation.createdAt)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <a
                        href={getTransactionExplorerUrl(donation.txHash)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 font-mono text-[10px] font-black text-violet-700 transition hover:border-violet-400 hover:bg-violet-100"
                      >
                        Donation TX {shortHash(donation.txHash)} ↗
                      </a>
                      {donation.refundTxHash ? (
                        <a
                          href={getTransactionExplorerUrl(donation.refundTxHash)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 font-mono text-[10px] font-black text-red-700 transition hover:border-red-400 hover:bg-red-100"
                        >
                          Refund TX {shortHash(donation.refundTxHash)} ↗
                        </a>
                      ) : null}
                    </div>
                    <Link
                      href={`/Donor/receipt/${donation.id}${
                        walletAddress && walletAddress !== "-"
                          ? `?walletAddress=${encodeURIComponent(walletAddress)}`
                          : ""
                      }`}
                      className="mt-2 inline-flex text-xs font-semibold text-[var(--color-orange)] transition hover:text-stone-950"
                    >
                      View receipt
                    </Link>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-black text-stone-950">
                      {formatAmount(donation.amount, donation.currency)}
                    </p>
                    {donation.amountEth > 0 ? (
                      <p className="text-xs font-semibold text-stone-500">
                        {formatEth(donation.amountEth)} confirmed
                      </p>
                    ) : null}
                    <StatusPill status={donation.status} />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-orange-200 bg-orange-50/30 p-5 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-[var(--color-orange)] shadow-sm">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6"
                  aria-hidden="true"
                >
                  <path d="M12 21s-7-4.4-9.2-9A5.4 5.4 0 0 1 12 6.2 5.4 5.4 0 0 1 21.2 12C19 16.6 12 21 12 21Z" />
                </svg>
              </div>
              <h3 className="mt-4 text-base font-semibold text-stone-950">
                No donation activity yet
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-stone-600">
                Once you support a campaign, donation amount, transaction hash,
                and confirmation status will appear here automatically.
              </p>
              <Link
                href="/Donor/discover"
                className="mt-4 inline-flex rounded-xl bg-[var(--color-orange)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                Browse campaigns
              </Link>
            </div>
          )}
        </div>

      </section>
    </div>
  );
}
