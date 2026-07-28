import Link from "next/link";
import { DonorRoleNFTCard } from "@/app/components/DonorRoleNFTCard";
import { getDashboardProfile } from "@/lib/dashboard-access";
import {
  getActiveDonorCampaigns,
  getDonorCampaignsByIds,
} from "@/lib/donor-campaigns";
import { getDonorDonations } from "@/lib/donor-donations";
import {
  getExplorerNetworkName,
  getTransactionExplorerUrl,
} from "@/lib/block-explorer";
import { getShelters } from "../campaignData";

type DashboardProps = {
  searchParams?: Promise<{
    walletAddress?: string;
  }>;
};

const quickActions = [
  {
    title: "Find campaigns",
    description: "Browse verified shelters and active needs.",
    href: "/Donor/discover",
  },
  {
    title: "Make donation",
    description: "Select a campaign and confirm your support.",
    href: "/Donor/donate",
  },
  {
    title: "Ask for help",
    description: "Report concerns or ask admin a question.",
    href: "/Donor/help",
  },
];

const impactSteps = [
  {
    title: "Donation confirmed",
    description: "Wallet transaction is recorded on-chain.",
  },
  {
    title: "Funds locked",
    description: "Donation waits for milestone proof.",
  },
  {
    title: "Proof reviewed",
    description: "Admin checks shelter evidence.",
  },
  {
    title: "Funds released",
    description: "Approved support reaches the shelter.",
  },
];

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

function IconBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-orange-50 text-[var(--color-orange)] ring-1 ring-orange-100 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:stroke-current [&>svg]:stroke-2 [&>svg]:stroke-linecap-round [&>svg]:stroke-linejoin-round">
      {children}
    </span>
  );
}

function formatAmount(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("en-MY", {
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
  let supportedCampaigns: Awaited<ReturnType<typeof getActiveDonorCampaigns>> = [];
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
    const [activeRows, supportedRows] = await Promise.all([
      getActiveDonorCampaigns(),
      getDonorCampaignsByIds(
        donationData.donations.map((donation) => donation.campaignId),
      ),
    ]);
    activeCampaigns = activeRows;
    supportedCampaigns = supportedRows;
  } catch {
    activeCampaigns = [];
    supportedCampaigns = [];
  }

  const shelters = getShelters(activeCampaigns);
  const completedSupportedCampaigns = supportedCampaigns.filter(
    (campaign) => campaign.status === "Completed",
  );
  const latestCampaigns = activeCampaigns.slice(0, 2);
  const contractConnectedCampaigns = activeCampaigns.filter(
    (campaign) => Boolean(campaign.contractAddress),
  );
  const latestDonationTx = donationData.summary.latestDonation?.txHash ?? "";
  const latestDonationTxUrl = latestDonationTx
    ? getTransactionExplorerUrl(latestDonationTx)
    : "";
  const milestoneCount = activeCampaigns.reduce(
    (total, campaign) => total + campaign.milestones.length,
    0,
  );
  const activeCampaignMilestones = activeCampaigns.slice(0, 3).map((campaign) => ({
    campaign: campaign.title,
    milestone: campaign.milestones[0]?.title ?? "Milestone plan pending",
    status: "Active",
    description: `${campaign.shelter} has ${campaign.milestones.length} planned milestone releases for this campaign.`,
  }));
  const summaryStats = [
    {
      label: "Total donated",
      value: `${donationData.summary.totalEth.toLocaleString("en-MY", {
        minimumFractionDigits: 4,
        maximumFractionDigits: 6,
      })} ETH`,
      detail: `${formatAmount(
        donationData.summary.totalAmount,
        donationData.summary.currency,
      )} estimated value`,
    },
    {
      label: "Active campaigns",
      value: String(activeCampaigns.length),
      detail: `${shelters.length} verified shelters available`,
    },
    {
      label: "Completed impact",
      value: String(completedSupportedCampaigns.length),
      detail: "Supported campaigns completed",
    },
    {
      label: "Role access",
      value: accessMode === "wallet" ? "NFT" : accessMode,
      detail:
        accessMode === "wallet" ? "Verified by RoleNFT" : "Verified account",
    },
  ];

  return (
    <div className="space-y-5">
      <section className="donor-tech-hero overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-orange)]">
              Donor dashboard
            </p>
            <h1 className="mt-2 max-w-2xl text-2xl font-black tracking-tight text-stone-950 sm:text-3xl">
              Welcome back, {displayName}.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Manage your donor profile, follow active campaigns, and review
              donation history from one place.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/Donor/discover"
                className="inline-flex items-center justify-center rounded-xl bg-[var(--color-orange)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                Browse campaigns
              </Link>
              <Link
                href="/Donor/tracking"
                className="inline-flex items-center justify-center rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-900 transition hover:border-[var(--color-orange)] hover:bg-orange-50"
              >
                View tracking
              </Link>
            </div>
          </div>

          <DonorRoleNFTCard
            accessMode={accessMode}
            roleNFT={roleNFT}
            userId={userId}
            variant="compact"
            walletAddress={walletAddress}
          />
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {summaryStats.map((stat) => (
          <div
            key={stat.label}
            className="donor-tech-metric rounded-2xl border border-orange-100 bg-white p-4 shadow-sm ring-1 ring-white/70"
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

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="donor-gradient-card rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-orange)]">
            Quick actions
          </p>
          <h2 className="mt-1 text-xl font-black text-stone-950">
            Common donor tasks
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="rounded-xl border border-orange-100 bg-orange-50/25 p-3 transition hover:border-[var(--color-orange)] hover:bg-white"
              >
                <p className="text-sm font-semibold text-stone-950">
                  {action.title}
                </p>
                <p className="mt-1 text-xs leading-5 text-stone-600">
                  {action.description}
                </p>
              </Link>
            ))}
          </div>
        </div>

        <div className="donor-gradient-card rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-orange)]">
                Watchlist
              </p>
              <h2 className="mt-1 text-xl font-black text-stone-950">
                Latest active campaigns
              </h2>
            </div>
            <Link
              href="/Donor/discover"
              className="text-sm font-semibold text-[var(--color-orange)] transition hover:text-stone-950"
            >
              Browse
            </Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {latestCampaigns.length > 0 ? (
            latestCampaigns.map((campaign) => (
              <article
                key={campaign.id}
                className="donor-gradient-card rounded-xl border border-orange-100 bg-orange-50/25 p-3"
              >
                <Link
                  href={`/Donor/campaigns/${campaign.id}`}
                  className="text-sm font-semibold text-stone-950 transition hover:text-[var(--color-orange)]"
                >
                  {campaign.title}
                </Link>
                <p className="mt-1 text-xs font-medium text-stone-500">
                  {campaign.shelter} - {campaign.daysLeft} days left
                </p>
                <div className="mt-3 flex items-center justify-between text-xs font-semibold text-stone-500">
                  <span>Raised</span>
                  <span>{campaign.raised}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-orange-100">
                  <div
                    className="donor-progress-fill h-full rounded-full bg-[var(--color-orange)]"
                    style={{ width: `${campaign.raised}%` }}
                  />
                </div>
              </article>
            ))
            ) : (
              <div className="rounded-xl border border-dashed border-orange-200 bg-orange-50/25 p-4 text-sm font-semibold text-stone-600 md:col-span-2">
                No active campaigns approved yet.
              </div>
            )}
          </div>
          {completedSupportedCampaigns.length > 0 ? (
            <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-emerald-900">
                  Completed impact
                </p>
                <Link
                  href="/Donor/tracking"
                  className="text-xs font-black text-emerald-800 transition hover:text-stone-950"
                >
                  View tracking
                </Link>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {completedSupportedCampaigns.slice(0, 2).map((campaign) => (
                  <Link
                    key={campaign.id}
                    href={`/Donor/campaigns/${campaign.id}`}
                    className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-stone-950 ring-1 ring-emerald-100 transition hover:text-[var(--color-orange)]"
                  >
                    <span className="block truncate">{campaign.title}</span>
                    <span className="mt-1 block text-xs font-semibold text-emerald-700">
                      Completed - 100%
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="donor-gradient-card rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-orange)]">
              Proof & release
            </p>
            <h2 className="mt-1 text-xl font-black text-stone-950">
              Campaign transparency
            </h2>
          </div>
          <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
            {getExplorerNetworkName()}
          </span>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-2 sm:grid-cols-4">
            {[
              ["Verified tx", String(donationData.summary.confirmedCount)],
              ["Contracts", String(contractConnectedCampaigns.length)],
              ["Shelters", String(shelters.length)],
              ["Milestones", String(milestoneCount)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-orange-100 bg-orange-50/30 px-3 py-2.5"
              >
                <p className="text-lg font-black text-stone-950">{value}</p>
                <p className="mt-0.5 text-xs font-medium text-stone-500">
                  {label}
                </p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-orange-100 bg-orange-50/25 px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-stone-950">Latest tx</p>
              {latestDonationTxUrl ? (
                <a
                  href={latestDonationTxUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-xs font-black text-[var(--color-orange)] transition hover:text-stone-950"
                >
                  {shortHash(latestDonationTx)}
                </a>
              ) : (
                <p className="text-xs font-semibold text-stone-500">No tx yet</p>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {impactSteps.map((step) => (
                <span
                  key={step.title}
                  className="donor-chain-node rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-600 ring-1 ring-orange-100"
                  title={step.description}
                >
                  {step.title}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
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
                        Approx. {formatAmount(donation.amount, donation.currency)}
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

        <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-orange)]">
                Notifications
              </p>
              <h2 className="mt-1 text-xl font-black text-stone-950">
                Milestone updates
              </h2>
            </div>
            <IconBadge>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
                <path d="M10 21h4" />
              </svg>
            </IconBadge>
          </div>

          <div className="mt-4 space-y-3">
            {activeCampaignMilestones.length > 0 ? (
            activeCampaignMilestones.map((notification) => (
              <article
                key={`${notification.campaign}-${notification.milestone}`}
                className="donor-ledger-row rounded-xl border border-orange-100 p-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-stone-950">
                      {notification.milestone}
                    </p>
                    <p className="mt-1 text-xs font-medium text-stone-500">
                      {notification.campaign}
                    </p>
                  </div>
                  <StatusPill status={notification.status} />
                </div>
                <p className="mt-3 text-sm leading-6 text-stone-600">
                  {notification.description}
                </p>
              </article>
            ))
            ) : (
              <div className="rounded-xl border border-dashed border-orange-200 bg-orange-50/30 p-4 text-sm font-semibold text-stone-600">
                Milestone updates will appear after campaigns are approved.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
