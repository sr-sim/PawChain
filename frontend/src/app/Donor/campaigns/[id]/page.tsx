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

function formatEth(value: number | undefined | null) {
  const numeric = Number(value ?? 0);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "0 ETH";
  }

  return `${numeric.toLocaleString("en-MY", {
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

function getCurrentMilestoneIndex(
  milestones: { percentage: number }[],
  campaignProgress: number,
  campaignStatus: string,
  contractIndex?: number,
) {
  if (milestones.length === 0) {
    return -1;
  }

  if (
    typeof contractIndex === "number" &&
    Number.isFinite(contractIndex) &&
    contractIndex >= 0 &&
    contractIndex < milestones.length
  ) {
    return contractIndex;
  }

  if (campaignStatus === "Completed" || campaignProgress >= 100) {
    return milestones.length - 1;
  }

  const nextIndex = milestones.findIndex(
    (_milestone, index) =>
      campaignProgress <
      getCumulativeMilestonePercentage(milestones, index),
  );

  return nextIndex >= 0 ? nextIndex : milestones.length - 1;
}

function getMilestoneFundingState(
  milestones: { percentage: number }[],
  index: number,
  campaignProgress: number,
) {
  const stagePercent = Math.max(0, Number(milestones[index]?.percentage ?? 0));
  const previousTarget =
    index > 0 ? getCumulativeMilestonePercentage(milestones, index - 1) : 0;
  const target = getCumulativeMilestonePercentage(milestones, index);

  if (campaignProgress >= target) {
    return {
      label: "Funded",
      progress: 100,
      tone: "complete" as const,
    };
  }

  if (campaignProgress <= previousTarget || stagePercent <= 0) {
    return {
      label: "Locked",
      progress: 0,
      tone: "locked" as const,
    };
  }

  return {
    label: "Funding now",
    progress: Math.min(
      100,
      Math.max(0, ((campaignProgress - previousTarget) / stagePercent) * 100),
    ),
    tone: "active" as const,
  };
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
  const progressWidth = Math.min(100, Math.max(0, campaign.raised));
  const currentMilestoneIndex = getCurrentMilestoneIndex(
    milestoneItems,
    campaign.raised,
    campaign.status,
    campaign.currentMilestoneIndex,
  );
  const currentMilestone =
    currentMilestoneIndex >= 0 ? milestoneItems[currentMilestoneIndex] : null;
  const raisedDisplay =
    typeof campaign.onChainTotalRaisedEth === "number"
      ? formatEth(campaign.onChainTotalRaisedEth)
      : `${campaign.raised}% funded`;
  const goalDisplay =
    typeof campaign.onChainGoalEth === "number"
      ? formatEth(campaign.onChainGoalEth)
      : campaign.goal;
  const getStageAmount = (percentage: number) =>
    typeof campaign.onChainGoalEth === "number"
      ? formatEth((campaign.onChainGoalEth * Number(percentage || 0)) / 100)
      : formatMyr(getMilestoneAmount(campaign.goalAmount, percentage));
  const getCumulativeAmount = (percentage: number) =>
    typeof campaign.onChainGoalEth === "number"
      ? formatEth((campaign.onChainGoalEth * Number(percentage || 0)) / 100)
      : formatMyr(getMilestoneAmount(campaign.goalAmount, percentage));

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
                {campaign.shelter}
              </p>
            </div>
            {contractUrl && campaign.contractAddress ? (
              <a
                href={contractUrl}
                target="_blank"
                rel="noreferrer"
                className="absolute bottom-7 left-7 rounded-full border border-orange-200 bg-white/95 px-3 py-1.5 text-xs font-black text-[var(--color-orange)] shadow-sm transition hover:-translate-y-0.5 hover:bg-orange-50"
              >
                Contract {shortAddress(campaign.contractAddress)}
              </a>
            ) : null}
          </div>

          <div className="flex flex-col justify-between p-5 sm:p-7">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={[
                    "rounded-full border px-3 py-1 text-xs font-black",
                    getUrgencyStyle(campaign.urgency),
                  ].join(" ")}
                >
                  {campaign.urgency}
                </span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                  {campaign.status}
                </span>
                <span className="rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-black text-stone-700">
                  {getExplorerNetworkName()}
                </span>
              </div>
              <h1 className="mt-5 text-3xl font-black tracking-tight text-stone-950 sm:text-4xl">
                {campaign.title}
              </h1>
              <p className="mt-3 text-sm font-black text-[var(--color-orange)]">
                {campaign.shelter}
              </p>
              <p className="mt-5 line-clamp-4 text-sm leading-7 text-stone-600">
                {campaign.story}
              </p>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="donor-tech-metric rounded-2xl border border-orange-100 bg-white/80 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-stone-500">
                  Raised
                </p>
                <p className="mt-1 text-lg font-black text-stone-950">
                  {raisedDisplay}
                </p>
              </div>
              <div className="donor-tech-metric rounded-2xl border border-orange-100 bg-white/80 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-stone-500">
                  Goal
                </p>
                <p className="mt-1 text-lg font-black text-stone-950">
                  {goalDisplay}
                </p>
              </div>
              <div className="donor-tech-metric rounded-2xl border border-orange-100 bg-white/80 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-stone-500">
                  Progress
                </p>
                <p className="mt-1 text-lg font-black text-stone-950">
                  {campaign.raised}%
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-5">
            <div className="donor-gradient-card rounded-2xl border border-orange-100 p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">
                    Funding progress
                  </p>
                  <h2 className="mt-1 text-xl font-black text-stone-950">
                    {campaign.raised}% funded
                  </h2>
                </div>
                <span className="w-fit rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-black text-stone-700">
                  {campaign.donors} donors
                </span>
              </div>
              <div className="mt-5 h-3 overflow-hidden rounded-full bg-orange-100">
                <div
                  className="donor-progress-fill h-full rounded-full bg-[var(--color-orange)]"
                  style={{ width: `${progressWidth}%` }}
                />
              </div>
              {currentMilestone ? (
                <div className="mt-4 rounded-xl bg-white/75 px-3 py-2 ring-1 ring-orange-100">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">
                    {campaign.status === "Completed"
                      ? "Final milestone"
                      : "Current milestone"}
                  </p>
                  <p className="mt-1 text-sm font-black text-stone-950">
                    {currentMilestone.title} ({currentMilestone.percentage}% release)
                  </p>
                  <p className="mt-1 text-xs font-semibold text-stone-500">
                    Stage amount: {getStageAmount(currentMilestone.percentage)}
                  </p>
                </div>
              ) : null}
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-xl bg-white/80 p-3 ring-1 ring-orange-100">
                  <p className="text-xs font-semibold text-stone-500">
                    Amount raised
                  </p>
                  <p className="mt-1 font-black text-stone-950">
                    {raisedDisplay}
                  </p>
                </div>
                <div className="rounded-xl bg-white/80 p-3 ring-1 ring-orange-100">
                  <p className="text-xs font-semibold text-stone-500">
                    Campaign goal
                  </p>
                  <p className="mt-1 font-black text-stone-950">
                    {goalDisplay}
                  </p>
                </div>
                <div className="rounded-xl bg-white/80 p-3 ring-1 ring-orange-100">
                  <p className="text-xs font-semibold text-stone-500">
                    Time remaining
                  </p>
                  <p className="mt-1 font-black text-stone-950">
                    {campaign.daysLeft} days
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-orange-100 bg-white/80 p-5 shadow-sm">
                <h2 className="text-base font-black text-stone-950">
                  Background story
                </h2>
                <p className="mt-3 text-sm leading-7 text-stone-600">
                  {campaign.story}
                </p>
              </div>
              <div className="rounded-2xl border border-orange-100 bg-white/80 p-5 shadow-sm">
                <h2 className="text-base font-black text-stone-950">
                  Usage plan
                </h2>
                <p className="mt-3 text-sm leading-7 text-stone-600">
                  {campaign.campaignDetails}
                </p>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="donor-donate-card rounded-2xl border border-orange-100 p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">
                Donor action
              </p>
              <h2 className="mt-2 text-lg font-black text-stone-950">
                Support this campaign
              </h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Donations are recorded after wallet confirmation and linked to
                the campaign contract.
              </p>
              {canDonate ? (
                <Link
                  href={`/Donor/donate?campaign=${campaign.id}`}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[var(--color-orange)] px-4 py-3 text-sm font-black text-white shadow-[0_14px_28px_rgba(255,138,0,0.22)] transition hover:-translate-y-0.5 hover:bg-orange-600"
                >
                  Donate to this campaign
                </Link>
              ) : (
                <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-center text-sm font-black text-emerald-800">
                  This campaign is {campaign.status.toLowerCase()}.
                </div>
              )}
              <Link
                href={`/Donor/help?type=report&campaign=${campaign.id}`}
                className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-orange-200 bg-white px-4 py-3 text-sm font-black text-stone-900 transition hover:-translate-y-0.5 hover:border-[var(--color-orange)] hover:bg-orange-50"
              >
                Report concern
              </Link>
            </div>

            <div className="rounded-2xl border border-orange-100 bg-white/80 p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-stone-500">
                Campaign facts
              </p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-stone-500">Milestones</span>
                  <span className="font-black text-stone-950">
                    {campaign.milestones.length}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-stone-500">Network</span>
                  <span className="font-black text-stone-950">
                    {getExplorerNetworkName()}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-stone-500">Release model</span>
                  <span className="font-black text-stone-950">
                    Milestone gated
                  </span>
                </div>
              </div>
            </div>
          </aside>

          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-orange-100 bg-orange-50/25 p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">
                  Campaign trust
                </p>
                <h2 className="mt-1 text-lg font-black text-stone-950">
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
                  Verified
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

            <div className="mt-5 rounded-2xl border border-orange-100 bg-white/80 p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">
                    Milestone transparency
                  </p>
                  <h2 className="mt-1 text-lg font-black text-stone-950">
                    Release plan and proof trail
                  </h2>
                </div>
                <p className="text-xs font-semibold text-stone-500">
                  Funds unlock by approved stages.
                </p>
              </div>
              <div className="mt-5 space-y-3 border-l border-orange-100 pl-5">
              {milestoneItems.map((milestone, index) => {
                const fundingState = getMilestoneFundingState(
                  milestoneItems,
                  index,
                  campaign.raised,
                );
                const isLocked = fundingState.tone === "locked";

                return (
                <div
                  key={milestone.title}
                  className={[
                    "donor-ledger-row donor-chain-node rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5",
                    isLocked
                      ? "border-slate-200 bg-slate-50/70 opacity-80"
                      : index === currentMilestoneIndex
                        ? "border-[var(--color-orange)] bg-orange-50/45"
                        : "border-orange-100 hover:border-orange-200",
                  ].join(" ")}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={[
                            "grid h-8 w-8 place-items-center rounded-xl bg-white text-xs font-black ring-1",
                            isLocked
                              ? "text-slate-400 ring-slate-200"
                              : "text-[var(--color-orange)] ring-orange-100",
                          ].join(" ")}
                        >
                          {index + 1}
                        </span>
                        <p
                          className={[
                            "text-sm font-black",
                            isLocked ? "text-slate-500" : "text-stone-950",
                          ].join(" ")}
                        >
                          {milestone.title}
                        </p>
                        <span
                          className={[
                            "rounded-full border bg-white px-3 py-1 text-xs font-black",
                            isLocked
                              ? "border-slate-200 text-slate-400"
                              : "border-orange-200 text-[var(--color-orange)]",
                          ].join(" ")}
                        >
                          {milestone.percentage}% release
                        </span>
                        <span
                          className={[
                            "rounded-full px-3 py-1 text-xs font-black",
                            fundingState.tone === "complete"
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                              : fundingState.tone === "active"
                                ? "bg-orange-50 text-[var(--color-orange)] ring-1 ring-orange-100"
                                : "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
                          ].join(" ")}
                        >
                          {fundingState.label}
                        </span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                        <div
                          className={[
                            "h-full rounded-full transition-all",
                            fundingState.tone === "complete"
                              ? "bg-emerald-500"
                              : fundingState.tone === "active"
                                ? "bg-[var(--color-orange)]"
                                : "bg-slate-300",
                          ].join(" ")}
                          style={{ width: `${fundingState.progress}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] font-semibold text-stone-400">
                        {Math.round(fundingState.progress)}% of this stage funded
                      </p>
                  {milestone.description ? (
                    <p className="mt-3 text-xs leading-5 text-stone-600">
                      {milestone.description}
                    </p>
                  ) : null}
                  {milestone.requirement ? (
                    <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-stone-600 ring-1 ring-orange-100">
                      Release condition: {milestone.requirement}
                    </p>
                  ) : null}
                    </div>
                    <div className="grid shrink-0 gap-2 sm:grid-cols-3 lg:w-[28rem]">
                      <div className="rounded-xl bg-white p-3 ring-1 ring-orange-100">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-stone-500">
                          Stage amount
                        </p>
                        <p className="mt-1 text-sm font-black text-stone-950">
                          {getStageAmount(milestone.percentage)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white p-3 ring-1 ring-orange-100">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-stone-500">
                          Target
                        </p>
                        <p className="mt-1 text-sm font-black text-stone-950">
                          {getCumulativeAmount(
                            getCumulativeMilestonePercentage(
                              milestoneItems,
                              index,
                            ),
                          )}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white p-3 ring-1 ring-orange-100">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-stone-500">
                          Proof
                        </p>
                        <p className="mt-1 text-sm font-black text-stone-950">
                          {milestone.status}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <TransactionLinks
                      proofTxHash={milestone.proofTxHash}
                      reviewTxHash={milestone.reviewTxHash}
                      releaseTxHash={milestone.releaseTxHash}
                    />
                  </div>
                </div>
                );
              })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
