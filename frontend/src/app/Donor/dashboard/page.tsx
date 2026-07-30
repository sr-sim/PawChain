import Link from "next/link";
import { DonorRoleNFTCard } from "@/app/components/DonorRoleNFTCard";
import { getDashboardProfile } from "@/lib/dashboard-access";
import { getActiveDonorCampaigns } from "@/lib/donor-campaigns";
import { getDonorDonations } from "@/lib/donor-donations";
import {
  getExplorerNetworkName,
  getTransactionExplorerUrl,
} from "@/lib/block-explorer";
import { getShelters } from "../campaignData";
import { RefundClaimButton } from "../tracking/RefundClaimButton";
import { getLatestEthMyrRate } from "@/lib/currency";

type DashboardProps = {
  searchParams?: Promise<{
    walletAddress?: string;
  }>;
};

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Waiting: "border-slate-200 bg-slate-50 text-slate-600",
    Confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Failed: "border-red-200 bg-red-50 text-red-700",
    Refunded: "border-sky-200 bg-sky-50 text-sky-700",
    "Under review": "border-amber-200 bg-amber-50 text-amber-700",
    "Funds released": "border-emerald-200 bg-emerald-50 text-emerald-700",
    "Pending proof": "border-slate-200 bg-slate-50 text-slate-600",
  };

  return (
    <span
      className={[
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
        styles[status] ?? "bg-slate-100 text-slate-600",
      ].join(" ")}
    >
      {status}
    </span>
  );
}

function formatAmount(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatEth(amount: number) {
  return `${amount.toLocaleString("en-MY", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  })} ETH`;
}

function formatLiveMyr(amount: number) {
  return `Approx. live MYR ${amount.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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

export default async function DonorDashboard({ searchParams }: DashboardProps) {
  const params = await searchParams;
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

  const ethMyrRate = (await getLatestEthMyrRate()).rate;
  const totalLiveMyr = donationData.summary.totalEth * ethMyrRate;
  const shelters = getShelters(activeCampaigns);
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
  const latestRefund = claimedRefunds[0];
  const latestDonationTx = donationData.summary.latestDonation?.txHash ?? "";
  const latestDonationTxUrl = latestDonationTx
    ? getTransactionExplorerUrl(latestDonationTx)
    : "";
  const summaryStats = [
    {
      label: "Total donated",
      value: `${donationData.summary.totalEth.toLocaleString("en-MY", {
        minimumFractionDigits: 4,
        maximumFractionDigits: 6,
      })} ETH`,
      detail: formatLiveMyr(totalLiveMyr),
    },
    {
      label: "Active campaigns",
      value: String(activeCampaigns.length),
      detail: `${shelters.length} verified shelters available`,
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
          ? "Action needed in tracking"
          : totalRefundedEth > 0
            ? `${formatEth(totalRefundedEth)} received`
            : "No pending refunds",
    },
  ];

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[1.35rem] border border-orange-100 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-amber-50/70 p-5 sm:p-6">
            <div className="relative z-10">
              <h1 className="max-w-2xl text-2xl font-black tracking-tight text-stone-950 sm:text-4xl">
                Welcome back, {displayName}.
              </h1>
              <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
                    Confirmed donated
                  </p>
                  <p className="mt-1 text-4xl font-black tracking-tight text-stone-950 sm:text-5xl">
                    {formatEth(donationData.summary.totalEth)}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-stone-500">
                    {formatLiveMyr(totalLiveMyr)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs sm:min-w-64">
                  <div className="relative rounded-2xl border border-orange-100 bg-white/85 p-3">
                    <p className="font-black uppercase tracking-[0.12em] text-stone-400">
                      Verified actions
                    </p>
                    <p className="mt-1 text-lg font-black text-stone-950">
                      {donationData.summary.confirmedCount}
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold text-stone-500">
                      confirmed records
                    </p>
                  </div>
                  <div className="relative overflow-visible rounded-2xl border border-orange-100 bg-white/85 p-3">
                    <div className="donor-smart-shiba" aria-hidden="true">
                      <span className="donor-smart-paw donor-smart-paw-one" />
                      <span className="donor-smart-paw donor-smart-paw-two" />
                      <img
                        src="/images/donor-shiba-cutout.png"
                        alt=""
                        className="donor-smart-shiba-img"
                      />
                    </div>
                    <p className="relative font-black uppercase tracking-[0.12em] text-stone-400">
                      Smart campaigns
                    </p>
                    <p className="relative mt-1 text-lg font-black text-stone-950">
                      {contractConnectedCampaigns.length}
                    </p>
                    <p className="relative mt-0.5 text-[11px] font-semibold text-stone-500">
                      contract linked
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/Donor/donate"
                  className="inline-flex items-center justify-center rounded-xl bg-[var(--color-orange)] px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-orange-600"
                >
                  Donate now
                </Link>
                <Link
                  href="/Donor/tracking"
                  className="inline-flex items-center justify-center rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-black text-stone-900 transition hover:-translate-y-0.5 hover:border-[var(--color-orange)] hover:bg-orange-50"
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
      </section>

      <section className="overflow-hidden rounded-[1.35rem] border border-orange-100 bg-white shadow-sm">
        <div className="border-b border-orange-100 p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-orange)]">
                Control center
              </p>
              <h2 className="mt-1 text-xl font-black text-stone-950">
                What needs your attention
              </h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[34rem]">
            {summaryStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-orange-100 bg-orange-50/25 p-3"
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

        <div className="grid gap-0 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="border-b border-orange-100 bg-gradient-to-br from-white to-orange-50/35 p-4 sm:p-5 xl:border-r xl:border-b-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-orange)]">
                  Refund status
                </p>
                <h3 className="mt-1 text-lg font-black text-stone-950">
                  {potentialRefunds.length > 0
                    ? "Refund ready to review"
                    : latestRefund
                      ? "Latest refund claimed"
                      : "No refund action needed"}
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
                  ? "Claim check"
                  : latestRefund
                    ? "Claimed"
                    : "Clear"}
              </span>
            </div>
            <div className="mt-4">
              {potentialRefunds.length > 0 ? (
                potentialRefunds.slice(0, 1).map((donation) => (
                  <article key={donation.id}>
                    <div className="rounded-2xl border border-orange-100 bg-white p-3 shadow-sm">
                      <p className="text-sm font-black text-stone-950">
                        {donation.campaignTitle}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-stone-500">
                        Campaign is {donation.campaignStatus.toLowerCase()}.
                        The contract will show a claim button if ETH is refundable.
                      </p>
                    </div>
                    <RefundClaimButton
                      campaignId={donation.campaignId}
                      contractAddress={donation.contractAddress}
                    />
                  </article>
                ))
              ) : latestRefund ? (
                <article className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-4 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                    Received
                  </p>
                  <p className="mt-1 text-xl font-black text-stone-950">
                    +{latestRefund.refundAmountEth > 0
                      ? formatEth(latestRefund.refundAmountEth)
                      : "Confirmed"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-stone-600">
                    {latestRefund.campaignTitle}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-black">
                    {latestRefund.refundTxHash ? (
                      <a
                        href={getTransactionExplorerUrl(latestRefund.refundTxHash)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--color-orange)] transition hover:text-stone-950"
                      >
                        Etherscan proof
                      </a>
                    ) : null}
                    <Link
                      href="/Donor/tracking"
                      className="text-emerald-700 transition hover:text-stone-950"
                    >
                      View ledger
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
                  Live campaigns
                </p>
                <h3 className="mt-1 text-lg font-black text-stone-950">
                  Open for support
                </h3>
              </div>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                {getExplorerNetworkName()}
              </span>
            </div>
            <div className="mt-4 space-y-2">
              {latestCampaigns.length > 0 ? (
                latestCampaigns.map((campaign) => (
                  <Link
                    key={campaign.id}
                    href={`/Donor/campaigns/${campaign.id}`}
                    className="group block rounded-2xl border border-orange-100 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--color-orange)] hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-stone-950 group-hover:text-[var(--color-orange)]">
                          {campaign.title}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-stone-500">
                          {campaign.shelter} - {campaign.daysLeft} days left
                        </p>
                      </div>
                      <span className="text-xs font-black text-stone-950">
                        {campaign.raised}%
                      </span>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-orange-100">
                      <div
                        className="donor-progress-fill h-full rounded-full bg-[var(--color-orange)]"
                        style={{ width: `${campaign.raised}%` }}
                      />
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-orange-200 bg-orange-50/25 p-4 text-sm font-semibold text-stone-600">
                  No active campaigns approved yet.
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50/70 to-white px-3 py-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                  Latest proof
                </p>
                {latestDonationTxUrl ? (
                  <a
                    href={latestDonationTxUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block break-all text-xs font-black text-[var(--color-orange)] transition hover:text-stone-950"
                  >
                    {shortHash(latestDonationTx)}
                  </a>
                ) : (
                  <p className="mt-1 text-xs font-semibold text-stone-500">
                    No transaction yet
                  </p>
                )}
              </div>
              <p className="text-right text-xs font-semibold text-stone-500">
                {donationData.summary.confirmedCount} verified records across{" "}
                {contractConnectedCampaigns.length} smart campaigns
              </p>
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
                    <p className="mt-2 break-all text-xs font-semibold text-stone-500">
                      Tx: {shortHash(donation.txHash)}
                    </p>
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
                      {donation.amountEth > 0
                        ? `${donation.amountEth.toLocaleString("en-MY", {
                            minimumFractionDigits: 4,
                            maximumFractionDigits: 6,
                          })} ETH`
                        : formatAmount(donation.amount, donation.currency)}
                    </p>
                    {donation.amountEth > 0 ? (
                      <p className="text-xs font-semibold text-stone-500">
                        {formatLiveMyr(donation.amountEth * ethMyrRate)}
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
