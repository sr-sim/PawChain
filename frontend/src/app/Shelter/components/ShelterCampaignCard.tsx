"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { formatEther, isAddress } from "viem";
import { useReadContract } from "wagmi";
import type { Campaign } from "@/app/components/campaigns/campaign-types";
import { getProgress } from "@/app/components/campaigns/campaign-utils";
import { StatusBadge } from "@/app/components/campaigns/StatusBadge";
import { campaignContractAbi } from "@/lib/campaign-contract-abi";
import { useEthMyrRate } from "@/lib/use-eth-myr-rate";

type ShelterCampaignCardProps = {
  campaign: Campaign;
  href: string;
  actions: ReactNode;
  milestoneCount: number;
};

function formatEth(value: number) {
  return `${value.toLocaleString("en-MY", {
    maximumFractionDigits: 6,
  })} ETH`;
}

function formatLiveMyr(value: number) {
  return `live MYR ${value.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function urgencyStyle(urgency: Campaign["urgency_level"]) {
  if (urgency === "critical") return "bg-red-100 text-red-700";
  if (urgency === "high") return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

function shortAddress(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function ShelterCampaignCard({
  campaign,
  href,
  actions,
  milestoneCount,
}: ShelterCampaignCardProps) {
  const { rate } = useEthMyrRate();
  const contractAddress =
    campaign.contract_address && isAddress(campaign.contract_address)
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
      enabled: Boolean(contractAddress && campaign.campaign_status === "closed"),
    },
  });

  const goalEth = onChainGoal !== undefined
    ? Number(formatEther(onChainGoal))
    : campaign.goal_wei
      ? Number(formatEther(BigInt(campaign.goal_wei)))
      : Number(campaign.goal_amount || 0) / rate;
  const raisedEth = onChainRaised !== undefined
    ? Number(formatEther(onChainRaised))
    : Number(campaign.current_amount || 0) / rate;
  const refundPoolEth = onChainRefundPool !== undefined
    ? Number(formatEther(onChainRefundPool))
    : 0;
  const progress = getProgress(raisedEth, goalEth);
  const remainingEth = Math.max(0, goalEth - raisedEth);
  const createdAt = campaign.created_at
    ? new Date(campaign.created_at).getTime()
    : Date.now();
  const remainingDays = Math.max(
    0,
    Math.ceil(
      (createdAt + campaign.duration_days * 86_400_000 - Date.now()) /
        86_400_000,
    ),
  );
  const timingValue = campaign.campaign_status === "completed"
    ? "Completed"
    : campaign.campaign_status === "closed"
      ? "Closed"
      : campaign.campaign_status === "rejected"
        ? "Rejected"
        : `${remainingDays} days`;
  const isInactive =
    campaign.campaign_status === "closed" ||
    campaign.campaign_status === "completed";

  return (
    <article
      className={`group/card donor-gradient-card relative flex h-full w-full flex-col overflow-hidden rounded-2xl border-2 transition ${
        isInactive
          ? "border-stone-300 bg-stone-100 shadow-sm hover:border-stone-400"
          : "border-orange-300 bg-transparent shadow-[0_4px_14px_rgba(194,101,16,0.12)] hover:-translate-y-0.5 hover:border-orange-500 hover:shadow-[0_10px_24px_rgba(194,101,16,0.22)]"
      }`}
    >
      <Link href={href} className={`flex flex-1 flex-col ${isInactive ? "grayscale opacity-75" : ""}`}>
        <div className={`relative h-44 shrink-0 overflow-hidden transition-[height] duration-500 ease-in-out group-hover/card:h-[7.75rem] motion-reduce:transition-none ${isInactive ? "grayscale opacity-70" : ""}`}>
          {campaign.image_url ? (
            <img
              src={campaign.image_url}
              alt=""
              className="h-full w-full object-cover transition duration-500 group-hover/card:scale-[1.03]"
            />
          ) : (
            <div className="relative grid h-full place-items-center overflow-hidden bg-gradient-to-br from-orange-50 to-amber-100">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.95),transparent_30%),radial-gradient(circle_at_80%_70%,rgba(255,138,0,0.18),transparent_34%)]" />
              <img src="/images/logo.png" alt="" className="relative h-20 w-20 object-contain opacity-65" />
            </div>
          )}
          <div className="absolute bottom-3 left-3">
            <StatusBadge
              status={campaign.campaign_status}
              label={campaign.campaign_status === "closed" ? "Closed" : undefined}
            />
          </div>
        </div>

        <div className={`relative z-10 -mt-3 flex flex-1 flex-col rounded-2xl border px-4 pb-4 pt-5 transition-colors ${isInactive ? "border-stone-300 bg-stone-100 group-hover/card:border-stone-400" : "border-orange-300 bg-white group-hover/card:border-orange-400"}`}>
          <div className="flex items-start justify-between gap-3">
            <h2 className="line-clamp-2 text-lg font-black leading-6 text-stone-950">
              {campaign.title}
            </h2>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.68rem] font-black capitalize ${urgencyStyle(campaign.urgency_level)}`}>
              {campaign.urgency_level}
            </span>
          </div>

          <p className="mt-2 line-clamp-2 text-sm leading-5 text-stone-600">
            {campaign.description}
          </p>

          <div className="mt-4">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xl font-black text-stone-950">{formatEth(raisedEth)}</p><p className="mt-0.5 text-[11px] font-bold text-stone-400">≈ {formatLiveMyr(raisedEth * rate)} raised</p></div>
              <div className="text-right"><p className="text-xl font-black text-[var(--color-orange)]">{progress}%</p><p className="text-[11px] font-bold text-stone-500">of goal</p></div>
            </div>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-stone-200">
              <div className="donor-progress-fill h-full rounded-full bg-[var(--color-orange)]" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 border-b border-orange-200 pb-4 text-xs">
              <div className="flex gap-2.5"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet-50 text-violet-600" aria-hidden="true">◎</span><div><p className="font-black text-stone-700">Goal</p><p className="mt-1 text-sm font-black text-stone-950">{formatEth(goalEth)}</p><p className="mt-0.5 text-[10px] font-bold text-stone-400">≈ {formatLiveMyr(goalEth * rate)}</p></div></div>
              <div className="flex gap-2.5"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600" aria-hidden="true">↗</span><div><p className="font-black text-stone-700">Remaining</p><p className="mt-1 text-sm font-black text-stone-950">{formatEth(remainingEth)}</p><p className="mt-0.5 text-[10px] font-bold text-stone-400">≈ {formatLiveMyr(remainingEth * rate)}</p></div></div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            <div className="rounded-xl bg-orange-50/45 px-3 py-2"><p className="font-black text-stone-950">{milestoneCount}</p><p className="text-xs font-medium text-stone-500">Milestones</p></div>
            <div className="rounded-xl bg-orange-50/45 px-3 py-2"><p className="font-black text-stone-950">{timingValue}</p><p className="text-xs font-medium text-stone-500">{campaign.campaign_status === "active" ? "Remaining" : "Campaign status"}</p></div>
            <div className="col-span-2 flex min-w-0 flex-col items-center justify-center rounded-xl border border-orange-300 bg-white px-2 py-2 text-center sm:col-span-1">
              {contractAddress ? <><span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Smart contract linked</span><span className="mt-1 truncate font-mono text-[10px] font-black text-[var(--color-orange)]">{shortAddress(contractAddress)}</span></> : <span className="text-[10px] font-bold text-stone-500">Contract pending</span>}
            </div>
          </div>

          {campaign.campaign_status === "closed" ? (
            <div className="hidden">
              <p className="text-[10px] font-black uppercase tracking-wide text-amber-700">Reserved for donor refunds</p>
              <p className="mt-1 text-sm font-black text-stone-950">
                {onChainRefundPool !== undefined ? formatEth(refundPoolEth) : "Reading on-chain..."}
              </p>
              {onChainRefundPool !== undefined ? <p className="mt-0.5 text-[10px] font-bold text-stone-500">≈ {formatLiveMyr(refundPoolEth * rate)} · available to eligible donors</p> : null}
            </div>
          ) : null}
        </div>
      </Link>

      {campaign.campaign_status === "closed" ? (
        <div className="relative z-20 mx-4 mb-4 rounded-xl border-2 border-amber-400 bg-amber-50 px-3 py-2.5 shadow-sm shadow-amber-100">
          <p className="text-[10px] font-black uppercase tracking-wide text-amber-700">
            Reserved for donor refunds
          </p>
          <p className="mt-1 text-sm font-black text-stone-950">
            {onChainRefundPool !== undefined
              ? formatEth(refundPoolEth)
              : "Reading on-chain..."}
          </p>
          {onChainRefundPool !== undefined ? (
            <p className="mt-0.5 text-[10px] font-bold text-amber-800">
              ≈ {formatLiveMyr(refundPoolEth * rate)} · available to eligible donors
            </p>
          ) : null}
        </div>
      ) : null}

      <div className={`relative z-20 max-h-0 overflow-hidden border-t-0 px-4 py-0 opacity-0 transition-all duration-300 group-hover/card:max-h-40 group-hover/card:border-t group-hover/card:py-3 group-hover/card:opacity-100 group-focus-within/card:max-h-40 group-focus-within/card:border-t group-focus-within/card:py-3 group-focus-within/card:opacity-100 ${isInactive ? "border-stone-300 bg-stone-100 grayscale" : "border-orange-300 bg-white"}`}>
        {actions}
      </div>
    </article>
  );
}
