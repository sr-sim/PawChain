import Link from "next/link";
import { notFound } from "next/navigation";
import { getDonorCampaignById } from "@/lib/donor-campaigns";
import {
  getAddressExplorerUrl,
  getExplorerNetworkName,
  getTransactionExplorerUrl,
  shortAddress,
} from "@/lib/block-explorer";
import { TransactionLinks } from "@/app/components/TransactionLinks";

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

function formatMyr(value: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
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
      proofUrl: null,
      proofTxHash: null,
      reviewTxHash: null,
      releaseTxHash: null,
    }));
  const contractUrl = campaign.contractAddress
    ? getAddressExplorerUrl(campaign.contractAddress)
    : "";
  const deploymentTxUrl = campaign.deploymentTxHash
    ? getTransactionExplorerUrl(campaign.deploymentTxHash)
    : "";
  const canDonate = campaign.status === "Active";

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
          <div className="flex h-56 items-center justify-center bg-orange-50/45 p-3 sm:h-64">
            <img
              src={imageUrl}
              alt=""
              className="max-h-full w-full rounded-xl object-contain"
            />
          </div>
        ) : (
          <div
            className={[
              "h-56 bg-gradient-to-br sm:h-64",
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

              {canDonate ? (
                <Link
                  href={`/Donor/donate?campaign=${campaign.id}`}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--color-orange)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
                >
                  Donate to this campaign
                </Link>
              ) : (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-800">
                  This campaign is {campaign.status.toLowerCase()}.
                </div>
              )}
              <Link
                href={`/Donor/help?type=report&campaign=${campaign.id}`}
                className="inline-flex w-full items-center justify-center rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-900 transition hover:border-[var(--color-orange)] hover:bg-orange-50"
              >
                Report concern
              </Link>
            </aside>
          </div>

          <div className="mt-5 rounded-xl border border-orange-100 bg-orange-50/25 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
                  Campaign trust
                </p>
                <h2 className="mt-1 text-base font-black text-stone-950">
                  Verified campaign controls
                </h2>
              </div>
              <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                {getExplorerNetworkName()}
              </span>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-4">
              <div className="rounded-xl bg-white p-3 ring-1 ring-orange-100">
                <p className="text-xs font-semibold text-stone-500">
                  Shelter RoleNFT
                </p>
                <p className="mt-1 text-sm font-black text-stone-950">
                  On-chain checked
                </p>
              </div>
              <div className="rounded-xl bg-white p-3 ring-1 ring-orange-100">
                <p className="text-xs font-semibold text-stone-500">
                  Campaign contract
                </p>
                {contractUrl && campaign.contractAddress ? (
                  <a
                    href={contractUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex text-sm font-black text-[var(--color-orange)] transition hover:text-stone-950"
                  >
                    {shortAddress(campaign.contractAddress)}
                  </a>
                ) : (
                  <p className="mt-1 text-sm font-black text-stone-950">
                    Pending
                  </p>
                )}
              </div>
              <div className="rounded-xl bg-white p-3 ring-1 ring-orange-100">
                <p className="text-xs font-semibold text-stone-500">
                  Campaign creation tx
                </p>
                {deploymentTxUrl && campaign.deploymentTxHash ? (
                  <a
                    href={deploymentTxUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex text-sm font-black text-[var(--color-orange)] transition hover:text-stone-950"
                  >
                    {shortAddress(campaign.deploymentTxHash)}
                  </a>
                ) : (
                  <p className="mt-1 text-sm font-black text-stone-950">
                    Pending
                  </p>
                )}
              </div>
              <div className="rounded-xl bg-white p-3 ring-1 ring-orange-100">
                <p className="text-xs font-semibold text-stone-500">
                  Release rules
                </p>
                <p className="mt-1 text-sm font-black text-stone-950">
                  Milestone gated
                </p>
              </div>
            </div>
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
                    Stage {index + 1}: {milestone.percentage}% release
                  </p>
                  <p className="mt-1 text-xs font-semibold text-stone-500">
                    Stage amount:{" "}
                    {formatMyr(
                      getMilestoneAmount(campaign.goalAmount, milestone.percentage),
                    )}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-stone-500">
                    Cumulative target:{" "}
                    {formatMyr(
                      getMilestoneAmount(
                        campaign.goalAmount,
                        getCumulativeMilestonePercentage(milestoneItems, index),
                      ),
                    )}
                  </p>
                  {milestone.description ? (
                    <p className="mt-2 text-xs leading-5 text-stone-600">
                      {milestone.description}
                    </p>
                  ) : null}
                  {milestone.requirement ? (
                    <p className="mt-2 rounded-lg bg-white px-2 py-1.5 text-xs font-semibold text-stone-600 ring-1 ring-orange-100">
                      Release condition: {milestone.requirement}
                    </p>
                  ) : null}
                  <div className="mt-2 rounded-lg bg-white px-2 py-1.5 text-xs font-semibold text-stone-600 ring-1 ring-orange-100">
                    Proof status: {milestone.status}
                  </div>
                  <div className="mt-3">
                    <TransactionLinks
                      proofTxHash={milestone.proofTxHash}
                      reviewTxHash={milestone.reviewTxHash}
                      releaseTxHash={milestone.releaseTxHash}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
