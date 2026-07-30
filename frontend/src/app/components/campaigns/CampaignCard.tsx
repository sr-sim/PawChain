"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useReadContract } from "wagmi";
import type { Campaign } from "./campaign-types";
import { formatCurrency, getProgress } from "./campaign-utils";
import { StatusBadge } from "./StatusBadge";
import { formatEther, isAddress } from "viem";
import { demoEthMyrRate } from "@/lib/campaign-blockchain";
import { campaignContractAbi } from "@/lib/campaign-contract-abi";

type CampaignCardProps = {
  campaign: Campaign;
  href: string;
  actions?: ReactNode;
  milestoneCount?: number;
};

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

function CampaignCardContent({ campaign, milestoneCount }: { campaign: Campaign; milestoneCount?: number }) {
  const rate = Number(campaign.eth_myr_rate ?? demoEthMyrRate) || demoEthMyrRate;
  const contractAddress = campaign.contract_address && isAddress(campaign.contract_address)
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
  const createdAt = campaign.created_at ? new Date(campaign.created_at).getTime() : Date.now();
  const remainingDays = Math.max(0, Math.ceil((createdAt + campaign.duration_days * 86400000 - Date.now()) / 86400000));

  const progressColor = campaign.campaign_status === "rejected"
    ? "bg-red-500"
    : ["completed", "closed"].includes(campaign.campaign_status)
      ? "bg-emerald-500"
      : "bg-[var(--color-orange)]";

  return (
    <>
      <div className="relative">
        {campaign.image_url ? (
          <img src={campaign.image_url} alt="" className="aspect-[16/7] w-full object-cover transition duration-500 group-hover:scale-[1.02]" />
        ) : (
          <div className="grid aspect-[16/7] place-items-center bg-[linear-gradient(135deg,rgba(var(--color-cream-rgb),0.92),rgba(var(--color-peach-rgb),0.44))] text-[var(--color-orange)]"><CampaignIcon /></div>
        )}
        <div className="absolute bottom-3 left-3">
          <StatusBadge
            status={campaign.campaign_status}
            label={campaign.campaign_status === "closed" ? "Closed" : undefined}
          />
        </div>
      </div>

      <div className="p-4">
        <h2 className="text-lg font-black text-stone-950">
          {campaign.title}
        </h2>
        <p className="mt-1 text-xs font-bold text-stone-500">{campaign.location}</p>

        <div className="mt-4">
          <div className="flex items-end justify-between gap-3">
            <div><p className="text-2xl font-black text-stone-950">{progress}%</p><p className="text-[10px] font-black uppercase tracking-wide text-stone-400">funded</p></div>
            <div className="text-right"><p className="text-xs font-black text-stone-950">{raisedEth.toLocaleString("en-MY", { maximumFractionDigits: 8 })} ETH raised</p><p className="mt-1 text-[10px] font-bold text-stone-400">about {formatCurrency(raisedEth * rate)}</p><p className="mt-1 text-[10px] font-black text-stone-500">{goalEth.toLocaleString("en-MY", { maximumFractionDigits: 8 })} ETH goal</p><p className="mt-1 text-[10px] font-bold text-stone-400">about {formatCurrency(goalEth * rate)}</p></div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-orange-100">
            <div
              className={`h-full rounded-full ${progressColor}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          {campaign.campaign_status === "closed" ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="text-[10px] font-black uppercase tracking-wide text-amber-700">
                Reserved for donor refunds
              </p>
              <p className="mt-1 text-sm font-black text-stone-950">
                {onChainRefundPool !== undefined
                  ? `${refundPoolEth.toLocaleString("en-MY", { maximumFractionDigits: 8 })} ETH`
                  : "Reading on-chain..."}
              </p>
              {onChainRefundPool !== undefined ? <p className="mt-0.5 text-[10px] font-bold text-stone-500">about {formatCurrency(refundPoolEth * rate)} · claimed proportionally by donors</p> : null}
            </div>
          ) : null}
          <div className="mt-4 flex items-center justify-between border-t border-orange-100 pt-3 text-[11px] font-bold text-stone-500"><span>{milestoneCount ?? 0} milestone{milestoneCount === 1 ? "" : "s"}</span><span>{campaign.campaign_status === "completed" ? "Completed" : campaign.campaign_status === "closed" ? "Closed" : `${remainingDays} days left`}</span></div>
        </div>
      </div>
    </>
  );
}

export function CampaignCard({ campaign, href, actions, milestoneCount }: CampaignCardProps) {
  const cardClassName =
    "group block overflow-hidden rounded-2xl border border-orange-100 bg-[linear-gradient(135deg,var(--color-white),rgba(var(--color-cream-rgb),0.58))] shadow-[0_16px_42px_rgba(155,86,20,0.08)] transition duration-300 hover:-translate-y-1 hover:border-[var(--color-orange)] hover:shadow-[0_24px_58px_rgba(155,86,20,0.16)]";

  if (actions) {
    return (
      <article className={cardClassName}>
        <Link href={href} className="block">
          <CampaignCardContent campaign={campaign} milestoneCount={milestoneCount} />
        </Link>
        <div className="border-t border-orange-100 px-4 py-3">{actions}</div>
      </article>
    );
  }

  return (
    <Link href={href} className={cardClassName}>
      <CampaignCardContent campaign={campaign} milestoneCount={milestoneCount} />
    </Link>
  );
}
