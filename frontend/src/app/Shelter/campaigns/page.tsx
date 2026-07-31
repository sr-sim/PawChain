"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { ShelterCampaignCard } from "@/app/Shelter/components/ShelterCampaignCard";
import type { Campaign, CampaignStatus } from "@/app/components/campaigns/campaign-types";

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
  const { address, isConnected } = useAppKitAccount();
  const { open } = useAppKit();
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

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
              actions={<div>{campaign.campaign_status === "rejected" && campaign.rejection_reason ? <p className="mb-3 rounded-xl bg-red-50 p-2.5 text-xs font-bold leading-5 text-red-700"><span className="block font-black">Rejection reason</span>{campaign.rejection_reason}</p> : null}<div className="flex justify-end gap-2"><Link href={`/Shelter/campaigns/${campaign.id}`} className="rounded-lg border border-orange-100 px-4 py-2 text-xs font-black hover:bg-orange-50">View</Link>{campaign.campaign_status === "rejected" ? <Link href={`/Shelter/campaigns/${campaign.id}/edit`} className="rounded-lg border border-[var(--color-orange)] px-4 py-2 text-xs font-black text-[var(--color-orange)] hover:bg-orange-50">Edit</Link> : null}{["pending_approval", "rejected"].includes(campaign.campaign_status) && !campaign.contract_address ? <button type="button" onClick={() => void deleteCampaign(campaign)} disabled={deletingId === campaign.id} className="rounded-lg border border-red-200 px-4 py-2 text-xs font-black text-red-700 hover:bg-red-50 disabled:opacity-50">{deletingId === campaign.id ? "Deleting..." : "Delete"}</button> : null}</div></div>}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
