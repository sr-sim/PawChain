"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { ShelterCampaignCard } from "@/app/Shelter/components/ShelterCampaignCard";
import { AlertExclamationIcon } from "@/app/components/AlertExclamationIcon";
import type { Campaign, CampaignStatus } from "@/app/components/campaigns/campaign-types";
import { useEthMyrRate } from "@/lib/use-eth-myr-rate";

type FilterKey = "all" | CampaignStatus;
type CampaignListItem = Campaign & { milestoneCount: number };
const filters: { label: string; value: FilterKey }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Pending Approval", value: "pending_approval" },
  { label: "Completed", value: "completed" },
  { label: "Closed", value: "closed" },
  { label: "Rejected", value: "rejected" },
];

export default function CampaignsPage() {
  const { rate } = useEthMyrRate();
  const { address, isConnected } = useAppKitAccount();
  const { open } = useAppKit();
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showMyrExplanation, setShowMyrExplanation] = useState(true);

  useEffect(() => {
    const requestedStatus = new URLSearchParams(window.location.search).get("status");
    if (filters.some((filter) => filter.value === requestedStatus)) {
      setActiveFilter(requestedStatus as FilterKey);
    }
  }, []);

  useEffect(() => {
    if (!address) { setCampaigns([]); return; }
    setIsLoading(true); setError("");
    void fetch(`/api/shelter/campaigns?walletAddress=${encodeURIComponent(address)}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message ?? "Unable to load campaigns.");
        const loadedCampaigns = (result.campaigns ?? []) as Campaign[];
        const withMilestones = await Promise.all(loadedCampaigns.map(async (campaign) => {
          try {
            const detailResponse = await fetch(`/api/shelter/campaigns/${campaign.id}?walletAddress=${encodeURIComponent(address)}`);
            const detail = await detailResponse.json();
            return { ...campaign, milestoneCount: Array.isArray(detail.milestones) ? detail.milestones.length : 0 };
          } catch {
            return { ...campaign, milestoneCount: 0 };
          }
        }));
        setCampaigns(withMilestones);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load campaigns."))
      .finally(() => setIsLoading(false));
  }, [address]);

  const counts = useMemo(() => campaigns.reduce((result, campaign) => {
    result.all += 1;
    result[campaign.campaign_status] = (result[campaign.campaign_status] ?? 0) + 1;
    return result;
  }, { all: 0, active: 0, pending_approval: 0, completed: 0, closed: 0, rejected: 0 } as Record<FilterKey, number>), [campaigns]);
  const filtered = useMemo(() => activeFilter === "all" ? campaigns : campaigns.filter((campaign) => campaign.campaign_status === activeFilter), [campaigns, activeFilter]);

  async function deleteCampaign(campaign: CampaignListItem) {
    if (!address || !window.confirm(`Delete "${campaign.title}"? This cannot be undone.`)) return;
    setDeletingId(campaign.id); setError("");
    try {
      const response = await fetch(`/api/shelter/campaigns/${campaign.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Unable to delete campaign.");
      setCampaigns((current) => current.filter((item) => item.id !== campaign.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete campaign.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="py-6">
      <section className="min-h-[calc(100vh-7rem)] rounded-3xl border border-orange-100 bg-white p-4 shadow-[0_12px_36px_rgba(111,69,20,0.07)] sm:p-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div><h1 className="text-3xl font-black tracking-tight text-stone-950">My Campaigns</h1><p className="mt-1 text-sm font-semibold text-stone-500">Manage all your shelter campaigns</p></div>
          <Link href="/Shelter/campaigns/create" className="inline-flex items-center justify-center rounded-xl bg-[var(--color-orange)] px-4 py-3 text-sm font-black text-white shadow-lg shadow-orange-200/60">+ Create Campaign</Link>
        </header>

        {!isConnected ? <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50/30 p-8 text-center"><h2 className="text-xl font-black">Connect your shelter wallet</h2><p className="mt-2 text-sm font-semibold text-stone-500">Campaign records are linked to your verified wallet.</p><button type="button" onClick={() => open()} className="mt-4 rounded-xl bg-stone-950 px-5 py-3 text-sm font-black text-white">Connect Wallet</button></div> : null}

        <div className="mt-6 flex flex-wrap gap-2">{filters.map((filter) => <button key={filter.value} type="button" onClick={() => setActiveFilter(filter.value)} className={`rounded-full border px-4 py-2 text-xs font-black transition ${activeFilter === filter.value ? "border-orange-200 bg-orange-50 text-[var(--color-orange)]" : "border-stone-200 bg-white text-stone-600 hover:border-orange-200 hover:bg-orange-50"}`}>{filter.label} ({counts[filter.value]})</button>)}</div>
        {showMyrExplanation ? (
          <section className="relative mt-5 rounded-2xl border-2 border-blue-300 bg-blue-50 px-5 py-4 shadow-[0_8px_24px_rgba(37,99,235,0.10)]">
            <button type="button" onClick={() => setShowMyrExplanation(false)} aria-label="Dismiss MYR explanation" className="absolute right-3 top-2 text-lg font-bold text-blue-500 transition hover:text-blue-700">×</button>
            <div className="grid gap-4 pr-5 md:grid-cols-2 md:items-center xl:grid-cols-[minmax(18rem,1.35fr)_auto_minmax(10rem,.7fr)_auto_minmax(10rem,.7fr)_auto_minmax(12rem,.8fr)] xl:gap-3">
              <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-blue-200 bg-white/80 shadow-sm"><AlertExclamationIcon tone="info" className="h-6 w-6" /></span><div><h2 className="text-sm font-black text-blue-800">Why does the MYR amount change?</h2><p className="mt-1 text-xs font-semibold leading-5 text-slate-600">Campaign goals are stored on-chain in ETH, not permanently as MYR. The MYR value shown uses the latest ETH/MYR exchange rate, so it may differ from the amount originally entered.</p></div></div>
              <span className="hidden text-3xl font-light text-blue-400 xl:block" aria-hidden="true">›</span>
              <div className="flex items-start gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-100 text-[10px] font-black text-blue-700">MYR</span><div><p className="text-xs font-black text-slate-800">You set the goal in MYR</p><p className="mt-1 text-[10px] font-semibold text-slate-500">Example:</p><span className="mt-1 inline-flex rounded-full bg-blue-200/70 px-3 py-1 text-[10px] font-black text-blue-800">MYR 1,000</span></div></div>
              <span className="hidden text-3xl font-light text-blue-400 xl:block" aria-hidden="true">›</span>
              <div className="flex items-start gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-black text-blue-700">Ξ</span><div><p className="text-xs font-black text-slate-800">Converted to ETH</p><p className="mt-1 text-[10px] font-semibold text-slate-500">Stored on-chain as</p><span className="mt-1 inline-flex rounded-full bg-blue-200/70 px-3 py-1 text-[10px] font-black text-blue-800">≈ {(1000 / Math.max(rate, 1)).toFixed(4)} ETH</span></div></div>
              <span className="hidden text-3xl font-light text-blue-400 xl:block" aria-hidden="true">›</span>
              <div className="flex items-start gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-100 text-sm font-black text-blue-700">↗</span><div><p className="text-xs font-black text-slate-800">Live rate may change</p><p className="mt-1 text-[10px] font-semibold leading-4 text-slate-500">ETH price changes over time, so the MYR value will vary.</p></div></div>
            </div>
          </section>
        ) : null}
        {error ? <p className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
        {isLoading ? <div className="mt-6 rounded-2xl border border-orange-100 p-10 text-center text-sm font-black text-stone-500">Loading campaigns...</div> : null}
        {!isLoading && !filtered.length ? <div className="mt-6 rounded-2xl border border-dashed border-orange-200 p-10 text-center"><p className="font-black text-stone-950">No campaigns found</p><p className="mt-2 text-sm font-semibold text-stone-500">Choose another status or create a new campaign.</p></div> : null}

        <div className="mt-6 grid auto-rows-fr items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((campaign) => (
            <ShelterCampaignCard
              key={campaign.id}
              campaign={campaign}
              milestoneCount={campaign.milestoneCount}
              href={`/Shelter/campaigns/${campaign.id}`}
              actions={<div>{campaign.campaign_status === "rejected" && campaign.rejection_reason ? <p className="mb-3 rounded-xl bg-red-50 p-2.5 text-xs font-bold leading-5 text-red-700"><span className="block font-black">Rejection reason</span>{campaign.rejection_reason}</p> : null}<div className="flex flex-wrap items-center justify-center gap-2"><Link href={`/Shelter/campaigns/${campaign.id}?focus=campaign#campaign-overview`} scroll className="inline-flex min-h-10 min-w-36 items-center justify-center rounded-xl border border-[var(--color-orange)] bg-[var(--color-orange)] px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-md">View Campaign</Link><Link href={`/Shelter/campaigns/${campaign.id}?focus=milestones#milestone-details`} className="inline-flex min-h-10 min-w-36 items-center justify-center rounded-xl border border-[var(--color-orange)] bg-[var(--color-orange)] px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-md">View Milestones</Link>{["pending_approval", "rejected"].includes(campaign.campaign_status) && !campaign.contract_address ? <Link href={`/Shelter/campaigns/${campaign.id}/edit`} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--color-orange)] px-4 py-2.5 text-xs font-black text-[var(--color-orange)] transition hover:bg-orange-50">Edit</Link> : null}{["pending_approval", "rejected"].includes(campaign.campaign_status) && !campaign.contract_address ? <button type="button" onClick={() => void deleteCampaign(campaign)} disabled={deletingId === campaign.id} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-red-200 px-4 py-2.5 text-xs font-black text-red-700 transition hover:bg-red-50 disabled:opacity-50">{deletingId === campaign.id ? "Deleting..." : "Delete"}</button> : null}</div></div>}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
