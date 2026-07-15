import Link from "next/link";
import { getActiveDonorCampaigns } from "@/lib/donor-campaigns";
import { getDonorDonations } from "@/lib/donor-donations";

type TrackingPageProps = {
  searchParams?: Promise<{
    walletAddress?: string;
  }>;
};

const statusStyles: Record<string, string> = {
  Active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
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
      currency: "MYR",
      donationCount: 0,
      confirmedCount: 0,
      latestDonation: null,
    },
  };

  try {
    campaigns = await getActiveDonorCampaigns();
    donationData = await getDonorDonations(walletAddress);
  } catch {
    campaigns = [];
  }

  const milestoneCount = campaigns.reduce(
    (total, campaign) => total + campaign.milestones.length,
    0,
  );
  const fundedCampaigns = campaigns.filter((campaign) => campaign.raised > 0).length;
  const lockedDonationStats = [
    {
      label: "Total donated",
      value:
        donationData.summary.totalAmount > 0
          ? formatAmount(
              donationData.summary.totalAmount,
              donationData.summary.currency,
            )
          : "MYR 0.00",
      detail: `${donationData.summary.confirmedCount} confirmed records`,
    },
    {
      label: "Transaction hashes",
      value: String(donationData.summary.donationCount),
      detail: "From donations table",
    },
    { label: "Active campaigns", value: String(campaigns.length), detail: "From Supabase" },
    { label: "Milestone plans", value: String(milestoneCount), detail: "From campaign records" },
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
              Tracking
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-stone-950 sm:text-3xl">
              Donation tracking and fund transparency
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Track real donation records, blockchain transaction hashes,
              active campaign progress, and milestone plans in one donor view.
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

      <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
              Donation ledger
            </p>
            <h2 className="mt-1 text-xl font-black text-stone-950">
              Past donations and blockchain hashes
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
                  className="grid gap-3 bg-orange-50/15 px-3 py-3 text-sm lg:grid-cols-[1.3fr_0.9fr_1fr_1fr_7rem] lg:items-center"
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
                  </div>
                  <p className="font-black text-stone-950">
                    {formatAmount(donation.amount, donation.currency)}
                  </p>
                  <p className="break-all font-semibold text-stone-600">
                    {shortHash(donation.txHash)}
                  </p>
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
              After a blockchain donation is confirmed and saved into Supabase,
              the amount, receipt status, and transaction hash will appear here.
            </p>
            <Link
              href="/Donor/donate"
              className="mt-4 inline-flex rounded-xl bg-[var(--color-orange)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              Open donation preview
            </Link>
          </div>
        )}
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
            Campaign progress
          </p>
          <h2 className="mt-1 text-xl font-black text-stone-950">
            Active campaigns available to donors
          </h2>

          <div className="mt-4 space-y-3">
            {campaigns.length > 0 ? (
              campaigns.map((campaign) => (
                <article
                  key={campaign.id}
                  className="rounded-xl border border-orange-100 bg-white p-4"
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
                        {campaign.shelter} - {campaign.daysLeft} days left
                      </p>
                    </div>
                    <StatusPill status={campaign.status} />
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between gap-4 text-xs font-semibold text-stone-500">
                      <span>Raised</span>
                      <span>
                        {campaign.raised}% of {campaign.goal}
                      </span>
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
                  No active campaigns approved yet
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
                  When Admin approves shelter campaigns, they will appear here.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
            Milestone progress
          </p>
          <h2 className="mt-1 text-xl font-black text-stone-950">
            Campaign milestone monitor
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
                    <StatusPill status={fundedCampaigns > 0 ? "Active" : "Pending"} />
                  </div>

                  <div className="mt-3 divide-y divide-orange-100 overflow-hidden rounded-xl border border-orange-100">
                    {(campaign.milestoneDetails ??
                      campaign.milestones.map((milestone) => ({
                        ...milestone,
                        requirement: "",
                        status: "Pending",
                      }))
                    ).map(
                      (milestone, index) => (
                        <div
                          key={`${campaign.id}-${milestone.title}`}
                          className="grid gap-3 bg-orange-50/25 px-3 py-2.5 sm:grid-cols-[1.75rem_minmax(0,1fr)_6.5rem] sm:items-center"
                        >
                          <span className="grid h-7 w-7 place-items-center rounded-lg bg-white text-xs font-black text-[var(--color-orange)] ring-1 ring-orange-100">
                            {index + 1}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-stone-950">
                              {milestone.title}
                            </p>
                            <p className="mt-1 text-xs font-medium text-stone-500">
                              {milestone.percentage}% fund release checkpoint
                            </p>
                            {milestone.requirement ? (
                              <p className="mt-1 text-xs font-medium text-stone-500">
                                Requirement: {milestone.requirement}
                              </p>
                            ) : null}
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
                  Milestone plans are loaded from `campaign_milestones` after
                  active campaigns exist.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
