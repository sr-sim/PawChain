import Link from "next/link";
import { notFound } from "next/navigation";
import { getDonorCampaignById } from "@/lib/donor-campaigns";

export const dynamic = "force-dynamic";

function getUrgencyStyle(urgency: string) {
  if (urgency === "Critical") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (urgency === "High") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export default async function DonorCampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = await getDonorCampaignById(id);

  if (!campaign) {
    notFound();
  }

  const imageUrl =
    "imageUrl" in campaign && typeof campaign.imageUrl === "string"
      ? campaign.imageUrl
      : null;
  const milestoneItems =
    campaign.milestoneDetails ??
    campaign.milestones.map((milestone) => ({
      ...milestone,
      description: "",
      requirement: "",
      status: "Pending",
    }));

  return (
    <div className="space-y-5">
      <Link
        href="/Donor/discover"
        className="inline-flex items-center rounded-xl border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-[var(--color-orange)] transition hover:border-[var(--color-orange)] hover:bg-orange-50"
      >
        Back to discover
      </Link>

      <section className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="h-64 w-full object-cover"
          />
        ) : (
          <div
            className={[
              "min-h-56 bg-gradient-to-br",
              campaign.imageClass,
            ].join(" ")}
          />
        )}
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
                Campaign detail
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-stone-950 sm:text-3xl">
                {campaign.title}
              </h1>
              <p className="mt-2 text-sm font-semibold text-[var(--color-orange)]">
                {campaign.shelter} - {campaign.location}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span
                className={[
                  "rounded-full border px-3 py-1 text-xs font-semibold",
                  getUrgencyStyle(campaign.urgency),
                ].join(" ")}
              >
                {campaign.urgency}
              </span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {campaign.status}
              </span>
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.85fr]">
            <div className="space-y-4">
              <div className="rounded-xl border border-orange-100 p-4">
                <h2 className="text-base font-black text-stone-950">
                  Background story
                </h2>
                <p className="mt-2 text-sm leading-7 text-stone-600">
                  {campaign.story}
                </p>
              </div>
              <div className="rounded-xl border border-orange-100 p-4">
                <h2 className="text-base font-black text-stone-950">
                  Usage plan
                </h2>
                <p className="mt-2 text-sm leading-7 text-stone-600">
                  {campaign.campaignDetails}
                </p>
              </div>
            </div>

            <aside className="space-y-4">
              <div className="rounded-xl border border-orange-100 bg-orange-50/25 p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-stone-500">
                  <span>Funding progress</span>
                  <span>
                    {campaign.raised}% of {campaign.goal}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-orange-100">
                  <div
                    className="donor-progress-fill h-full rounded-full bg-[var(--color-orange)]"
                    style={{ width: `${campaign.raised}%` }}
                  />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="font-black text-stone-950">
                      {campaign.donors}
                    </p>
                    <p className="text-xs font-medium text-stone-500">Donors</p>
                  </div>
                  <div>
                    <p className="font-black text-stone-950">
                      {campaign.daysLeft}
                    </p>
                    <p className="text-xs font-medium text-stone-500">Days</p>
                  </div>
                  <div>
                    <p className="font-black text-stone-950">
                      {campaign.milestones.length}
                    </p>
                    <p className="text-xs font-medium text-stone-500">
                      Milestones
                    </p>
                  </div>
                </div>
              </div>

              <Link
                href={`/Donor/donate?campaign=${campaign.id}`}
                className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--color-orange)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                Donate to this campaign
              </Link>
              <Link
                href={`/Donor/help?type=report&campaign=${campaign.id}`}
                className="inline-flex w-full items-center justify-center rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-900 transition hover:border-[var(--color-orange)] hover:bg-orange-50"
              >
                Report concern
              </Link>
            </aside>
          </div>

          <div className="mt-5 rounded-xl border border-orange-100 p-4">
            <h2 className="text-base font-black text-stone-950">
              Milestone release plan
            </h2>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {milestoneItems.map((milestone, index) => (
                <div
                  key={milestone.title}
                  className="rounded-xl border border-orange-100 bg-orange-50/25 p-3"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-white text-xs font-black text-[var(--color-orange)] ring-1 ring-orange-100">
                    {index + 1}
                  </span>
                  <p className="mt-3 text-sm font-semibold text-stone-950">
                    {milestone.title}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[var(--color-orange)]">
                    {milestone.percentage}% release
                  </p>
                  {milestone.description ? (
                    <p className="mt-2 text-xs leading-5 text-stone-600">
                      {milestone.description}
                    </p>
                  ) : null}
                  {milestone.requirement ? (
                    <p className="mt-2 rounded-lg bg-white px-2 py-1.5 text-xs font-semibold text-stone-600 ring-1 ring-orange-100">
                      Requirement: {milestone.requirement}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
