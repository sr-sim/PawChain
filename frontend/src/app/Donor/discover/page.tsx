"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getShelters, type Campaign } from "../campaignData";
import {
  getAddressExplorerUrl,
  getExplorerNetworkName,
  getTransactionExplorerUrl,
  shortAddress,
} from "@/lib/block-explorer";
import { TransactionLinks } from "@/app/components/TransactionLinks";

type DonorCampaign = Campaign & {
  imageUrl?: string | null;
  source?: "supabase";
  goalAmount?: number;
  onChainGoalEth?: number;
  onChainTotalRaisedEth?: number;
  contractAddress?: string | null;
  deploymentTxHash?: string | null;
  milestoneDetails?: {
    title: string;
    percentage: number;
    proofTxHash?: string | null;
    reviewTxHash?: string | null;
    releaseTxHash?: string | null;
  }[];
};

const urgencies = ["All", "Critical", "High", "Medium"];
const locations = ["All", "Kuala Lumpur", "Selangor", "Penang", "Johor"];
const sortOptions = ["Most urgent", "Deadline soon", "Most progress", "Most donors"];
const tabs = ["Campaigns", "Completed", "Shelters", "Saved"] as const;
const urgencyRank: Record<string, number> = { Critical: 0, High: 1, Medium: 2 };

function getUrgencyStyle(urgency: string) {
  if (urgency === "Critical") {
    return "bg-red-100 text-red-700";
  }

  if (urgency === "High") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-emerald-100 text-emerald-700";
}

function getStatusStyle(status: string) {
  if (status === "Active") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "Completed") {
    return "bg-blue-100 text-blue-700";
  }

  return "bg-slate-100 text-slate-700";
}

function formatMyr(value: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatEth(value: number) {
  return `${value.toLocaleString("en-MY", {
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

function shortHash(value: string) {
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

function CampaignImage({
  imageClass,
  imageUrl,
  size = "card",
}: {
  imageClass: string;
  imageUrl?: string | null;
  size?: "compact" | "card" | "hero";
}) {
  const imageHeight =
    size === "hero" ? "h-64" : size === "compact" ? "h-[8.5rem] sm:h-36" : "h-44 sm:h-48";

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className={[
          "w-full rounded-xl object-cover",
          imageHeight,
        ].join(" ")}
      />
    );
  }

  return (
    <div
      className={[
        "relative overflow-hidden rounded-xl bg-gradient-to-br",
        imageClass,
        imageHeight,
      ].join(" ")}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.95),transparent_30%),radial-gradient(circle_at_80%_70%,rgba(255,138,0,0.18),transparent_34%)]" />
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        suppressHydrationWarning
        className="mt-2 h-10 w-full rounded-xl border border-orange-100 bg-white px-3 text-sm font-medium text-stone-800 outline-none transition focus:border-[var(--color-orange)] focus:ring-2 focus:ring-orange-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function DonorDiscoverPage() {
  const searchParams = useSearchParams();
  const walletAddress = searchParams.get("walletAddress") ?? "";
  const [campaigns, setCampaigns] = useState<DonorCampaign[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);
  const [campaignLoadError, setCampaignLoadError] = useState("");
  const [savedLoadError, setSavedLoadError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [urgency, setUrgency] = useState("All");
  const [location, setLocation] = useState("All");
  const [sortBy, setSortBy] = useState(sortOptions[0]);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Campaigns");
  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get("campaign"),
  );
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    urgency !== "All" ||
    location !== "All";

  useEffect(() => {
    let isMounted = true;

    async function loadCampaigns() {
      setIsLoadingCampaigns(true);
      setCampaignLoadError("");

      try {
        const response = await fetch("/api/donor/campaigns", {
          cache: "no-store",
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message ?? "Unable to load campaigns.");
        }

        if (!isMounted) {
          return;
        }

        setCampaigns(Array.isArray(result.campaigns) ? result.campaigns : []);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setCampaigns([]);
        setCampaignLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load campaigns.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingCampaigns(false);
        }
      }
    }

    loadCampaigns();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSavedCampaigns() {
      setSavedLoadError("");

      if (!walletAddress) {
        setSavedIds([]);
        return;
      }

      try {
        const response = await fetch(
          `/api/donor/saved-campaigns?walletAddress=${encodeURIComponent(walletAddress)}`,
          { cache: "no-store" },
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message ?? "Unable to load saved campaigns.");
        }

        if (isMounted) {
          setSavedIds(Array.isArray(result.campaignIds) ? result.campaignIds : []);
        }
      } catch (error) {
        if (isMounted) {
          setSavedIds([]);
          setSavedLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load saved campaigns.",
          );
        }
      }
    }

    loadSavedCampaigns();

    return () => {
      isMounted = false;
    };
  }, [walletAddress]);

  function clearFilters() {
    setSearchTerm("");
    setUrgency("All");
    setLocation("All");
  }

  async function toggleSaved(campaignId: string) {
    if (!walletAddress || savingId) {
      return;
    }

    const isSaved = savedIds.includes(campaignId);
    const nextSavedIds = isSaved
      ? savedIds.filter((item) => item !== campaignId)
      : [...savedIds, campaignId];

    setSavingId(campaignId);
    setSavedLoadError("");
    setSavedIds(nextSavedIds);

    try {
      const response = await fetch("/api/donor/saved-campaigns", {
        method: isSaved ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress,
          campaignId,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Unable to update saved campaign.");
      }
    } catch (error) {
      setSavedIds(savedIds);
      setSavedLoadError(
        error instanceof Error
          ? error.message
          : "Unable to update saved campaign.",
      );
    } finally {
      setSavingId(null);
    }
  }

  const filteredCampaigns = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return campaigns.filter((campaign) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          campaign.title,
          campaign.shelter,
          campaign.location,
          campaign.story,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesUrgency = urgency === "All" || campaign.urgency === urgency;
      const matchesLocation = location === "All" || campaign.location === location;

      return matchesSearch && matchesUrgency && matchesLocation;
    });
  }, [location, searchTerm, urgency]);

  const sortedCampaigns = useMemo(() => {
    return [...filteredCampaigns].sort((first, second) => {
      if (sortBy === "Deadline soon") {
        return first.daysLeft - second.daysLeft;
      }

      if (sortBy === "Most progress") {
        return second.raised - first.raised;
      }

      if (sortBy === "Most donors") {
        return second.donors - first.donors;
      }

      return (
        (urgencyRank[first.urgency] ?? 9) - (urgencyRank[second.urgency] ?? 9)
      );
    });
  }, [filteredCampaigns, sortBy]);

  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedId);
  const shelterCampaigns = campaigns.filter(
    (campaign) => campaign.shelter === selectedCampaign?.shelter,
  );
  const otherShelterCampaigns = shelterCampaigns.filter(
    (campaign) => campaign.id !== selectedCampaign?.id,
  );
  const shelters = useMemo(() => getShelters(campaigns), [campaigns]);
  const locationOptions = useMemo(() => {
    const campaignLocations = campaigns.map((campaign) => campaign.location);
    const shelterLocations = shelters.map((shelter) => shelter.location);

    return ["All", ...Array.from(new Set([...campaignLocations, ...shelterLocations]))];
  }, [campaigns, shelters]);

  const filteredShelters = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return shelters.filter((shelter) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          shelter.name,
          shelter.location,
          shelter.story,
          ...shelter.campaigns.map((campaign) => campaign.title),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesLocation = location === "All" || shelter.location === location;
      const matchesUrgency =
        urgency === "All" ||
        shelter.campaigns.some((campaign) => campaign.urgency === urgency);

      return matchesSearch && matchesLocation && matchesUrgency;
    });
  }, [location, searchTerm, shelters, urgency]);

  const savedCampaigns = useMemo(() => {
    return sortedCampaigns.filter((campaign) => savedIds.includes(campaign.id));
  }, [savedIds, sortedCampaigns]);
  const activeCampaigns = useMemo(
    () => sortedCampaigns.filter((campaign) => campaign.status === "Active"),
    [sortedCampaigns],
  );
  const completedCampaigns = useMemo(
    () => sortedCampaigns.filter((campaign) => campaign.status === "Completed"),
    [sortedCampaigns],
  );
  const displayedCampaigns =
    activeTab === "Saved"
      ? savedCampaigns
      : activeTab === "Completed"
        ? completedCampaigns
        : activeCampaigns.length === 0 && campaigns.length > 0
          ? campaigns.filter((campaign) => campaign.status === "Active")
          : activeCampaigns;

  const sortedShelters = useMemo(() => {
    return [...filteredShelters].sort((first, second) => {
      if (sortBy === "Most progress") {
        const firstProgress = Math.max(...first.campaigns.map((item) => item.raised));
        const secondProgress = Math.max(...second.campaigns.map((item) => item.raised));
        return secondProgress - firstProgress;
      }

      if (sortBy === "Most donors") {
        const firstDonors = first.campaigns.reduce((total, item) => total + item.donors, 0);
        const secondDonors = second.campaigns.reduce((total, item) => total + item.donors, 0);
        return secondDonors - firstDonors;
      }

      if (sortBy === "Deadline soon") {
        const firstDeadline = Math.min(...first.campaigns.map((item) => item.daysLeft));
        const secondDeadline = Math.min(...second.campaigns.map((item) => item.daysLeft));
        return firstDeadline - secondDeadline;
      }

      const firstUrgency = Math.min(
        ...first.campaigns.map((item) => urgencyRank[item.urgency] ?? 9),
      );
      const secondUrgency = Math.min(
        ...second.campaigns.map((item) => urgencyRank[item.urgency] ?? 9),
      );
      return firstUrgency - secondUrgency;
    });
  }, [filteredShelters, sortBy]);

  const tabCounts: Record<(typeof tabs)[number], number> = {
    Campaigns: campaigns.filter((campaign) => campaign.status === "Active").length,
    Completed: campaigns.filter((campaign) => campaign.status === "Completed").length,
    Shelters: shelters.length,
    Saved: savedIds.length,
  };
  const emptyCampaignTitle =
    activeTab === "Saved"
      ? "No saved campaigns yet"
      : activeTab === "Completed"
        ? "No completed campaigns yet"
      : hasActiveFilters && campaigns.length > 0
        ? "No campaigns match these filters"
        : "No active campaigns found";
  const emptyCampaignMessage =
    activeTab === "Saved"
      ? "Tap the heart on a campaign to keep it in this list."
      : activeTab === "Completed"
        ? "Completed campaign records will appear here after milestone release is finished."
      : hasActiveFilters && campaigns.length > 0
        ? "Active campaigns are available, but the current search or filter selection is hiding them."
        : "No active campaigns are available yet. Check again after Admin approves a shelter campaign.";

  return (
    <div className="space-y-5">
      <section className="donor-tech-hero overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
        <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
              Browse & discover
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-stone-950 sm:text-3xl">
              Discover verified shelters and campaigns
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Compare active and completed campaigns, shelter profiles, and milestone plans
              before donating.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-orange-100 bg-orange-50/45 p-2.5">
            <div className="donor-tech-metric rounded-xl bg-white px-3 py-2.5 shadow-sm">
              <p className="text-sm font-black text-stone-950">
                {campaigns.length} total campaigns
              </p>
              <p className="text-xs font-semibold text-stone-500">
                Open for support
              </p>
            </div>
            <div className="donor-tech-metric rounded-xl bg-white px-3 py-2.5 shadow-sm">
              <p className="text-sm font-black text-stone-950">
                {shelters.length} total shelters
              </p>
              <p className="text-xs font-semibold text-stone-500">
                Verified profiles
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-orange-100 pt-5">
        <div className="mb-4 flex justify-end">
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              suppressHydrationWarning
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-semibold text-[var(--color-orange)] transition hover:border-[var(--color-orange)] hover:bg-orange-50"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M3 6h18" />
                <path d="M8 6v12" />
                <path d="M16 6v12" />
                <path d="M5 6l1 14h12l1-14" />
                <path d="M10 11h4" />
              </svg>
              Clear filters
            </button>
          ) : null}
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.4fr_0.75fr_0.75fr_0.75fr]">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Search shelters or campaigns
            </span>
            <div className="mt-2 flex h-10 items-center gap-3 rounded-xl border border-orange-100 bg-white px-3 transition focus-within:border-[var(--color-orange)] focus-within:ring-2 focus-within:ring-orange-100">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-slate-400"
                aria-hidden="true"
              >
                <path d="m21 21-4.3-4.3" />
                <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
              </svg>
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by shelter, campaign, story..."
                suppressHydrationWarning
                className="h-full min-w-0 flex-1 bg-transparent text-sm font-medium text-stone-800 outline-none placeholder:text-slate-400"
              />
            </div>
          </label>

          <SelectField
            label="Urgency"
            value={urgency}
            options={urgencies}
            onChange={setUrgency}
          />
          <SelectField
            label="Location"
            value={location}
            options={locationOptions.length > 1 ? locationOptions : locations}
            onChange={setLocation}
          />
          <SelectField
            label="Sort by"
            value={sortBy}
            options={sortOptions}
            onChange={setSortBy}
          />
        </div>
        {isLoadingCampaigns || campaignLoadError || savedLoadError ? (
          <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50/35 px-3 py-2 text-xs font-semibold text-stone-500">
            {isLoadingCampaigns
            ? "Loading campaigns..."
              : campaignLoadError || savedLoadError}
          </div>
        ) : null}
        </div>
        </div>
      </section>

      <section className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              suppressHydrationWarning
              className={[
                "rounded-full border px-4 py-2 text-sm font-black transition",
                activeTab === tab
                  ? "border-[var(--color-orange)] bg-[var(--color-orange)] text-white shadow-lg shadow-orange-200/70"
                  : "border-orange-100 bg-orange-50/60 text-stone-700 hover:bg-orange-100",
              ].join(" ")}
            >
              {tab} ({tabCounts[tab]})
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-orange)]">
              {activeTab === "Shelters"
                ? "All shelters"
                : activeTab === "Saved"
                  ? "Saved campaigns"
                  : "All campaigns"}
            </p>
            <h2 className="mt-1 text-xl font-black text-stone-950">
              {activeTab === "Shelters"
                ? "Browse verified shelter profiles"
                : activeTab === "Saved"
                  ? "Campaigns saved for later"
                  : "Browse available support needs"}
            </h2>
          </div>
        </div>

        {activeTab !== "Shelters" ? (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {isLoadingCampaigns ? (
              <div className="rounded-2xl border border-orange-100 bg-white p-6 text-center lg:col-span-2 xl:col-span-3">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-orange-100 border-t-[var(--color-orange)]" />
                <h2 className="mt-4 text-lg font-black text-stone-950">
                  Loading campaigns
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
                  Checking for campaigns approved by Admin.
                </p>
              </div>
            ) : campaignLoadError ? (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center lg:col-span-2 xl:col-span-3">
                <h2 className="text-lg font-black text-red-900">
                  Unable to load campaigns
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-red-700">
                  {campaignLoadError}
                </p>
              </div>
            ) : displayedCampaigns.length > 0 ? (
            displayedCampaigns.map((campaign) => (
              <article
                key={campaign.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(campaign.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedId(campaign.id);
                  }
                }}
                className={[
                  "donor-gradient-card cursor-pointer overflow-hidden rounded-2xl border bg-white p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-200",
                  selectedCampaign?.id === campaign.id
                    ? "border-[var(--color-orange)]"
                    : "border-orange-100",
                ].join(" ")}
              >
                <div className="relative">
                  <CampaignImage
                    imageClass={campaign.imageClass}
                    imageUrl={campaign.imageUrl}
                    size="compact"
                  />
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void toggleSaved(campaign.id);
                    }}
                    disabled={!walletAddress || savingId === campaign.id}
                    aria-label={
                      savedIds.includes(campaign.id)
                        ? "Remove saved campaign"
                        : "Save campaign"
                    }
                    title={
                      savedIds.includes(campaign.id)
                        ? "Remove saved campaign"
                        : "Save campaign"
                    }
                    suppressHydrationWarning
                    className={[
                      "absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border bg-white/95 shadow-sm backdrop-blur transition hover:scale-105",
                      savedIds.includes(campaign.id)
                        ? "border-orange-200 text-[var(--color-orange)]"
                        : "border-white text-stone-500 hover:text-[var(--color-orange)]",
                      !walletAddress || savingId === campaign.id
                        ? "cursor-not-allowed opacity-60"
                        : "",
                    ].join(" ")}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill={savedIds.includes(campaign.id) ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4.5 w-4.5"
                      aria-hidden="true"
                    >
                      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
                    </svg>
                  </button>
                </div>

                <div className="group/info rounded-b-2xl bg-white px-1 py-3 transition-all duration-300 md:hover:pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 text-base font-black leading-5 text-stone-950">
                        {campaign.title}
                      </h3>
                      <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs font-semibold text-[var(--color-orange)]">
                        <span className="truncate">{campaign.shelter}</span>
                        <span
                          className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-orange-100 text-[0.6rem] text-[var(--color-orange)] ring-1 ring-orange-200"
                          title="Verified shelter"
                          aria-label="Verified shelter"
                        >
                          ✓
                        </span>
                      </p>
                    </div>
                    <span
                      className={[
                        "shrink-0 rounded-full px-2.5 py-1 text-[0.68rem] font-semibold",
                        getUrgencyStyle(campaign.urgency),
                      ].join(" ")}
                    >
                      {campaign.urgency}
                    </span>
                  </div>

                  <p className="mt-2 line-clamp-2 text-sm leading-5 text-stone-600">
                    {campaign.story}
                  </p>

                  <div className="mt-3">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-lg font-black text-stone-950">
                          {formatEth(campaign.onChainTotalRaisedEth ?? 0)}
                        </p>
                        <p className="text-xs font-semibold text-stone-500">
                          raised of {campaign.goal}
                        </p>
                      </div>
                      <p className="text-sm font-black text-[var(--color-orange)]">
                        {campaign.raised}%
                      </p>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-orange-100">
                      <div
                        className="donor-progress-fill h-full rounded-full bg-[var(--color-orange)]"
                        style={{ width: `${campaign.raised}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl bg-orange-50/45 px-3 py-2">
                      <p className="font-black text-stone-950">{campaign.donors}</p>
                      <p className="text-xs font-medium text-stone-500">Donors</p>
                    </div>
                    <div className="rounded-xl bg-orange-50/45 px-3 py-2">
                      <p className="font-black text-stone-950">
                        {campaign.status === "Completed"
                          ? "Completed"
                          : `${campaign.daysLeft} days`}
                      </p>
                      <p className="text-xs font-medium text-stone-500">
                        Remaining
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
                    {campaign.contractAddress ? (
                      <>
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">
                          Blockchain Verified
                        </span>
                        <span className="rounded-full border border-orange-100 bg-orange-50 px-2.5 py-1 font-mono text-[var(--color-orange)]">
                          {shortAddress(campaign.contractAddress)}
                        </span>
                      </>
                    ) : (
                      <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-stone-500">
                        Contract pending
                      </span>
                    )}
                  </div>

                  {campaign.status === "Active" ? (
                    <Link
                      href={`/Donor/donate?campaign=${campaign.id}`}
                      onClick={(event) => event.stopPropagation()}
                      className="mt-3 inline-flex w-full translate-y-0 items-center justify-center rounded-xl bg-[var(--color-orange)] px-4 py-2.5 text-sm font-semibold text-white opacity-100 shadow-sm transition duration-300 hover:bg-orange-600 md:max-h-0 md:-translate-y-1 md:overflow-hidden md:py-0 md:opacity-0 md:group-hover/info:max-h-12 md:group-hover/info:translate-y-0 md:group-hover/info:py-2.5 md:group-hover/info:opacity-100"
                    >
                      Donate Now
                    </Link>
                  ) : null}
                </div>
              </article>
            ))
            ) : (
            <div className="rounded-2xl border border-dashed border-orange-200 bg-white p-6 text-center lg:col-span-2 xl:col-span-3">
              <h2 className="text-xl font-black text-stone-950">
                {emptyCampaignTitle}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
                {emptyCampaignMessage}
              </p>
              {campaigns.length > 0 && activeTab !== "Campaigns" ? (
                <button
                  type="button"
                  onClick={() => setActiveTab("Campaigns")}
                  suppressHydrationWarning
                  className="mt-4 inline-flex items-center justify-center rounded-xl bg-[var(--color-orange)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
                >
                  Show active campaigns
                </button>
              ) : null}
              {campaigns.length > 0 && hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  suppressHydrationWarning
                  className="mt-4 inline-flex items-center justify-center rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-orange)] transition hover:border-[var(--color-orange)] hover:bg-orange-50"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {sortedShelters.length > 0 ? (
              sortedShelters.map((shelter) => (
                <article
                  key={shelter.name}
                  className="donor-gradient-card grid gap-4 rounded-2xl border border-orange-100 bg-white p-3 shadow-sm transition hover:border-orange-200 lg:grid-cols-[14rem_1fr]"
                >
                  <CampaignImage
                    imageClass={shelter.imageClass}
                    imageUrl={shelter.imageUrl}
                  />

                  <div className="min-w-0">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <Link
                          href={`/Donor/shelters/${shelter.id}`}
                          className="flex items-center gap-1.5 text-lg font-black text-stone-950 transition hover:text-[var(--color-orange)]"
                        >
                          <span>{shelter.name}</span>
                        </Link>
                        <p className="mt-1 text-sm font-medium text-stone-500">
                          {shelter.location}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-fit rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-[var(--color-orange)]">
                          {shelter.campaigns.length} campaigns
                        </span>
                        <Link
                          href={`/Donor/shelters/${shelter.id}`}
                          aria-label={`View ${shelter.name} profile`}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-orange-200 bg-white text-[var(--color-orange)] transition hover:border-[var(--color-orange)] hover:bg-orange-50"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4"
                            aria-hidden="true"
                          >
                            <path d="M5 12h14" />
                            <path d="m13 6 6 6-6 6" />
                          </svg>
                        </Link>
                      </div>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-stone-600">
                      {shelter.story}
                    </p>

                    <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                      <div className="rounded-xl bg-orange-50/50 p-3">
                        <p className="font-semibold text-stone-950">
                          {shelter.verifiedSince}
                        </p>
                        <p className="text-xs font-medium text-stone-500">
                          Verified
                        </p>
                      </div>
                      <div className="rounded-xl bg-orange-50/50 p-3">
                        <p className="font-semibold text-stone-950">
                          {shelter.animalsHelped}
                        </p>
                        <p className="text-xs font-medium text-stone-500">
                          Helped
                        </p>
                      </div>
                      <div className="rounded-xl bg-orange-50/50 p-3">
                        <p className="font-semibold text-stone-950">
                          {shelter.campaigns.length}
                        </p>
                        <p className="text-xs font-medium text-stone-500">
                          Campaigns
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-orange-100 p-3">
                      <p className="text-sm font-semibold text-stone-950">
                        Ongoing campaigns
                      </p>
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        {shelter.campaigns.map((campaign) => (
                          <button
                            key={campaign.id}
                            type="button"
                            onClick={() => {
                              setSelectedId(campaign.id);
                              setActiveTab("Campaigns");
                            }}
                            suppressHydrationWarning
                            className="w-full rounded-xl bg-orange-50/60 p-2 text-left transition hover:bg-orange-100/70"
                          >
                            <p className="text-sm font-semibold text-stone-950">
                              {campaign.title}
                            </p>
                            <p className="mt-1 text-xs font-medium text-stone-500">
                              {campaign.raised}% raised - {campaign.status}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-orange-200 bg-white p-6 text-center lg:col-span-2 xl:col-span-3">
                <h2 className="text-xl font-black text-stone-950">
                  No shelters found
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
                  Try another search term or adjust the filters to discover more verified shelters.
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {selectedCampaign ? (
        <div className="fixed inset-0 z-[120] overflow-y-auto bg-stone-950/45 p-4 backdrop-blur-sm sm:p-6">
          <div className="mx-auto max-w-5xl rounded-2xl bg-white p-4 shadow-[0_24px_80px_rgba(0,0,0,0.22)] sm:p-5">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
                  Campaign details
                </p>
                <h2 className="mt-1 text-xl font-black text-stone-950 sm:text-2xl">
                  {selectedCampaign.title}
                </h2>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-orange)]">
                  <span>
                    {selectedCampaign.shelter} - {selectedCampaign.location}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                suppressHydrationWarning
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-orange-50 hover:text-[var(--color-orange)]"
              >
                <span className="sr-only">Close campaign details</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12" />
                  <path d="M18 6 6 18" />
                </svg>
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <CampaignImage
                imageClass={selectedCampaign.imageClass}
                imageUrl={selectedCampaign.imageUrl}
                size="hero"
              />

              <div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={[
                      "rounded-full px-3 py-1 text-xs font-semibold",
                      getUrgencyStyle(selectedCampaign.urgency),
                    ].join(" ")}
                  >
                    {selectedCampaign.urgency}
                  </span>
                  <span
                    className={[
                      "rounded-full px-3 py-1 text-xs font-semibold",
                      getStatusStyle(selectedCampaign.status),
                    ].join(" ")}
                  >
                    {selectedCampaign.status}
                  </span>
                  {selectedCampaign.deploymentTxHash &&
                  getTransactionExplorerUrl(selectedCampaign.deploymentTxHash) ? (
                    <a
                      href={getTransactionExplorerUrl(
                        selectedCampaign.deploymentTxHash,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-black text-[var(--color-orange)] transition hover:border-[var(--color-orange)] hover:bg-orange-100"
                    >
                      Campaign tx: {shortHash(selectedCampaign.deploymentTxHash)}
                    </a>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-2 rounded-xl border border-orange-100 bg-orange-50/25 p-3 text-xs font-semibold text-stone-600 sm:grid-cols-2">
                  <span>RoleNFT shelter verification</span>
                  <span>{getExplorerNetworkName()}</span>
                  <span>
                    {selectedCampaign.contractAddress &&
                    getAddressExplorerUrl(selectedCampaign.contractAddress) ? (
                      <a
                        href={getAddressExplorerUrl(selectedCampaign.contractAddress)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--color-orange)] transition hover:text-stone-950"
                      >
                        Contract {shortAddress(selectedCampaign.contractAddress)}
                      </a>
                    ) : (
                      "Contract pending"
                    )}
                  </span>
                  <span>Milestone-gated release rules</span>
                </div>

                <p className="mt-4 text-sm leading-7 text-stone-600">
                  {selectedCampaign.story}
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-orange-50/70 p-3">
                    <p className="font-black text-stone-950">
                      {selectedCampaign.verifiedSince}
                    </p>
                    <p className="text-xs font-medium text-stone-500">Verified</p>
                  </div>
                  <div className="rounded-2xl bg-orange-50/70 p-3">
                    <p className="font-black text-stone-950">
                      {selectedCampaign.animalsHelped}
                    </p>
                    <p className="text-xs font-medium text-stone-500">
                      Animals helped
                    </p>
                  </div>
                  <div className="rounded-2xl bg-orange-50/70 p-3">
                    <p className="font-black text-stone-950">
                      {shelterCampaigns.length}
                    </p>
                    <p className="text-xs font-medium text-stone-500">
                      Shelter campaigns
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-orange-50/70 p-3">
                    <p className="font-black text-stone-950">
                      {selectedCampaign.duration}
                    </p>
                    <p className="text-xs font-medium text-stone-500">
                      Campaign duration
                    </p>
                  </div>
                  <div className="rounded-2xl bg-orange-50/70 p-3">
                    <p className="font-black text-stone-950">
                      {selectedCampaign.goal}
                    </p>
                    <p className="text-xs font-medium text-stone-500">
                      Funding goal
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs font-semibold text-stone-500">
                    <span>Funding progress</span>
                    <span>
                      {selectedCampaign.raised}% of {selectedCampaign.goal}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-orange-100">
                    <div
                      className="donor-progress-fill h-full rounded-full bg-[var(--color-orange)]"
                      style={{ width: `${selectedCampaign.raised}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs font-medium text-stone-500">
                    Next milestone: {selectedCampaign.milestones[0].title} (
                    {selectedCampaign.milestones[0].percentage}% release)
                  </p>
                  <p className="mt-1 text-xs font-semibold text-stone-500">
                    Stage amount:{" "}
                    {formatMyr(
                      getMilestoneAmount(
                        selectedCampaign.goalAmount,
                        selectedCampaign.milestones[0].percentage,
                      ),
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-orange-100 p-4 lg:col-span-2">
                <p className="text-sm font-semibold text-stone-950">
                  Campaign usage plan
                </p>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  {selectedCampaign.campaignDetails}
                </p>
              </div>

              <div className="rounded-xl border border-orange-100 p-4">
                <p className="text-sm font-semibold text-stone-950">
                  Shelter profile
                </p>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  Verified shelter based in {selectedCampaign.location}.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-orange-100 p-4">
              <p className="text-sm font-semibold text-stone-950">
                Milestone plan
              </p>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {(selectedCampaign.milestoneDetails ??
                  selectedCampaign.milestones.map((milestone) => ({
                    ...milestone,
                    proofTxHash: null,
                    reviewTxHash: null,
                    releaseTxHash: null,
                  }))).map((milestone, index) => (
                  <div
                    key={milestone.title}
                    className="rounded-xl bg-orange-50/40 p-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-white text-xs font-black text-[var(--color-orange)]">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-stone-700">
                          {milestone.title}
                        </p>
                        <p className="text-xs font-semibold text-[var(--color-orange)]">
                          {milestone.percentage}% release
                        </p>
                        <p className="text-xs font-semibold text-stone-500">
                          Stage:{" "}
                          {formatMyr(
                            getMilestoneAmount(
                              selectedCampaign.goalAmount,
                              milestone.percentage,
                            ),
                          )}
                        </p>
                        <p className="text-xs font-semibold text-stone-500">
                          Cumulative:{" "}
                          {formatMyr(
                            getMilestoneAmount(
                              selectedCampaign.goalAmount,
                              getCumulativeMilestonePercentage(
                                selectedCampaign.milestones,
                                index,
                              ),
                            ),
                          )}
                        </p>
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
                ))}
              </div>
            </div>

            {otherShelterCampaigns.length > 0 ? (
              <div className="mt-4 rounded-xl border border-orange-100 p-4">
                <p className="text-sm font-semibold text-stone-950">
                  Other campaigns by this shelter
                </p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {otherShelterCampaigns.map((campaign) => (
                    <button
                      key={campaign.id}
                      type="button"
                      onClick={() => setSelectedId(campaign.id)}
                      suppressHydrationWarning
                      className="rounded-xl bg-orange-50/40 p-3 text-left transition hover:bg-orange-100/70"
                    >
                      <p className="text-sm font-semibold text-stone-950">
                        {campaign.title}
                      </p>
                      <p className="mt-1 text-xs font-medium text-stone-500">
                        {campaign.raised}% raised
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Link
                href={`/Donor/help?type=report&campaign=${selectedCampaign.id}`}
                className="inline-flex items-center justify-center rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-900 transition hover:border-[var(--color-orange)] hover:bg-orange-50"
              >
                Report concern
              </Link>
              {selectedCampaign.status === "Active" ? (
                <Link
                  href={`/Donor/donate?campaign=${selectedCampaign.id}`}
                  className="inline-flex items-center justify-center rounded-xl bg-[var(--color-orange)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
                >
                  Donate to this campaign
                </Link>
              ) : (
                <Link
                  href={`/Donor/campaigns/${selectedCampaign.id}`}
                  className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
                >
                  View completed record
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
