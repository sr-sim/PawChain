import Link from "next/link";
import { DonorRoleNFTCard } from "@/app/components/DonorRoleNFTCard";
import { getDashboardProfile } from "@/lib/dashboard-access";
import { getActiveDonorCampaigns } from "@/lib/donor-campaigns";
import { getDonorDonations } from "@/lib/donor-donations";
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
    description: "Select a campaign and review the preview.",
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
  let donationData: Awaited<ReturnType<typeof getDonorDonations>> = {
    donations: [],
    summary: {
      totalAmount: 0,
      currency: "MYR",
      donationCount: 0,
      confirmedCount: 0,
      latestDonation: null,
    },
  };

  try {
    activeCampaigns = await getActiveDonorCampaigns();
    donationData = await getDonorDonations(walletAddress);
  } catch {
    activeCampaigns = [];
  }

  const shelters = getShelters(activeCampaigns);
  const latestCampaigns = activeCampaigns.slice(0, 2);
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
  const transparencyOverview = [
    {
      label: "Active campaigns",
      value: String(activeCampaigns.length),
    },
    {
      label: "Verified shelters",
      value: String(shelters.length),
    },
    {
      label: "Milestone plans",
      value: String(milestoneCount),
    },
    {
      label: "Donation records",
      value: String(donationData.summary.donationCount),
    },
  ];
  const summaryStats = [
    {
      label: "Total donated",
      value: formatAmount(
        donationData.summary.totalAmount,
        donationData.summary.currency,
      ),
      detail: `${donationData.summary.confirmedCount} confirmed donations`,
    },
    {
      label: "Active campaigns",
      value: String(activeCampaigns.length),
      detail: `${shelters.length} verified shelters available`,
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
      <section className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-orange)]">
              Donor dashboard
            </p>
            <h1 className="mt-2 max-w-2xl text-2xl font-black tracking-tight text-stone-950 sm:text-3xl">
              Welcome back, {displayName}.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Your donor profile and available verified campaigns are organized
              here with real campaign records, donation history, and donor
              notifications from Supabase.
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

      <section className="grid gap-3 md:grid-cols-3">
        {summaryStats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm"
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
        <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
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

        <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
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
                className="rounded-xl border border-orange-100 bg-orange-50/25 p-3"
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
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <IconBadge>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 3v18" />
                <path d="M5 7h14" />
                <path d="M7 12h10" />
                <path d="M9 17h6" />
              </svg>
            </IconBadge>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-orange)]">
                Trust overview
              </p>
              <h2 className="mt-1 text-xl font-black text-stone-950">
                Donation transparency
              </h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                One compact view for on-chain records and milestone release
                status.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {transparencyOverview.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-orange-100 bg-orange-50/30 px-3 py-2.5"
              >
                <p className="text-lg font-black text-stone-950">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-xs font-medium text-stone-500">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-orange-100 bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-stone-950">
                Campaign readiness
              </p>
              <p className="text-xs font-medium text-stone-500">
                Supabase data
              </p>
            </div>
            <div className="mt-3 flex h-32 items-end gap-3">
              {activeCampaigns.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <div className="flex h-24 w-full items-end rounded-lg bg-orange-50">
                    <div
                      className="donor-progress-fill w-full rounded-lg bg-[var(--color-orange)]"
                      style={{
                        height: `${Math.max(18, item.raised)}%`,
                      }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-black text-stone-950">
                      {item.raised}%
                    </p>
                    <p className="text-[0.68rem] font-semibold text-stone-400">
                      {item.urgency}
                    </p>
                  </div>
                </div>
              ))}
              {activeCampaigns.length === 0 ? (
                <div className="grid h-full flex-1 place-items-center rounded-xl border border-dashed border-orange-200 bg-orange-50/25 text-center text-sm font-semibold text-stone-600">
                  Waiting for approved campaigns.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-orange)]">
                Verification flow
              </p>
              <h2 className="mt-1 text-xl font-black text-stone-950">
                From donation to release
              </h2>
            </div>
            <Link
              href="/Donor/tracking"
              className="text-sm font-semibold text-[var(--color-orange)] transition hover:text-stone-950"
            >
              Track details
            </Link>
          </div>
          <div className="mt-4 divide-y divide-orange-100 overflow-hidden rounded-xl border border-orange-100">
            {impactSteps.map((step, index) => (
              <div
                key={step.title}
                className="grid gap-3 bg-orange-50/20 px-3 py-3 sm:grid-cols-[2rem_1fr] sm:items-start"
              >
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-white text-xs font-black text-[var(--color-orange)] ring-1 ring-orange-100">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-stone-950">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-stone-600">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
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
                  className="grid gap-3 bg-orange-50/20 px-3 py-3 sm:grid-cols-[1fr_auto] sm:items-start"
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
                      {formatAmount(donation.amount, donation.currency)}
                    </p>
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
                and confirmation status will appear here from Supabase.
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
                className="rounded-xl border border-orange-100 bg-orange-50/30 p-3"
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
