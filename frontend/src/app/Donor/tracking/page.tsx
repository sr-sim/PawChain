import Link from "next/link";
import {
  getActiveDonorCampaigns,
  getDonorCampaignsByIds,
} from "@/lib/donor-campaigns";
import { getDonorDonations } from "@/lib/donor-donations";
import { getTransactionExplorerUrl } from "@/lib/block-explorer";
import { TransactionLinks } from "@/app/components/TransactionLinks";
import { RefundClaimButton } from "./RefundClaimButton";
import { getLatestEthMyrRate } from "@/lib/currency";
import { AnimatedEthTotal } from "./AnimatedEthTotal";

type TrackingPageProps = {
  searchParams?: Promise<{
    walletAddress?: string;
    filter?: string;
  }>;
};

const statusStyles: Record<string, string> = {
  Active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Refunded: "border-sky-200 bg-sky-50 text-sky-700",
  Failed: "border-red-200 bg-red-50 text-red-700",
  Submitted: "border-amber-200 bg-amber-50 text-amber-700",
  Rejected: "border-red-200 bg-red-50 text-red-700",
  Pending: "border-slate-200 bg-slate-50 text-slate-600",
  Waiting: "border-slate-200 bg-slate-50 text-slate-600",
};

function StatusPill({ status }: { status: string }) {
  const icon =
    status === "Confirmed" || status === "Completed" || status === "Approved"
      ? "M9 12.5 11 14.5 15.5 9.5"
      : status === "Failed" || status === "Rejected"
        ? "m9 9 6 6m0-6-6 6"
        : status === "Refunded"
          ? "M7 12h10m-4-4 4 4-4 4"
          : "M12 8v4l2 2";

  return (
    <span
      className={[
        "inline-flex min-w-[6.5rem] items-center justify-center gap-1.5 rounded-full border px-2.5 py-1 text-center text-[0.68rem] font-semibold whitespace-nowrap",
        statusStyles[status] ?? "border-slate-200 bg-slate-50 text-slate-600",
      ].join(" ")}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5"
        aria-hidden="true"
      >
        {status === "Pending" || status === "Waiting" ? (
          <circle cx="12" cy="12" r="8" />
        ) : (
          <path d={icon} />
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

function formatMyr(value: number) {
  const formattedNumber = new Intl.NumberFormat("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `MYR ${formattedNumber}`;
}

function formatEth(value: number) {
  return `${value.toLocaleString("en-MY", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  })} ETH`;
}

function formatLiveMyr(value: number) {
  return `Approx. live MYR ${value.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getMilestoneAmount(
  goalAmount: number | undefined,
  percentage: number,
) {
  const goal = Number(goalAmount ?? 0);
  const releasePercentage = Number(percentage);

  if (
    !Number.isFinite(goal) ||
    !Number.isFinite(releasePercentage) ||
    goal <= 0
  ) {
    return 0;
  }

  return (goal * releasePercentage) / 100;
}

function getCumulativeMilestonePercentage(
  milestones: { percentage: number }[],
  index: number,
) {
  return milestones
    .slice(0, index + 1)
    .reduce((total, milestone) => total + Number(milestone.percentage || 0), 0);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getBaseColorName(classString: string): string {
  const match = classString.match(/border-(\w+)-\d+/);
  if (match && match[1]) {
    return match[1];
  }

  return "slate";
}

function shortHash(value: string) {
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

const donationFilterTabs = [
  { key: "all", label: "All", status: "Pending" },
  { key: "pending", label: "Pending", status: "Pending" },
  { key: "confirmed", label: "Confirmed", status: "Confirmed" },
  { key: "refund", label: "Refund", status: "Refunded" },
];

function withFilterHref(filter: string, walletAddress?: string) {
  const params = new URLSearchParams();

  if (walletAddress) {
    params.set("walletAddress", walletAddress);
  }

  if (filter !== "all") {
    params.set("filter", filter);
  }

  const query = params.toString();
  return query ? `/Donor/tracking?${query}` : "/Donor/tracking";
}

export default async function DonorTrackingPage({
  searchParams,
}: TrackingPageProps) {
  const params = await searchParams;
  const walletAddress = params?.walletAddress;
  const activeFilter = ["pending", "confirmed", "refund"].includes(
    params?.filter ?? "",
  )
    ? (params?.filter as "pending" | "confirmed" | "refund")
    : "all";
  let campaigns: Awaited<ReturnType<typeof getActiveDonorCampaigns>> = [];
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
    const [activeCampaigns, donatedCampaigns] = await Promise.all([
      getActiveDonorCampaigns(),
      getDonorCampaignsByIds(
        donationData.donations.map((donation) => donation.campaignId),
      ),
    ]);
    const campaignMap = new Map(
      [...activeCampaigns, ...donatedCampaigns].map((campaign) => [
        campaign.id,
        campaign,
      ]),
    );
    campaigns = [...campaignMap.values()];
  } catch {
    campaigns = [];
  }

  const ethMyrRate = (await getLatestEthMyrRate()).rate;
  // Display the total MYR amount stored at the time of donation, not a live conversion
  const totalDonatedEstimate = formatMyr(donationData.summary.totalAmount);
  const filteredDonations = donationData.donations.filter((donation) => {
    if (activeFilter === "refund") {
      return Boolean(donation.refundTxHash);
    }

    if (activeFilter === "pending") {
      return donation.status.toLowerCase() === "pending";
    }

    if (activeFilter === "confirmed") {
      return donation.status.toLowerCase() === "confirmed";
    }

    return true;
  });

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl border border-orange-100 bg-[radial-gradient(circle_at_76%_18%,rgba(245,158,11,0.16),transparent_24%),radial-gradient(circle_at_94%_80%,rgba(var(--color-orange-rgb),0.18),transparent_30%),linear-gradient(120deg,rgba(255,255,255,0.99),rgba(255,252,238,0.96)_58%,rgba(var(--color-orange-rgb),0.08))] shadow-[0_22px_58px_rgba(120,72,0,0.08)]">
        <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(90deg,rgba(249,115,22,0.08)_1px,transparent_1px),linear-gradient(rgba(180,83,9,0.06)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-orange)]">
              Tracking
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-stone-950 sm:text-3xl">
              Donation ledger
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-stone-600">
              Past donations, campaign progress, and release monitor.
            </p>
            <Link
              href="/Donor/discover"
              className="mt-4 inline-flex w-fit items-center justify-center rounded-xl bg-[var(--color-orange)] px-4 py-2 text-xs font-black text-white shadow-[0_10px_24px_rgba(255,138,0,0.22)] transition hover:bg-orange-600"
            >
              Support a campaign
            </Link>
          </div>

          <div className="relative min-w-0 rounded-3xl border border-orange-100 bg-white/70 px-5 py-4 shadow-[0_18px_45px_rgba(120,72,0,0.08)] backdrop-blur lg:min-w-[28rem]">
            <div className="absolute -right-14 -top-14 h-36 w-36 rounded-full bg-amber-200/35 blur-3xl" />
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-stone-500">
              Total donated
            </p>
            <AnimatedEthTotal
              value={donationData.summary.totalEth}
              className="relative mt-2 bg-[linear-gradient(90deg,#1c1917,#92400e,#ff8500)] bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-5xl"
            />
            <p className="mt-2 text-xs font-semibold text-stone-500">
              {totalDonatedEstimate}
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="overflow-hidden rounded-3xl border border-orange-100 bg-[linear-gradient(180deg,#fff,#fffdf3)] shadow-[0_18px_48px_rgba(120,72,0,0.07)]">
          <div className="flex flex-col gap-4 p-5 pb-0 sm:flex-row sm:items-end sm:justify-between sm:p-6 sm:pb-0">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
                Donation ledger
              </p>
              <h2 className="mt-1 text-xl font-black text-stone-950">
                Past donations
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {donationFilterTabs.map((tab) => {
                const active = activeFilter === tab.key;
                const baseStatusClasses =
                  statusStyles[tab.status] ??
                  "border-slate-200 bg-slate-50 text-slate-600";
                const baseColorName = getBaseColorName(baseStatusClasses);

                const inactiveClasses = [
                  baseStatusClasses, // Apply the base color (border, bg, text)
                  "hover:-translate-y-0.5", // Animation
                  `hover:bg-${baseColorName}-100`, // Lighter background on hover
                ].join(" ");

                return (
                  <Link
                    key={tab.key}
                    href={withFilterHref(tab.key, walletAddress)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black shadow-sm transition ${active ? `${baseStatusClasses} scale-[1.03] ring-2 ring-orange-100` : inactiveClasses}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {donationData.donations.length > 0 ? (
            <div className="mt-4 overflow-hidden border-t border-orange-100 bg-orange-50/20">
              <div className="hidden grid-cols-[1.45fr_0.95fr_1.1fr_0.68fr_8rem] gap-4 border-b border-orange-100 bg-white/80 px-7 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-stone-500 lg:grid">
                <span className="self-center">Campaign</span>
                <span className="self-center">Amount</span>
                <span className="self-center text-center">
                  Transaction hash
                </span>
                <span className="self-center text-center">Date</span>
                <span className="text-center">Status</span>
              </div>
              {filteredDonations.length > 0 ? (
                <div className="donor-thin-scroll max-h-[27.25rem] space-y-2.5 overflow-y-auto overscroll-contain p-3">
                  {filteredDonations.map((donation) => (
                    <article
                      key={donation.id}
                      className="grid gap-4 rounded-2xl border border-orange-100 bg-white/90 px-4 py-3 text-sm shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:bg-white hover:shadow-[0_16px_34px_rgba(120,72,0,0.08)] lg:grid-cols-[1.45fr_0.95fr_1.1fr_0.68fr_8rem] lg:items-center"
                    >
                      <div>
                        <Link
                          href={`/Donor/campaigns/${donation.campaignId}`}
                          className="font-semibold text-stone-950 transition hover:text-[var(--color-orange)]"
                        >
                          {donation.campaignTitle}
                        </Link>
                        <p className="mt-1 text-xs font-medium text-stone-500">
                          {donation.shelterName}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <StatusPill status={donation.campaignStatus} />
                          <span className="text-xs font-semibold text-stone-500">
                            Campaign progress {donation.campaignProgress}%
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100">
                          <div
                            className="donor-ledger-progress h-full rounded-full bg-[linear-gradient(90deg,#f97316,#f59e0b,#facc15)]"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(0, donation.campaignProgress),
                              )}%`,
                            }}
                          />
                        </div>
                        <Link
                          href={`/Donor/receipt/${donation.id}${
                            walletAddress
                              ? `?walletAddress=${encodeURIComponent(walletAddress)}`
                              : ""
                          }`}
                          className="mt-1.5 inline-flex text-xs font-semibold text-[var(--color-orange)] transition hover:text-stone-950"
                        >
                          View receipt
                        </Link>
                      </div>
                      <div className="rounded-2xl border border-orange-100 bg-orange-50/35 p-3 lg:border-0 lg:bg-transparent lg:p-0">
                        <p className="font-black text-stone-950">
                          {donation.amountEth > 0
                            ? formatEth(donation.amountEth)
                            : formatAmount(donation.amount, donation.currency)}
                        </p>
                        {donation.amountEth > 0 ? (
                          <p className="mt-1 text-xs font-semibold text-stone-500">
                            {formatMyr(donation.amount)}
                          </p>
                        ) : null}
                        {donation.refundTxHash ? (
                          <details className="group mt-1.5 overflow-hidden rounded-xl border border-emerald-100 bg-white/90 shadow-sm transition open:bg-emerald-50/35">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-1.5 [&::-webkit-details-marker]:hidden">
                              <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">
                                  Refund
                                </p>
                                <p className="mt-0.5 break-words text-xs font-black leading-5 text-stone-950">
                                  +
                                  {donation.refundAmountEth > 0
                                    ? formatEth(donation.refundAmountEth)
                                    : "Confirmed"}
                                </p>
                              </div>
                              <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-black text-[var(--color-orange)] ring-1 ring-emerald-100 transition group-open:text-emerald-700">
                                View proof
                              </span>
                            </summary>
                            <div className="border-t border-emerald-100 px-2.5 py-2">
                              <div className="grid gap-2 text-[11px] font-semibold text-stone-500">
                                <div className="flex items-center justify-between gap-3">
                                  <span>Transfer type</span>
                                  <span className="text-right text-stone-800">
                                    Internal contract transfer
                                  </span>
                                </div>
                                {donation.refundedAt ? (
                                  <div className="flex items-center justify-between gap-3">
                                    <span>Confirmed</span>
                                    <span className="text-right text-stone-800">
                                      {formatDate(donation.refundedAt)}
                                    </span>
                                  </div>
                                ) : null}
                                <div className="flex items-center justify-between gap-3">
                                  <span>Refund tx</span>
                                  <a
                                    href={getTransactionExplorerUrl(
                                      donation.refundTxHash,
                                    )}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-right font-black text-[var(--color-orange)] transition hover:text-stone-950"
                                  >
                                    {shortHash(donation.refundTxHash)}
                                  </a>
                                </div>
                              </div>
                            </div>
                          </details>
                        ) : null}
                        <RefundClaimButton
                          campaignId={donation.campaignId}
                          contractAddress={donation.contractAddress}
                        />
                      </div>
                      <div className="text-left lg:text-center">
                        {getTransactionExplorerUrl(donation.txHash) ? (
                          <a
                            href={getTransactionExplorerUrl(donation.txHash)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex max-w-full justify-center font-mono text-xs font-black text-[var(--color-orange)] underline-offset-4 transition hover:text-orange-700 hover:underline"
                          >
                            {shortHash(donation.txHash)}
                          </a>
                        ) : (
                          <p className="break-all font-semibold text-stone-600">
                            {shortHash(donation.txHash)}
                          </p>
                        )}
                      </div>
                      <p className="font-medium text-stone-500 lg:text-center">
                        {formatDate(donation.createdAt)}
                      </p>
                      <div className="flex justify-start lg:justify-center">
                        <StatusPill status={donation.status} />
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm font-black text-stone-950">
                    No {activeFilter} donations
                  </p>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
                    Try another ledger filter to review the rest of your
                    donation records.
                  </p>
                </div>
              )}
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
                  <path d="M12 3v18" />
                  <path d="M5 7h14" />
                  <path d="M7 12h10" />
                  <path d="M9 17h6" />
                </svg>
              </div>
              <h3 className="mt-4 text-base font-semibold text-stone-950">
                No donation records yet
              </h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-stone-600">
                After a blockchain donation is confirmed, the amount, receipt
                status, and transaction hash will appear here.
              </p>
              <Link
                href="/Donor/donate"
                className="mt-4 inline-flex rounded-xl bg-[var(--color-orange)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                Open donation page
              </Link>
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="rounded-3xl border border-orange-100 bg-[linear-gradient(180deg,#fff,#fffdf3)] p-4 shadow-[0_18px_48px_rgba(120,72,0,0.07)] sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
                Milestones
              </p>
              <h2 className="mt-1 text-xl font-black text-stone-950">
                Release monitor
              </h2>
            </div>
          </div>

          <div className="donor-thin-scroll mt-4 max-h-[38rem] space-y-3 overflow-y-auto overscroll-contain">
            {campaigns.length > 0 ? (
              campaigns.map((campaign) => (
                <article
                  key={`${campaign.id}-milestones`}
                  className="group overflow-hidden rounded-2xl border border-orange-100 bg-white/95 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_16px_36px_rgba(120,72,0,0.08)]"
                >
                  <div className="relative flex flex-col gap-3 border-b border-orange-100 bg-[linear-gradient(110deg,rgba(var(--color-orange-rgb),0.1),rgba(255,255,255,0.98))] p-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-[var(--color-orange)] opacity-70 transition group-hover:opacity-100" />
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 pl-2 text-base font-black leading-6 text-stone-950">
                        {campaign.title}
                      </h3>
                      <div className="mt-3 pl-2">
                        <div className="flex items-center justify-between gap-4 text-xs font-black text-stone-600">
                          <span>{campaign.raised}% funded</span>
                          <span>{campaign.goal}</span>
                        </div>
                        <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-white shadow-inner">
                          <div
                            className="donor-ledger-progress h-full rounded-full bg-[linear-gradient(90deg,#f97316,#f59e0b,#facc15)]"
                            style={{
                              width: `${Math.min(100, Math.max(0, campaign.raised))}%`,
                            }}
                          />
                          {campaign.raised <= 0 ? (
                            <span className="absolute left-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[var(--color-orange)] shadow-[0_0_12px_rgba(249,115,22,0.45)]" />
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <StatusPill status={campaign.status} />
                  </div>

                  <div className="space-y-2 bg-orange-50/20 p-3">
                    {(
                      campaign.milestoneDetails ??
                      campaign.milestones.map((milestone) => ({
                        ...milestone,
                        requirement: "",
                        status: "Pending",
                        proofUrl: null,
                        proofTxHash: null,
                        reviewTxHash: null,
                        releaseTxHash: null,
                      }))
                    ).map((milestone, index) => (
                      <div
                        key={`${campaign.id}-${
                          "id" in milestone && milestone.id
                            ? milestone.id
                            : `${index}-${milestone.title}`
                        }`}
                        className="grid gap-3 rounded-2xl border border-orange-100 bg-white px-3 py-3 shadow-sm transition hover:border-orange-200 hover:bg-white sm:grid-cols-[1.75rem_minmax(0,1fr)_6.5rem] sm:items-center"
                      >
                        <span className="grid h-7 w-7 place-items-center rounded-lg bg-orange-50 text-xs font-black text-[var(--color-orange)] ring-1 ring-orange-100">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-black text-stone-950">
                            {milestone.title}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-stone-500">
                            <span>{milestone.percentage}% release</span>
                            <span>
                              Stage{" "}
                              {formatMyr(
                                getMilestoneAmount(
                                  campaign.goalAmount,
                                  milestone.percentage,
                                ),
                              )}
                            </span>
                            <span>
                              Target{" "}
                              {formatMyr(
                                getMilestoneAmount(
                                  campaign.goalAmount,
                                  getCumulativeMilestonePercentage(
                                    campaign.milestoneDetails ??
                                      campaign.milestones.map((item) => ({
                                        ...item,
                                        requirement: "",
                                        status: "Pending",
                                        proofUrl: null,
                                        proofTxHash: null,
                                        reviewTxHash: null,
                                        releaseTxHash: null,
                                      })),
                                    index,
                                  ),
                                ),
                              )}
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100">
                            <div
                              className="donor-ledger-progress h-full rounded-full bg-[linear-gradient(90deg,#f97316,#f59e0b,#facc15)]"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(0, milestone.percentage),
                                )}%`,
                              }}
                            />
                          </div>
                          {milestone.requirement ? (
                            <p className="mt-1 text-xs font-medium text-stone-500">
                              Release condition: {milestone.requirement}
                            </p>
                          ) : null}
                          <p className="mt-1 text-xs font-medium text-stone-500">
                            Proof status: {milestone.status}
                          </p>
                          <div className="mt-2">
                            <TransactionLinks
                              proofTxHash={milestone.proofTxHash}
                              reviewTxHash={milestone.reviewTxHash}
                              releaseTxHash={milestone.releaseTxHash}
                            />
                          </div>
                        </div>
                        <StatusPill status={milestone.status} />
                      </div>
                    ))}
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-orange-200 bg-orange-50/30 p-5 text-center">
                <p className="text-sm font-black text-stone-950">
                  No milestone plans to track yet
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
                  Milestone plans will appear after active campaigns are
                  available.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
