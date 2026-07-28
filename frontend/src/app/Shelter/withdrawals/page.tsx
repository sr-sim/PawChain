"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { usePublicClient } from "wagmi";
import { formatEther, isAddress, type Address } from "viem";
import type {
  Campaign,
  CampaignMilestone,
} from "@/app/components/campaigns/campaign-types";
import { MilestoneCard } from "@/app/Shelter/campaigns/components/MilestoneCard";
import { campaignContractAbi } from "@/lib/campaign-contract-abi";
import { demoEthMyrRate } from "@/lib/campaign-blockchain";

type CampaignWithMilestones = Campaign & {
  milestones: CampaignMilestone[];
};

type ChainMilestone = {
  status: number;
  allocationEth: number;
  cumulativeThresholdEth: number;
};

type CampaignChainState = {
  goalEth: number;
  raisedEth: number;
  balanceEth: number;
  milestones: Record<string, ChainMilestone>;
};

type FilterKey =
  | "all"
  | "withdrawable"
  | "pending-proof"
  | "pending-review"
  | "completed"
  | "locked";

const filterLabels: Record<FilterKey, string> = {
  all: "All Campaigns",
  withdrawable: "Withdrawable",
  "pending-proof": "Pending Proof",
  "pending-review": "Pending Review",
  completed: "Completed",
  locked: "Locked",
};

function orderMilestones(items: CampaignMilestone[]) {
  return [...items].sort((left, right) => {
    if (left.on_chain_index != null && right.on_chain_index != null) {
      return left.on_chain_index - right.on_chain_index;
    }
    if (left.on_chain_index != null) return -1;
    if (right.on_chain_index != null) return 1;
    return String(left.created_at ?? "").localeCompare(
      String(right.created_at ?? ""),
    );
  });
}

function formatEth(value: number) {
  return `${value.toLocaleString("en-MY", {
    maximumFractionDigits: 8,
  })} ETH`;
}

function formatMyr(value: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function preciseProgress(raised: number, goal: number) {
  if (!Number.isFinite(raised) || !Number.isFinite(goal) || goal <= 0) return 0;
  return Math.min(100, Math.floor((raised / goal) * 10000) / 100);
}

function shortAddress(value?: string | null) {
  if (!value) return "Not deployed";
  return `${value.slice(0, 7)}...${value.slice(-6)}`;
}

function statusLabel(status: number) {
  return [
    "Locked",
    "Active",
    "Pending Review",
    "Rejected",
    "Approved",
    "Withdrawable",
    "Released — Proof Required",
    "Completed",
  ][status] ?? "Checking";
}

function statusTone(status: number) {
  if (status === 5) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === 2 || status === 4) return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === 1) return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === 3) return "border-red-200 bg-red-50 text-red-700";
  if (status === 6) return "border-orange-200 bg-orange-50 text-orange-700";
  if (status === 7) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-stone-200 bg-stone-50 text-stone-600";
}

function matchesFilter(status: number, _index: number, filter: FilterKey) {
  if (filter === "all") return true;
  if (filter === "withdrawable") return status === 5;
  if (filter === "pending-proof") return status === 6 || status === 3;
  if (filter === "pending-review") return status === 2;
  if (filter === "completed") return status === 7;
  return status === 0 || status === 1;
}

function StatCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "violet" | "orange" | "green" | "blue";
}) {
  const tones = {
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
    orange: "bg-orange-50 text-orange-700 ring-orange-100",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
  };

  return (
    <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-[0_12px_30px_rgba(111,69,20,0.05)]">
      <div className="flex items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-lg font-black ring-1 ${tones[tone]}`}>●</span>
        <div className="min-w-0">
          <p className="text-xs font-bold text-stone-500">{label}</p>
          <p className="mt-1 text-xl font-black text-stone-950">{value}</p>
          <p className="mt-1 text-xs font-semibold text-stone-500">{detail}</p>
        </div>
      </div>
    </div>
  );
}

export default function ShelterWithdrawalsPage() {
  const { address, isConnected } = useAppKitAccount();
  const { open } = useAppKit();
  const publicClient = usePublicClient();
  const [items, setItems] = useState<CampaignWithMilestones[]>([]);
  const [chainStates, setChainStates] = useState<Record<string, CampaignChainState>>({});
  const [loading, setLoading] = useState(false);
  const [chainLoading, setChainLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const loadCampaigns = useCallback(async () => {
    if (!address) {
      setItems([]);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/shelter/campaigns?walletAddress=${encodeURIComponent(address)}`,
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message ?? "Unable to load campaigns.");
      }

      const deployedCampaigns = (result.campaigns ?? []).filter(
        (campaign: Campaign) => campaign.contract_address,
      );
      const detailed = await Promise.all(
        deployedCampaigns.map(async (campaign: Campaign) => {
          const detailResponse = await fetch(
            `/api/shelter/campaigns/${campaign.id}?walletAddress=${encodeURIComponent(address)}`,
          );
          const detail = await detailResponse.json();
          if (!detailResponse.ok) {
            throw new Error(detail.message ?? `Unable to load ${campaign.title}.`);
          }
          return {
            ...campaign,
            milestones: orderMilestones(detail.milestones ?? []),
          };
        }),
      );
      setItems(detailed);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load withdrawals.");
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    async function loadChainStates() {
      if (!publicClient || items.length === 0) {
        setChainStates({});
        return;
      }

      setChainLoading(true);
      try {
        const states = await Promise.all(
          items.map(async (campaign) => {
            if (!campaign.contract_address || !isAddress(campaign.contract_address)) {
              return [campaign.id, null] as const;
            }

            const contractAddress = campaign.contract_address as Address;
            const [goal, totalRaised, balance, milestoneEntries] = await Promise.all([
              publicClient.readContract({ address: contractAddress, abi: campaignContractAbi, functionName: "goal" }),
              publicClient.readContract({ address: contractAddress, abi: campaignContractAbi, functionName: "totalRaised" }),
              publicClient.getBalance({ address: contractAddress }),
              Promise.all(
                campaign.milestones.map(async (milestone) => {
                  if (milestone.on_chain_index == null) return null;
                  const onChain = await publicClient.readContract({
                    address: contractAddress,
                    abi: campaignContractAbi,
                    functionName: "getMilestone",
                    args: [BigInt(milestone.on_chain_index)],
                  });
                  return [
                    milestone.id,
                    {
                      status: Number(onChain.status),
                      allocationEth: Number(formatEther(onChain.allocation)),
                      cumulativeThresholdEth: Number(formatEther(onChain.cumulativeThreshold)),
                    },
                  ] as const;
                }),
              ),
            ]);

            return [
              campaign.id,
              {
                goalEth: Number(formatEther(goal)),
                raisedEth: Number(formatEther(totalRaised)),
                balanceEth: Number(formatEther(balance)),
                milestones: Object.fromEntries(
                  milestoneEntries.filter(
                    (entry): entry is NonNullable<typeof entry> => Boolean(entry),
                  ),
                ),
              },
            ] as const;
          }),
        );

        setChainStates(
          Object.fromEntries(states.filter((entry) => entry[1] !== null)) as Record<
            string,
            CampaignChainState
          >,
        );
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Unable to read withdrawal status from Sepolia.",
        );
      } finally {
        setChainLoading(false);
      }
    }

    void loadChainStates();
  }, [items, publicClient]);

  const metrics = useMemo(() => {
    let availableEth = 0;
    let pendingEth = 0;
    let withdrawnEth = 0;
    let availableMyr = 0;
    let pendingMyr = 0;
    let withdrawnMyr = 0;

    items.forEach((campaign) => {
      const rate = Number(campaign.eth_myr_rate ?? demoEthMyrRate) || demoEthMyrRate;
      campaign.milestones.forEach((milestone) => {
        const chainMilestone = chainStates[campaign.id]?.milestones[milestone.id];
        if (!chainMilestone) return;
        if (chainMilestone.status === 5) {
          availableEth += chainMilestone.allocationEth;
          availableMyr += chainMilestone.allocationEth * rate;
        }
        if (chainMilestone.status === 2) {
          pendingEth += chainMilestone.allocationEth;
          pendingMyr += chainMilestone.allocationEth * rate;
        }
        if (chainMilestone.status === 6 || chainMilestone.status === 7) {
          withdrawnEth += chainMilestone.allocationEth;
          withdrawnMyr += chainMilestone.allocationEth * rate;
        }
      });
    });

    return {
      availableEth,
      availableMyr,
      pendingEth,
      pendingMyr,
      withdrawnEth,
      withdrawnMyr,
    };
  }, [chainStates, items]);

  const filterCounts = useMemo(() => {
    const counts: Record<FilterKey, number> = {
      all: items.length,
      withdrawable: 0,
      "pending-proof": 0,
      "pending-review": 0,
      completed: 0,
      locked: 0,
    };

    items.forEach((campaign) => {
      campaign.milestones.forEach((milestone, index) => {
        const status = chainStates[campaign.id]?.milestones[milestone.id]?.status;
        if (status == null) return;
        (Object.keys(counts) as FilterKey[]).forEach((key) => {
          if (key !== "all" && matchesFilter(status, index, key)) counts[key] += 1;
        });
      });
    });
    return counts;
  }, [chainStates, items]);

  const visibleCampaigns = useMemo(
    () =>
      filter === "all"
        ? items
        : items.filter((campaign) =>
            campaign.milestones.some((milestone, index) => {
              const status = chainStates[campaign.id]?.milestones[milestone.id]?.status;
              return status != null && matchesFilter(status, index, filter);
            }),
          ),
    [chainStates, filter, items],
  );

  const selectedCampaign = items.find((item) => item.id === selectedCampaignId) ?? null;

  if (selectedCampaign) {
    const chain = chainStates[selectedCampaign.id];
    const rate = Number(selectedCampaign.eth_myr_rate ?? demoEthMyrRate) || demoEthMyrRate;
    const goalEth = chain?.goalEth ?? (selectedCampaign.goal_wei ? Number(formatEther(BigInt(selectedCampaign.goal_wei))) : Number(selectedCampaign.goal_amount) / rate);
    const raisedEth = chain?.raisedEth ?? Number(selectedCampaign.current_amount ?? 0) / rate;
    const availableEth = selectedCampaign.milestones.reduce((sum, milestone) => {
      const state = chain?.milestones[milestone.id];
      return sum + (state?.status === 5 ? state.allocationEth : 0);
    }, 0);

    return (
      <div className="space-y-6 py-6">
        <button type="button" onClick={() => setSelectedCampaignId(null)} className="inline-flex items-center gap-2 text-sm font-black text-stone-700 hover:text-[var(--color-orange)]">← Back to Withdraw Funds</button>

        <section className="rounded-3xl border border-orange-100 bg-white p-5 shadow-[0_18px_48px_rgba(111,69,20,0.07)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-orange-50">
                {selectedCampaign.image_url ? <img src={selectedCampaign.image_url} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <div className="min-w-0"><h1 className="text-2xl font-black text-stone-950">{selectedCampaign.title}</h1><div className="mt-2 flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">Active</span><span className="rounded-full bg-orange-50 px-3 py-1 capitalize text-orange-700">{selectedCampaign.urgency_level} priority</span></div><p className="mt-3 truncate font-mono text-xs font-semibold text-stone-500">Contract: {selectedCampaign.contract_address}</p></div>
            </div>
            {selectedCampaign.contract_address ? <a href={`https://sepolia.etherscan.io/address/${selectedCampaign.contract_address}`} target="_blank" rel="noreferrer" className="rounded-xl border border-violet-300 px-4 py-3 text-center text-xs font-black text-violet-700">View on Sepolia Etherscan ↗</a> : null}
          </div>

          <div className="mt-6 grid gap-4 border-t border-orange-100 pt-5 sm:grid-cols-2 xl:grid-cols-4">
            <div><p className="text-xs font-bold text-stone-500">Available to Withdraw</p><p className="mt-1 text-xl font-black">{formatEth(availableEth)}</p><p className="text-xs font-semibold text-stone-400">≈ {formatMyr(availableEth * rate)}</p></div>
            <div><p className="text-xs font-bold text-stone-500">Contract Balance</p><p className="mt-1 text-xl font-black">{formatEth(chain?.balanceEth ?? 0)}</p><p className="text-xs font-semibold text-stone-400">≈ {formatMyr((chain?.balanceEth ?? 0) * rate)}</p></div>
            <div><p className="text-xs font-bold text-stone-500">Total Raised</p><p className="mt-1 text-xl font-black">{formatEth(raisedEth)}</p><p className="text-xs font-semibold text-stone-400">{preciseProgress(raisedEth, goalEth)}% funded</p></div>
            <div><p className="text-xs font-bold text-stone-500">Shelter Wallet</p><p className="mt-1 font-mono text-lg font-black">{shortAddress(address)}</p><p className="text-xs font-semibold text-violet-600">Sepolia Testnet</p></div>
          </div>
        </section>

        <section>
          <div className="mb-4"><h2 className="text-2xl font-black">Milestone Progress</h2><p className="mt-1 text-sm font-semibold text-stone-500">Withdraw funds only when the smart contract marks a milestone as withdrawable.</p></div>
          <div className="space-y-5">
            {selectedCampaign.milestones.map((milestone, index) => {
              const state = chain?.milestones[milestone.id];
              return (
                <div key={milestone.id}>
                  <div className="mb-2 flex items-center gap-3"><span className={`grid h-9 w-9 place-items-center rounded-full text-sm font-black ring-1 ${statusTone(state?.status ?? -1)}`}>{index + 1}</span><span className={`rounded-full border px-3 py-1 text-xs font-black ${statusTone(state?.status ?? -1)}`}>{statusLabel(state?.status ?? -1)}</span>{state ? <span className="text-xs font-bold text-stone-500">{formatEth(state.allocationEth)}</span> : null}</div>
                  <MilestoneCard
                    milestone={milestone}
                    index={index}
                    campaignId={selectedCampaign.id}
                    walletAddress={address}
                    contractAddress={selectedCampaign.contract_address}
                    goalEth={goalEth}
                    ethMyrRate={rate}
                    cumulativePercentage={selectedCampaign.milestones.slice(0, index + 1).reduce((sum, item) => sum + Number(item.percentage || 0), 0)}
                    canUploadProof={selectedCampaign.campaign_status === "active"}
                    showProofUpload={false}
                    showWithdrawAction
                    onWithdrawalCompleted={() => void loadCampaigns()}
                  />
                </div>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">Shelter Dashboard&nbsp; / &nbsp;Withdraw Funds</p>
        <h1 className="mt-3 text-3xl font-black text-stone-950">Withdraw Funds</h1>
        <p className="mt-2 text-sm font-semibold text-stone-600">Withdraw only when a milestone is marked as withdrawable by the smart contract.</p>
      </header>

      {!isConnected ? <section className="rounded-2xl border border-orange-200 bg-white p-8 text-center"><h2 className="text-xl font-black">Connect your shelter wallet</h2><button type="button" onClick={() => open()} className="mt-4 rounded-xl bg-stone-950 px-5 py-3 text-sm font-black text-white">Connect Wallet</button></section> : null}
      {error ? <p className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
      {loading || chainLoading ? <div className="rounded-2xl border border-orange-100 bg-white p-4 text-center text-sm font-black text-stone-500">Reading confirmed campaign and milestone status from Sepolia...</div> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Available to Withdraw" value={formatMyr(metrics.availableMyr)} detail={`≈ ${formatEth(metrics.availableEth)}`} tone="violet" />
        <StatCard label="Pending Approval" value={formatMyr(metrics.pendingMyr)} detail={`≈ ${formatEth(metrics.pendingEth)}`} tone="orange" />
        <StatCard label="Total Withdrawn" value={formatMyr(metrics.withdrawnMyr)} detail={`≈ ${formatEth(metrics.withdrawnEth)}`} tone="green" />
        <StatCard label="Active Campaigns" value={String(items.filter((item) => item.campaign_status === "active").length)} detail="Deployed campaigns" tone="blue" />
      </section>

      <section className="rounded-3xl border border-orange-100 bg-white p-4 shadow-[0_18px_48px_rgba(111,69,20,0.06)] sm:p-5">
        <div className="flex flex-wrap gap-2 border-b border-orange-100 pb-4">
          {(Object.keys(filterLabels) as FilterKey[]).map((key) => <button key={key} type="button" onClick={() => setFilter(key)} className={`rounded-full border px-4 py-2 text-xs font-black transition ${filter === key ? "border-[var(--color-orange)] bg-orange-50 text-[var(--color-orange)]" : "border-orange-100 bg-white text-stone-600 hover:bg-orange-50"}`}>{filterLabels[key]} <span className="ml-1 rounded-full bg-white px-2 py-0.5 ring-1 ring-orange-100">{filterCounts[key]}</span></button>)}
        </div>

        <div className="mt-5 space-y-4">
          {visibleCampaigns.map((campaign) => {
            const chain = chainStates[campaign.id];
            const rate = Number(campaign.eth_myr_rate ?? demoEthMyrRate) || demoEthMyrRate;
            const goalEth = chain?.goalEth ?? (campaign.goal_wei ? Number(formatEther(BigInt(campaign.goal_wei))) : Number(campaign.goal_amount) / rate);
            const raisedEth = chain?.raisedEth ?? Number(campaign.current_amount ?? 0) / rate;
            const progress = preciseProgress(raisedEth, goalEth);
            const currentIndex = campaign.milestones.findIndex((milestone) => (chain?.milestones[milestone.id]?.status ?? 0) !== 7);
            const safeCurrentIndex = currentIndex < 0 ? Math.max(0, campaign.milestones.length - 1) : currentIndex;
            const currentMilestone = campaign.milestones[safeCurrentIndex];
            const currentStatus = currentMilestone ? chain?.milestones[currentMilestone.id]?.status : undefined;
            const availableEth = campaign.milestones.reduce((sum, milestone) => {
              const state = chain?.milestones[milestone.id];
              return sum + (state?.status === 5 ? state.allocationEth : 0);
            }, 0);

            return (
              <article key={campaign.id} className="rounded-2xl border border-orange-100 bg-[linear-gradient(135deg,#FFFFFF,#FFFDF7)] p-4 transition hover:border-orange-300 sm:p-5">
                <div className="grid gap-5 lg:grid-cols-[8rem_minmax(0,1fr)_12rem] lg:items-center">
                  <div className="h-36 overflow-hidden rounded-2xl bg-orange-50 lg:h-32">{campaign.image_url ? <img src={campaign.image_url} alt="" className="h-full w-full object-cover" /> : null}</div>
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-black text-stone-950">{campaign.title}</h2><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Active</span><span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black capitalize text-orange-700">{campaign.urgency_level} priority</span></div><p className="mt-2 text-xs font-bold text-stone-500">{campaign.location} · {campaign.milestones.length} milestones</p><div className="mt-4 flex items-end justify-between gap-4"><p className="text-sm font-black">{formatEth(raisedEth)} raised of {formatEth(goalEth)}</p><p className="text-sm font-black">{progress}% funded</p></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-orange-100"><div className="h-full rounded-full bg-[var(--color-orange)]" style={{ width: `${progress}%` }} /></div><div className="mt-4 grid gap-3 text-xs sm:grid-cols-3"><div><p className="font-bold text-stone-500">Available</p><p className="mt-1 font-black">{formatEth(availableEth)}</p><p className="text-stone-400">≈ {formatMyr(availableEth * rate)}</p></div><div><p className="font-bold text-stone-500">Current Milestone</p><p className="mt-1 font-black">{safeCurrentIndex + 1} / {campaign.milestones.length}</p><p className="truncate text-stone-400">{currentMilestone?.title}</p></div><div><p className="font-bold text-stone-500">Status</p><p className="mt-1 font-black">{statusLabel(currentStatus ?? -1)}</p></div></div></div>
                  <div className="space-y-3"><button type="button" onClick={() => setSelectedCampaignId(campaign.id)} className="w-full rounded-xl border border-violet-300 px-4 py-3 text-sm font-black text-violet-700 transition hover:bg-violet-50">View Milestones →</button><button type="button" onClick={() => setSelectedCampaignId(campaign.id)} disabled={availableEth <= 0} className="w-full rounded-xl bg-[var(--color-orange)] px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500">{availableEth > 0 ? "Withdrawable" : statusLabel(currentStatus ?? -1)}</button></div>
                </div>
              </article>
            );
          })}

          {!loading && isConnected && visibleCampaigns.length === 0 ? <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/30 p-10 text-center text-sm font-bold text-stone-500">No campaigns match this withdrawal filter.</div> : null}
        </div>
      </section>

      <p className="rounded-2xl border border-[#FFCD80] bg-[#FFFCC9]/45 px-4 py-3 text-xs font-bold text-stone-600">Withdrawal availability comes directly from the Sepolia smart contract. A displayed percentage never overrides the exact on-chain wei threshold.</p>
    </div>
  );
}
