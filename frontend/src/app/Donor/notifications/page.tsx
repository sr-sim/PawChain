import Link from "next/link";
import { getActiveDonorCampaigns } from "@/lib/donor-campaigns";

const statusStyles: Record<string, string> = {
  Active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Submitted: "border-amber-200 bg-amber-50 text-amber-700",
  Rejected: "border-red-200 bg-red-50 text-red-700",
  Pending: "border-slate-200 bg-slate-50 text-slate-600",
};

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={[
        "inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold",
        statusStyles[status] ?? "border-slate-200 bg-slate-50 text-slate-600",
      ].join(" ")}
    >
      {status}
    </span>
  );
}

export default async function DonorNotificationsPage() {
  let campaigns: Awaited<ReturnType<typeof getActiveDonorCampaigns>> = [];

  try {
    campaigns = await getActiveDonorCampaigns();
  } catch {
    campaigns = [];
  }

  const milestoneUpdates = campaigns.flatMap((campaign) =>
    (campaign.milestoneDetails ??
      campaign.milestones.map((milestone) => ({
        ...milestone,
        description: "",
        requirement: "",
        status: "Pending",
      }))
    ).map((milestone, index) => ({
      id: `${campaign.id}-${index}`,
      campaignId: campaign.id,
      campaign: campaign.title,
      shelter: campaign.shelter,
      title: milestone.title,
      percentage: milestone.percentage,
      status: milestone.status,
      requirement: milestone.requirement,
      description:
        milestone.description ||
        `${campaign.shelter} planned this milestone for ${milestone.percentage}% of the campaign release.`,
    })),
  );

  const counts = {
    all: milestoneUpdates.length,
    pending: milestoneUpdates.filter((item) => item.status === "Pending").length,
    submitted: milestoneUpdates.filter((item) => item.status === "Submitted").length,
    approved: milestoneUpdates.filter((item) => item.status === "Approved").length,
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
              Notifications
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-stone-950 sm:text-3xl">
              Campaign milestone updates
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Review real milestone plans and proof statuses from active
              Supabase campaigns. Personal unread/read history will be added
              after donor notification records exist.
            </p>
          </div>
          <Link
            href="/Donor/tracking"
            className="inline-flex w-fit items-center justify-center rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-900 transition hover:border-[var(--color-orange)] hover:bg-orange-50"
          >
            View tracking
          </Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {[
          ["All updates", counts.all],
          ["Pending", counts.pending],
          ["Submitted", counts.submitted],
          ["Approved", counts.approved],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
              {label}
            </p>
            <p className="mt-2 text-2xl font-black text-stone-950">
              {value}
            </p>
            <p className="mt-1 text-xs font-medium text-stone-500">
              From campaign milestones
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
              Inbox
            </p>
            <h2 className="mt-1 text-xl font-black text-stone-950">
              Latest milestone records
            </h2>
          </div>
          <p className="text-xs font-medium text-stone-500">
            {milestoneUpdates.length} records
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50/25 p-3">
          <p className="text-sm font-semibold text-stone-950">
            Read/unread tabs are waiting for `donor_notifications`.
          </p>
          <p className="mt-1 text-xs leading-5 text-stone-600">
            For now, this page shows real campaign milestone status shared by
            shelters and admins.
          </p>
        </div>

        <div className="mt-4 divide-y divide-orange-100 overflow-hidden rounded-xl border border-orange-100">
          {milestoneUpdates.length > 0 ? (
            milestoneUpdates.map((item) => (
              <article
                key={item.id}
                className="grid gap-3 bg-white px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-start"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[var(--color-orange)]" />
                    <p className="text-sm font-semibold text-stone-950">
                      {item.title}
                    </p>
                  </div>
                  <p className="mt-1 text-xs font-medium text-stone-500">
                    {item.campaign} - {item.shelter}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    {item.description}
                  </p>
                  {item.requirement ? (
                    <p className="mt-2 rounded-xl border border-orange-100 bg-orange-50/35 px-3 py-2 text-xs font-semibold text-stone-600">
                      Requirement: {item.requirement}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/Donor/campaigns/${item.campaignId}`}
                      className="rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-semibold text-[var(--color-orange)] transition hover:border-[var(--color-orange)] hover:bg-orange-50"
                    >
                      Open campaign
                    </Link>
                    <Link
                      href="/Donor/tracking"
                      className="rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition hover:border-[var(--color-orange)] hover:bg-orange-50"
                    >
                      View tracking
                    </Link>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <StatusPill status={item.status} />
                  <span className="text-xs font-semibold text-stone-500">
                    {item.percentage}% release
                  </span>
                </div>
              </article>
            ))
          ) : (
            <div className="p-6 text-center">
              <h3 className="text-base font-black text-stone-950">
                No milestone updates yet
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
                Approved active campaigns and milestone plans will appear here.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
