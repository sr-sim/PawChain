"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
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

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const { address, isConnected } = useAppKitAccount();
  const { open } = useAppKit();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [milestones, setMilestones] = useState<CampaignMilestone[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

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
        setMilestones(result.milestones ?? []);
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

  const progress = useMemo(() => {
    if (!campaign) {
      return 0;
    }

    return getProgress(campaign.current_amount, campaign.goal_amount);
  }, [campaign]);

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
        Campaign Hub
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
          <section className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-[0_22px_60px_rgba(155,86,20,0.12)]">
            {campaign.image_url ? (
              <img
                src={campaign.image_url}
                alt=""
                className="aspect-[16/7] w-full object-cover"
              />
            ) : (
              <div className="grid aspect-[16/7] place-items-center bg-[linear-gradient(135deg,rgba(var(--color-cream-rgb),0.92),rgba(var(--color-peach-rgb),0.44))] text-[var(--color-orange)]">
                <CampaignIcon />
              </div>
            )}

            <div className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={campaign.campaign_status} />
                    <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-black capitalize text-[var(--color-orange)]">
                      {campaign.urgency_level}
                    </span>
                    <span className="rounded-full border border-orange-100 bg-white px-3 py-1 text-xs font-black text-stone-600">
                      {campaign.location}
                    </span>
                  </div>
                  <h1 className="mt-4 text-3xl font-black text-stone-950 sm:text-4xl">
                    {campaign.title}
                  </h1>
                  <p className="mt-3 max-w-3xl text-base font-bold leading-7 text-stone-700">
                    {campaign.description}
                  </p>
                </div>

                <div className="rounded-2xl border border-orange-100 bg-[linear-gradient(135deg,rgba(var(--color-cream-rgb),0.72),rgba(var(--color-peach-rgb),0.22))] p-4 lg:min-w-72">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">
                    Campaign Progress
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3 text-sm font-black">
                    <span className="text-stone-950">
                      {formatCurrency(campaign.current_amount)}
                    </span>
                    <span className="text-stone-500">
                      {formatCurrency(campaign.goal_amount)}
                    </span>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-orange-100">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-gold),var(--color-orange))]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-right text-xs font-black text-stone-500">
                    {progress}% funded
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-orange-100 bg-orange-50/45 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">
                    Duration
                  </p>
                  <p className="mt-2 text-lg font-black text-stone-950">
                    {campaign.duration_days} days
                  </p>
                </div>
                <div className="rounded-2xl border border-orange-100 bg-orange-50/45 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">
                    Contract
                  </p>
                  <p className="mt-2 break-all text-sm font-black text-stone-950">
                    {campaign.contract_address ?? "Generated after admin approval"}
                  </p>
                </div>
                <div className="rounded-2xl border border-orange-100 bg-orange-50/45 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">
                    Edit Access
                  </p>
                  <p className="mt-2 text-sm font-black text-stone-950">
                    {editAccessMessage}
                  </p>
                  {canEdit ? (
                    <Link
                      href={`/Shelter/campaigns/${campaign.id}/edit`}
                      className="mt-3 inline-flex rounded-full bg-stone-950 px-4 py-2 text-xs font-black text-white transition hover:bg-[var(--color-orange)]"
                    >
                      Edit Campaign
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-[0_18px_48px_rgba(155,86,20,0.08)] sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">
                  Milestones
                </p>
                <h2 className="mt-1 text-2xl font-black text-stone-950">
                  Release tracking
                </h2>
              </div>
              <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-black text-[var(--color-orange)]">
                {milestones.length} total
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {milestones.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/40 p-6 text-center text-sm font-black text-stone-600">
                  No milestones found for this campaign.
                </div>
              ) : null}

              {milestones.map((milestone, index) => (
                <MilestoneCard
                  key={milestone.id}
                  milestone={milestone}
                  index={index}
                  campaignId={campaign.id}
                  walletAddress={address}
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
        </>
      ) : null}
    </div>
  );
}
