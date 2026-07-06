import Link from "next/link";
import { getActiveDonorCampaigns } from "@/lib/donor-campaigns";

const statusStyles: Record<string, string> = {
  Active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
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

export default async function DonorTrackingPage() {
  let campaigns: Awaited<ReturnType<typeof getActiveDonorCampaigns>> = [];

  try {
    campaigns = await getActiveDonorCampaigns();
  } catch {
    campaigns = [];
  }

  const milestoneCount = campaigns.reduce(
    (total, campaign) => total + campaign.milestones.length,
    0,
  );
  const fundedCampaigns = campaigns.filter((campaign) => campaign.raised > 0).length;
  const lockedDonationStats = [
    { label: "Total donated", value: "Pending", detail: "Needs donations table" },
    { label: "Transaction hashes", value: "Pending", detail: "After contract call" },
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
              Track real active campaign progress now. Donation amounts,
              transaction hashes, and receipts will appear after the donation
              contract and donation records are connected.
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
            No real donation records yet
          </h3>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-stone-600">
            This section is ready for a future `donations` table with donor,
            campaign, amount, status, and transaction hash. Until then, fake
            hashes and donation amounts are hidden.
          </p>
          <Link
            href="/Donor/donate"
            className="mt-4 inline-flex rounded-xl bg-[var(--color-orange)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            Open donation preview
          </Link>
        </div>
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
