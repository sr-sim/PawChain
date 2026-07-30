"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { useReadContract } from "wagmi";
import { MilestoneCard } from "../components/MilestoneCard";
import { StatusBadge } from "@/app/components/campaigns/StatusBadge";
import type {
  Campaign,
  CampaignMilestone,
} from "@/app/components/campaigns/campaign-types";
import {
  formatCurrency,
  getProgress,
  readableStatus,
} from "@/app/components/campaigns/campaign-utils";
import {
  demoEthMyrRate,
} from "@/lib/campaign-blockchain";
import { campaignContractAbi } from "@/lib/campaign-contract-abi";
import { formatEther, isAddress } from "viem";

function formatETH(value: number) {
  return `${value.toLocaleString("en-MY", { maximumFractionDigits: 8 })} ETH`;
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M19 12H5m6-6-6 6 6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CampaignIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <path
        d="M5 14V8.5l10-3v13L5 14Zm10-6h2a3 3 0 0 1 0 6h-2M7 14l1.5 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function isEmergencyMilestone(milestone: CampaignMilestone) {
  return milestone.on_chain_index === 0 ||
    (Number(milestone.percentage) === 5 && /emergency|initial release/i.test(milestone.title));
}

function orderMilestones(items: CampaignMilestone[]) {
  return [...items].sort((left, right) => {
    const leftIndex = left.on_chain_index;
    const rightIndex = right.on_chain_index;
    if (leftIndex != null && rightIndex != null) return leftIndex - rightIndex;
    if (isEmergencyMilestone(left) !== isEmergencyMilestone(right)) return isEmergencyMilestone(left) ? -1 : 1;
    if (leftIndex != null) return -1;
    if (rightIndex != null) return 1;
    return String(left.created_at ?? "").localeCompare(String(right.created_at ?? ""));
  });
}

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const { address, isConnected } = useAppKitAccount();
  const { open } = useAppKit();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [milestones, setMilestones] = useState<CampaignMilestone[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const contractAddress = campaign?.contract_address && isAddress(campaign.contract_address)
    ? campaign.contract_address
    : undefined;
  const { data: onChainGoal } = useReadContract({
    address: contractAddress,
    abi: campaignContractAbi,
    functionName: "goal",
    query: { enabled: Boolean(contractAddress) },
  });
  const { data: onChainRaised } = useReadContract({
    address: contractAddress,
    abi: campaignContractAbi,
    functionName: "totalRaised",
    query: { enabled: Boolean(contractAddress) },
  });
  const { data: onChainRefundPool } = useReadContract({
    address: contractAddress,
    abi: campaignContractAbi,
    functionName: "refundPool",
    query: {
      enabled: Boolean(contractAddress && campaign?.campaign_status === "closed"),
    },
  });

  useEffect(() => {
    async function loadCampaign() {
      if (!address || !params.id) {
        setCampaign(null);
        setMilestones([]);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/shelter/campaigns/${params.id}?walletAddress=${encodeURIComponent(address)}`,
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message ?? "Unable to load campaign details.");
        }

        setCampaign(result.campaign);
        setMilestones(orderMilestones(result.milestones ?? []));
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load campaign details.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadCampaign();
  }, [address, params.id]);

  const ethMyrRate = Number(campaign?.eth_myr_rate ?? demoEthMyrRate) || demoEthMyrRate;
  const goalEth = onChainGoal !== undefined
    ? Number(formatEther(onChainGoal))
    : campaign?.goal_wei
      ? Number(formatEther(BigInt(campaign.goal_wei)))
      : Number(campaign?.goal_amount ?? 0) / ethMyrRate;
  const raisedEth = onChainRaised !== undefined
    ? Number(formatEther(onChainRaised))
    : Number(campaign?.current_amount ?? 0) / ethMyrRate;
  const goalMyr = goalEth * ethMyrRate;
  const raisedMyr = raisedEth * ethMyrRate;
  const refundPoolEth = onChainRefundPool !== undefined
    ? Number(formatEther(onChainRefundPool))
    : 0;
  const refundPoolMyr = refundPoolEth * ethMyrRate;
  const progress = getProgress(raisedEth, goalEth);
  const daysLeft = campaign?.created_at
    ? Math.max(0, Math.ceil((new Date(campaign.created_at).getTime() + campaign.duration_days * 86400000 - Date.now()) / 86400000))
    : campaign?.duration_days ?? 0;
  const orderedMilestones = useMemo(() => orderMilestones(milestones), [milestones]);
  const currentMilestoneNumber = useMemo(() => {
    const nextIndex = orderedMilestones.findIndex((milestone) => !milestone.release_tx_hash);
    return nextIndex === -1 ? orderedMilestones.length : nextIndex + 1;
  }, [orderedMilestones]);

  const canEdit = campaign?.campaign_status === "rejected";

  const editAccessMessage = useMemo(() => {
    if (!campaign) {
      return "";
    }

    if (campaign.campaign_status === "rejected") {
      return "Editable now: update campaign info and milestones, then submit again for approval.";
    }

    if (campaign.campaign_status === "pending_approval") {
      return "Locked after submission while waiting for admin approval.";
    }

    return `Locked while ${readableStatus(campaign.campaign_status)}.`;
  }, [campaign]);

  return (
    <div className="space-y-6">
      <Link
        href="/Shelter/campaigns"
        className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-white px-4 py-2 text-sm font-black text-stone-700 shadow-sm shadow-orange-100 transition hover:bg-orange-50"
      >
        <BackIcon />
        Back to Campaigns
      </Link>

      {!isConnected ? (
        <section className="rounded-2xl border border-orange-100 bg-white p-6 text-center shadow-[0_18px_48px_rgba(155,86,20,0.08)]">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-orange-50 text-[var(--color-orange)] ring-1 ring-orange-100">
            <CampaignIcon />
          </span>
          <h1 className="mt-4 text-xl font-black text-stone-950">
            Connect your shelter wallet
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-6 text-stone-600">
            Campaign details are only shown for the shelter that created them.
          </p>
          <button
            type="button"
            onClick={() => open()}
            className="mt-5 rounded-full bg-stone-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-200/70 transition hover:-translate-y-0.5 hover:bg-[var(--color-orange)]"
          >
            Connect Wallet
          </button>
        </section>
      ) : null}

      {isLoading ? (
        <section className="rounded-2xl border border-orange-100 bg-white p-6 text-center text-sm font-black text-stone-600 shadow-[0_18px_48px_rgba(155,86,20,0.08)]">
          Loading campaign details...
        </section>
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </p>
      ) : null}

      {campaign ? (
        <>
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="space-y-6">
          <section className="rounded-3xl border border-orange-100 bg-white p-5 shadow-[0_18px_48px_rgba(155,86,20,0.08)] sm:p-6">
            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="overflow-hidden rounded-2xl border border-orange-100 bg-orange-50">
                {campaign.image_url ? <img src={campaign.image_url} alt="" className="aspect-[4/3] h-full w-full object-cover" /> : <div className="grid aspect-[4/3] h-full place-items-center text-[var(--color-orange)]"><CampaignIcon /></div>}
              </div>

              <div className="py-1">
                <div className="flex flex-wrap gap-2"><StatusBadge status={campaign.campaign_status} label={campaign.campaign_status === "closed" ? "Closed" : undefined} /><span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-black capitalize text-[var(--color-orange)]">{campaign.urgency_level}</span></div>
                <h1 className="mt-4 text-3xl font-black text-stone-950">{campaign.title}</h1>
                <p className="mt-3 text-sm font-bold leading-6 text-stone-600">{campaign.description}</p>
                <dl className="mt-5 grid grid-cols-[6rem_1fr] gap-x-3 gap-y-3 text-sm"><dt className="font-bold text-stone-500">Location</dt><dd className="font-black">{campaign.location}</dd><dt className="font-bold text-stone-500">Urgency</dt><dd className="font-black capitalize text-[var(--color-orange)]">{campaign.urgency_level}</dd><dt className="font-bold text-stone-500">Duration</dt><dd className="font-black">{campaign.duration_days} days</dd><dt className="font-bold text-stone-500">Goal</dt><dd className="font-black">{formatETH(goalEth)} <span className="block text-xs text-stone-400">about {formatCurrency(goalMyr)}</span></dd><dt className="font-bold text-stone-500">Raised</dt><dd className="font-black">{formatETH(raisedEth)} ({progress}%) <span className="block text-xs text-stone-400">about {formatCurrency(raisedMyr)}</span></dd></dl>
                {campaign.campaign_status === "rejected" ? <div className="mt-5 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700"><span className="font-black">Rejection reason: </span>{campaign.rejection_reason || "No reason was provided."}</div> : null}
              </div>

            </div>
            {campaign.contract_address ? <div className="mt-5 flex flex-wrap items-center gap-5 border-t border-orange-100 pt-4 text-xs font-bold text-stone-500"><span>This campaign is on-chain.</span><span>Sepolia Network</span><span className="font-mono">{campaign.contract_address.slice(0, 8)}...{campaign.contract_address.slice(-6)}</span></div> : null}
          </section>

          <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-[0_18px_48px_rgba(155,86,20,0.08)] sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">Milestone timeline</p>
                <h2 className="mt-1 text-2xl font-black text-stone-950">
                  Release tracking
                </h2>
              </div>
              <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-black text-[var(--color-orange)]">
                {milestones.length} total
              </span>
            </div>

            {milestones.length ? (
              <div className="mt-6 overflow-x-auto pb-2">
                <div className="relative grid min-w-[760px] gap-4" style={{ gridTemplateColumns: `repeat(${milestones.length}, minmax(130px, 1fr))` }}>
                  <div className="absolute left-[7%] right-[7%] top-5 border-t-2 border-dotted border-orange-200" />
                  {orderedMilestones.map((milestone, index) => {
                    const complete = milestone.status === "approved" || Boolean(milestone.release_tx_hash);
                    const cumulativeThreshold = orderedMilestones
                      .slice(0, index + 1)
                      .reduce((sum, item) => sum + Number(item.percentage || 0), 0);
                    const allocationEth = goalEth * Number(milestone.percentage || 0) / 100;
                    const allocationMyr = goalMyr * Number(milestone.percentage || 0) / 100;
                    const timelineStatus = milestone.release_tx_hash
                      ? "Released"
                      : milestone.status === "submitted"
                        ? "Pending review"
                        : milestone.status === "rejected"
                          ? "Rejected"
                          : milestone.status === "approved"
                            ? "Approved"
                            : index === 0 && progress >= 5
                              ? "Withdrawable"
                              : index === 0
                                ? "Active"
                                : "Locked";
                    const statusClass = timelineStatus === "Withdrawable"
                      ? "bg-violet-50 text-violet-700 ring-violet-200"
                      : timelineStatus === "Active"
                        ? "bg-blue-50 text-blue-700 ring-blue-200"
                        : timelineStatus === "Released" || timelineStatus === "Approved"
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : timelineStatus === "Rejected"
                            ? "bg-red-50 text-red-700 ring-red-200"
                            : "bg-stone-50 text-stone-600 ring-stone-200";
                    return (
                      <div key={`timeline-${milestone.id}`} className="relative text-center">
                        <span className={`relative mx-auto grid h-10 w-10 place-items-center rounded-full border-2 text-sm font-black shadow-sm ${index === 0 ? "border-[var(--color-orange)] bg-[var(--color-orange)] text-white" : complete ? "border-emerald-400 bg-emerald-50 text-emerald-700" : index + 1 === currentMilestoneNumber ? "border-blue-400 bg-blue-50 text-blue-700" : "border-orange-200 bg-white text-stone-600"}`}>{index + 1}</span>
                        <div className={`mt-3 min-h-28 rounded-2xl border p-3 ${index === 0 ? "border-[#FFCD80] bg-[#FFFCC9]/45" : "border-orange-100 bg-white"}`}>
                          <p className="line-clamp-2 text-xs font-black leading-5 text-stone-950">{milestone.title}</p>
                          <p className="mt-1 text-sm font-black text-stone-950">{cumulativeThreshold}%</p>
                          <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-black ring-1 ${statusClass}`}>{timelineStatus}</span>
                          <p className="mt-2 text-[11px] font-black text-stone-700">{formatETH(allocationEth)}</p><p className="mt-1 text-[10px] font-bold text-stone-400">about {formatCurrency(allocationMyr)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div id="milestone-details" className="mt-7 scroll-mt-24 border-t border-orange-100 pt-5"><h3 className="text-sm font-black uppercase tracking-wide text-stone-500">Milestone timeline & proof submission</h3></div>
            <div className="mt-5 space-y-4">
              {milestones.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/40 p-6 text-center text-sm font-black text-stone-600">
                  No milestones found for this campaign.
                </div>
              ) : null}

              {orderedMilestones.map((milestone, index) => (
                <MilestoneCard
                  key={milestone.id}
                  milestone={milestone}
                  index={index}
                  campaignId={campaign.id}
                  walletAddress={address}
                  contractAddress={campaign.contract_address}
                  goalEth={goalEth}
                  ethMyrRate={ethMyrRate}
                  cumulativePercentage={orderedMilestones.slice(0, index + 1).reduce((sum, item) => sum + Number(item.percentage || 0), 0)}
                  canUploadProof={campaign.campaign_status === "active"}
                  onProofSubmitted={(updatedMilestone) =>
                    setMilestones((current) =>
                      current.map((currentMilestone) =>
                        currentMilestone.id === updatedMilestone.id
                          ? updatedMilestone
                          : currentMilestone,
                      ),
                    )
                  }
                />
              ))}
            </div>
          </section>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24">
            <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-[0_12px_30px_rgba(111,69,20,0.06)]"><p className="text-xs font-black uppercase tracking-wide text-stone-500">Campaign progress</p><p className="mt-2 text-3xl font-black">{progress}% funded</p><div className="mt-4 h-2.5 overflow-hidden rounded-full bg-orange-100"><div className="h-full rounded-full bg-[var(--color-orange)]" style={{ width: `${progress}%` }} /></div><p className="mt-3 text-xs font-black">{formatETH(raisedEth)} / {formatETH(goalEth)}</p><p className="mt-1 text-[10px] font-bold text-stone-400">about {formatCurrency(raisedMyr)} / {formatCurrency(goalMyr)}</p><div className="mt-5 rounded-xl border border-[#FFCD80] bg-[#FFFCC9]/35 p-3"><p className="text-xs font-black text-[var(--color-orange)]">Emergency milestone</p><p className="mt-1 text-xs font-semibold text-stone-600">First milestone unlocks at 5% funding.</p></div>{campaign.contract_address ? <a href={`https://sepolia.etherscan.io/address/${campaign.contract_address}`} target="_blank" rel="noreferrer" className="mt-5 block rounded-xl border border-[var(--color-orange)] px-3 py-2.5 text-center text-xs font-black text-[var(--color-orange)]">View on Sepolia Etherscan</a> : null}</section>
            <section className="rounded-2xl border border-orange-100 bg-white p-5"><p className="text-xs font-black uppercase tracking-wide text-stone-500">Campaign summary</p><div className="mt-4 space-y-3 text-xs"><div className="flex justify-between gap-3"><span className="font-bold text-stone-500">Goal</span><span className="text-right font-black">{formatETH(goalEth)}<span className="block text-[10px] text-stone-400">{formatCurrency(goalMyr)}</span></span></div><div className="flex justify-between gap-3"><span className="font-bold text-stone-500">Raised</span><span className="text-right font-black">{formatETH(raisedEth)}<span className="block text-[10px] text-stone-400">{formatCurrency(raisedMyr)}</span></span></div>{campaign.campaign_status === "closed" ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3"><div className="flex justify-between gap-3"><span className="font-black text-amber-700">Donor refund pool</span><span className="text-right font-black">{onChainRefundPool !== undefined ? formatETH(refundPoolEth) : "Reading on-chain..."}{onChainRefundPool !== undefined ? <span className="block text-[10px] text-stone-500">about {formatCurrency(refundPoolMyr)}</span> : null}</span></div><p className="mt-2 text-[10px] font-bold leading-4 text-stone-500">Locked funds are reserved and claimed proportionally by donors.</p></div> : null}<div className="flex justify-between"><span className="font-bold text-stone-500">Total milestones</span><span className="font-black">{milestones.length}</span></div><div className="flex justify-between"><span className="font-bold text-stone-500">{campaign.campaign_status === "closed" ? "Status" : "Days left"}</span><span className="font-black">{campaign.campaign_status === "closed" ? "Closed" : daysLeft}</span></div></div></section>
            <section className="rounded-2xl border border-orange-100 bg-white p-5"><p className="text-xs font-black uppercase tracking-wide text-stone-500">Current milestone</p><p className="mt-2 text-2xl font-black">{currentMilestoneNumber} / {milestones.length}</p><p className="mt-2 text-sm font-black">{orderedMilestones[currentMilestoneNumber - 1]?.title ?? "No milestone"}</p><a href="#milestone-details" className="mt-4 block rounded-xl border border-violet-300 px-3 py-2.5 text-center text-xs font-black text-violet-700">View milestone action</a></section>
            <section className="rounded-2xl border border-orange-100 bg-white p-5"><p className="text-xs font-black uppercase tracking-wide text-stone-500">Blockchain info</p><div className="mt-4 space-y-3 text-xs"><div className="flex justify-between"><span className="font-bold text-stone-500">Network</span><span className="font-black text-violet-700">Sepolia Testnet</span></div><div className="flex justify-between gap-3"><span className="font-bold text-stone-500">Contract</span><span className="truncate font-mono font-black">{campaign.contract_address ? `${campaign.contract_address.slice(0, 7)}...${campaign.contract_address.slice(-5)}` : "Not deployed"}</span></div><div className="flex justify-between"><span className="font-bold text-stone-500">Total raised</span><span className="font-black">{formatETH(raisedEth)}</span></div></div></section>
            {canEdit ? <Link href={`/Shelter/campaigns/${campaign.id}/edit`} className="block rounded-xl bg-[var(--color-orange)] px-4 py-3 text-center text-sm font-black text-white">Edit Campaign</Link> : <p className="rounded-xl border border-orange-100 bg-white p-3 text-xs font-semibold leading-5 text-stone-500">{editAccessMessage}</p>}
          </aside>
          </div>
        </>
      ) : null}
    </div>
  );
}
