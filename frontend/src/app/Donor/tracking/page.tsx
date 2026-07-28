import Link from "next/link";
import {
  getActiveDonorCampaigns,
  getDonorCampaignsByIds,
} from "@/lib/donor-campaigns";
import { getDonorDonations } from "@/lib/donor-donations";
import {
  getAddressExplorerUrl,
  getExplorerNetworkName,
  getTransactionExplorerUrl,
  shortAddress,
} from "@/lib/block-explorer";
import { TransactionLinks } from "@/app/components/TransactionLinks";
import { RefundClaimButton } from "./RefundClaimButton";

type TrackingPageProps = {
  searchParams?: Promise<{
    walletAddress?: string;
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
  return (
    <span
      className={[
        "inline-flex min-w-[6.5rem] justify-center rounded-full border px-2.5 py-1 text-center text-[0.68rem] font-semibold whitespace-nowrap",
        statusStyles[status] ?? "border-slate-200 bg-slate-50 text-slate-600",
      ].join(" ")}
    >
      {status}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-orange-100">
      <div
        className="donor-progress-fill h-full rounded-full bg-[var(--color-orange)]"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function formatAmount(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatMyr(value: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatEth(value: number) {
  return `${value.toLocaleString("en-MY", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  })} ETH`;
}

function getMilestoneAmount(goalAmount: number | undefined, percentage: number) {
  const goal = Number(goalAmount ?? 0);
  const releasePercentage = Number(percentage);

  if (!Number.isFinite(goal) || !Number.isFinite(releasePercentage) || goal <= 0) {
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

function shortHash(value: string) {
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

export default async function DonorTrackingPage({
  searchParams,
}: TrackingPageProps) {
  const params = await searchParams;
  const walletAddress = params?.walletAddress;
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

  const milestoneCount = campaigns.reduce(
    (total, campaign) => total + campaign.milestones.length,
    0,
  );
  const contractConnectedCampaigns = campaigns.filter(
    (campaign) => Boolean(campaign.contractAddress),
  );
  const latestTxHash = donationData.summary.latestDonation?.txHash ?? "";
  const latestTxUrl = latestTxHash ? getTransactionExplorerUrl(latestTxHash) : "";
  const fundedCampaigns = campaigns.filter((campaign) => campaign.raised > 0).length;
  const lockedDonationStats = [
    {
      label: "Total donated",
      value:
        donationData.summary.totalEth > 0
          ? formatEth(donationData.summary.totalEth)
          : "0 ETH",
      detail: `${formatAmount(
        donationData.summary.totalAmount,
        donationData.summary.currency,
      )} estimated value`,
    },
    {
      label: "Transaction hashes",
      value: String(donationData.summary.donationCount),
      detail: "Saved donation history",
    },
    { label: "Tracked campaigns", value: String(campaigns.length), detail: "Active and donated campaigns" },
    { label: "Milestone plans", value: String(milestoneCount), detail: "Campaign milestone plans" },
  ];

  return (
    <div className="space-y-5">
      <section className="donor-tech-hero rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
              Tracking
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-stone-950 sm:text-3xl">
              Donation ledger
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Review your donation history, transaction hashes, campaign
              progress, and milestone release status.
            </p>
          </div>
          <Link
            href="/Donor/discover"
            className="inline-flex w-fit items-center justify-center rounded-xl bg-[var(--color-orange)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            Support a campaign
          </Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {lockedDonationStats.map((stat) => (
          <div
            key={stat.label}
            className="donor-tech-metric rounded-2xl border border-orange-100 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
              {stat.label}
            </p>
            <p className="mt-2 text-2xl font-black text-stone-950">
              {stat.value}
            </p>
            <p className="mt-1 text-xs font-medium text-stone-500">
              {stat.detail}
            </p>
          </div>
        ))}
      </section>

      <section className="donor-gradient-card rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
              On-chain proof
            </p>
            <h2 className="mt-1 text-xl font-black text-stone-950">
              Verification summary
            </h2>
          </div>
          <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
            {getExplorerNetworkName()}
          </span>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          {[
            ["Network", getExplorerNetworkName()],
            ["Verified tx", String(donationData.summary.confirmedCount)],
            ["Contract campaigns", String(contractConnectedCampaigns.length)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-orange-100 bg-orange-50/30 px-3 py-2.5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
                {label}
              </p>
              <p className="mt-1 text-lg font-black text-stone-950">{value}</p>
            </div>
          ))}
          <div className="rounded-xl border border-orange-100 bg-orange-50/30 px-3 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
              Latest tx
            </p>
            {latestTxUrl ? (
              <a
                href={latestTxUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex text-sm font-black text-[var(--color-orange)] transition hover:text-stone-950"
              >
                {shortHash(latestTxHash)}
              </a>
            ) : (
              <p className="mt-1 text-sm font-black text-stone-950">No tx yet</p>
            )}
          </div>
        </div>
      </section>

      <section className="donor-gradient-card rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
              Donation ledger
            </p>
            <h2 className="mt-1 text-xl font-black text-stone-950">
              Past donations
            </h2>
          </div>
          <StatusPill status="Pending" />
        </div>

        {donationData.donations.length > 0 ? (
          <div className="mt-4 overflow-hidden rounded-xl border border-orange-100">
            <div className="hidden grid-cols-[1.3fr_0.9fr_1fr_1fr_7rem] gap-3 border-b border-orange-100 bg-orange-50/40 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-stone-400 lg:grid">
              <span>Campaign</span>
              <span>Amount</span>
              <span>Transaction hash</span>
              <span>Date</span>
              <span className="text-center">Status</span>
            </div>
            <div className="divide-y divide-orange-100">
              {donationData.donations.map((donation) => (
                <article
                  key={donation.id}
                  className="donor-ledger-row grid gap-3 px-3 py-3 text-sm lg:grid-cols-[1.3fr_0.9fr_1fr_1fr_7rem] lg:items-center"
                >
                  <div>
                    <Link
                      href={`/Donor/campaigns/${donation.campaignId}`}
                      className="font-semibold text-stone-950 transition hover:text-[var(--color-orange)]"
                    >
                      {donation.campaignTitle}
                    </Link>
                    <p className="mt-1 text-xs font-medium text-stone-500">
                      {donation.shelterName} - {donation.location}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusPill status={donation.campaignStatus} />
                      <span className="text-xs font-semibold text-stone-500">
                        Campaign progress {donation.campaignProgress}%
                      </span>
                    </div>
                    <Link
                      href={`/Donor/receipt/${donation.id}${
                        walletAddress
                          ? `?walletAddress=${encodeURIComponent(walletAddress)}`
                          : ""
                      }`}
                      className="mt-2 inline-flex text-xs font-semibold text-[var(--color-orange)] transition hover:text-stone-950"
                    >
                      View receipt
                    </Link>
                    <RefundClaimButton
                      campaignId={donation.campaignId}
                      contractAddress={donation.contractAddress}
                    />
                  </div>
                  <div>
                    <p className="font-black text-stone-950">
                      {donation.amountEth > 0
                        ? formatEth(donation.amountEth)
                        : formatAmount(donation.amount, donation.currency)}
                    </p>
                    {donation.amountEth > 0 ? (
                      <p className="mt-1 text-xs font-semibold text-stone-500">
                        Approx. {formatAmount(donation.amount, donation.currency)}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    {getTransactionExplorerUrl(donation.txHash) ? (
                      <a
                        href={getTransactionExplorerUrl(donation.txHash)}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all font-semibold text-[var(--color-orange)] underline-offset-4 transition hover:text-stone-950 hover:underline"
                      >
                        {shortHash(donation.txHash)}
                      </a>
                    ) : (
                      <p className="break-all font-semibold text-stone-600">
                        {shortHash(donation.txHash)}
                      </p>
                    )}
                    <p className="mt-1 text-xs font-semibold text-stone-500">
                      Etherscan
                    </p>
                  </div>
                  <p className="font-medium text-stone-500">
                    {formatDate(donation.createdAt)}
                  </p>
                  <StatusPill status={donation.status} />
                </article>
              ))}
            </div>
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
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="donor-gradient-card rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
            Campaigns
          </p>
          <h2 className="mt-1 text-xl font-black text-stone-950">
            Campaign progress
          </h2>

          <div className="mt-4 space-y-3">
            {campaigns.length > 0 ? (
              campaigns.map((campaign) => (
                <article
                  key={campaign.id}
                  className="donor-ledger-row rounded-xl border border-orange-100 p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <Link
                        href={`/Donor/campaigns/${campaign.id}`}
                        className="text-sm font-semibold text-stone-950 transition hover:text-[var(--color-orange)]"
                      >
                        {campaign.title}
                      </Link>
                      <p className="mt-1 text-xs font-semibold text-stone-500">
                        {campaign.shelter} -{" "}
                        {campaign.status === "Completed"
                          ? "Completed"
                          : `${campaign.daysLeft} days left`}
                      </p>
                      {campaign.contractAddress &&
                      getAddressExplorerUrl(campaign.contractAddress) ? (
                        <a
                          href={getAddressExplorerUrl(campaign.contractAddress)}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex text-xs font-black text-[var(--color-orange)] transition hover:text-stone-950"
                        >
                          Contract {shortAddress(campaign.contractAddress)}
                        </a>
                      ) : null}
                    </div>
                    <StatusPill status={campaign.status} />
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between gap-4 text-xs font-semibold text-stone-500">
                      <span>Raised</span>
                      <span>{campaign.raised}% of {campaign.goal}</span>
                    </div>
                    <div className="mt-2">
                      <ProgressBar value={campaign.raised} />
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                    <div className="rounded-xl bg-orange-50/40 p-3">
                      <p className="font-black text-stone-950">
                        {campaign.location}
                      </p>
                      <p className="text-xs font-medium text-stone-500">
                        Location
                      </p>
                    </div>
                    <div className="rounded-xl bg-orange-50/40 p-3">
                      <p className="font-black text-stone-950">
                        {campaign.milestones.length}
                      </p>
                      <p className="text-xs font-medium text-stone-500">
                        Milestones
                      </p>
                    </div>
                    <div className="rounded-xl bg-orange-50/40 p-3">
                      <p className="font-black text-stone-950">
                        {campaign.urgency}
                      </p>
                      <p className="text-xs font-medium text-stone-500">
                        Urgency
                      </p>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-orange-200 bg-orange-50/30 p-5 text-center">
                <p className="text-sm font-black text-stone-950">
                  No tracked campaigns yet
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
                  Active campaigns and campaigns you have donated to will appear here.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="donor-gradient-card rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
            Milestones
          </p>
          <h2 className="mt-1 text-xl font-black text-stone-950">
            Release monitor
          </h2>

          <div className="mt-4 space-y-3">
            {campaigns.length > 0 ? (
              campaigns.map((campaign) => (
                <article
                  key={`${campaign.id}-milestones`}
                  className="rounded-xl border border-orange-100 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-stone-950">
                        {campaign.title}
                      </h3>
                      <p className="mt-1 text-xs font-semibold text-stone-500">
                        Funds are released according to approved milestones.
                      </p>
                    </div>
                    <StatusPill status={campaign.status} />
                  </div>

                  <div className="mt-3 divide-y divide-orange-100 overflow-hidden rounded-xl border border-orange-100">
                    {(campaign.milestoneDetails ??
                      campaign.milestones.map((milestone) => ({
                        ...milestone,
                        requirement: "",
                        status: "Pending",
                        proofUrl: null,
                        proofTxHash: null,
                        reviewTxHash: null,
                        releaseTxHash: null,
                      }))
                    ).map(
                      (milestone, index) => (
                        <div
                          key={`${campaign.id}-${milestone.title}`}
                          className="donor-ledger-row grid gap-3 px-3 py-2.5 sm:grid-cols-[1.75rem_minmax(0,1fr)_6.5rem] sm:items-center"
                        >
                          <span className="grid h-7 w-7 place-items-center rounded-lg bg-white text-xs font-black text-[var(--color-orange)] ring-1 ring-orange-100">
                            {index + 1}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-stone-950">
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
                      ),
                    )}
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
