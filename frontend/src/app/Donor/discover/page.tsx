"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { getShelters, type Campaign } from "../campaignData";
import {
  getAddressExplorerUrl,
  getExplorerNetworkName,
  getTransactionExplorerUrl,
  shortAddress,
} from "@/lib/block-explorer";
import { TransactionLinks } from "@/app/components/TransactionLinks";
import { useEthMyrRate } from "@/lib/use-eth-myr-rate";

type DonorCampaign = Campaign & {
  imageUrl?: string | null;
  source?: "supabase";
  goalAmount?: number;
  onChainGoalEth?: number;
  onChainTotalRaisedEth?: number;
  currentMilestoneIndex?: number;
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

type MilestoneDisplay = {
  title: string;
  percentage: number;
  proofTxHash?: string | null;
  reviewTxHash?: string | null;
  releaseTxHash?: string | null;
};

const urgencies = ["All", "Critical", "High", "Medium"];
const sortOptions = ["Most urgent", "Deadline soon", "Most progress", "Most donors"];
const tabs = ["Campaigns", "Completed", "Closed", "Shelters", "Saved"] as const;
const tabDesign: Record<(typeof tabs)[number], { icon: string; active: string; inactive: string }> = {
  Campaigns: { icon: "M4 19V9l8-5 8 5v10H4Zm5 0v-6h6v6", active: "border-orange-400 bg-orange-100 text-orange-800 shadow-orange-100", inactive: "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100" },
  Completed: { icon: "M5 12.5 10 17l9-10", active: "border-emerald-400 bg-emerald-100 text-emerald-800 shadow-emerald-100", inactive: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" },
  Closed: { icon: "M7 11V8a5 5 0 0 1 10 0v3M6 11h12v10H6z", active: "border-stone-500 bg-stone-200 text-stone-800 shadow-stone-100", inactive: "border-stone-300 bg-stone-100 text-stone-700 hover:bg-stone-200" },
  Shelters: { icon: "M3 11 12 4l9 7M5 10v10h14V10M9 20v-6h6v6", active: "border-violet-400 bg-violet-100 text-violet-800 shadow-violet-100", inactive: "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100" },
  Saved: { icon: "M20.8 5.8a5.5 5.5 0 0 0-7.8 0L12 6.8l-1-1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z", active: "border-rose-400 bg-rose-100 text-rose-800 shadow-rose-100", inactive: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100" },
};
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

function formatApproxMyr(value: number, isLive: boolean) {
  return `${isLive ? "Approx. live" : "Approx."} ${formatMyr(value)}`;
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

function getCampaignMilestoneItems(
  campaign: DonorCampaign | null | undefined,
): MilestoneDisplay[] {
  if (!campaign) {
    return [];
  }

  return (
    campaign.milestoneDetails ??
    campaign.milestones.map((milestone) => ({
      ...milestone,
      proofTxHash: null,
      reviewTxHash: null,
      releaseTxHash: null,
    }))
  );
}

function getMilestoneDisplayAmount(campaign: DonorCampaign, percentage: number) {
  return typeof campaign.onChainGoalEth === "number"
    ? formatEth((campaign.onChainGoalEth * Number(percentage || 0)) / 100)
    : formatMyr(getMilestoneAmount(campaign.goalAmount, percentage));
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

function shortHash(value: string) {
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

function CampaignImage({
  imageClass,
  imageUrl,
  size = "card",
  rounded = true,
}: {
  imageClass: string;
  imageUrl?: string | null;
  size?: "compact" | "card" | "hero";
  rounded?: boolean;
}) {
  const imageHeight =
    size === "hero"
      ? "h-72 sm:h-80 lg:h-[29rem]"
      : size === "compact"
        ? "h-[8.5rem] sm:h-36"
        : "h-44 sm:h-48";

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className={[
          "w-full object-cover",
          rounded ? "rounded-xl" : "",
          imageHeight,
        ].join(" ")}
      />
    );
  }

  return (
    <div
      className={[
        "relative overflow-hidden bg-gradient-to-br",
        rounded ? "rounded-xl" : "",
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
  const { rate: ethMyrRate, source: ethMyrRateSource } = useEthMyrRate();
  const searchParams = useSearchParams();
  const walletAddress = searchParams.get("walletAddress") ?? "";
  const [campaigns, setCampaigns] = useState<DonorCampaign[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);
  const [campaignLoadError, setCampaignLoadError] = useState("");
  const [savedLoadError, setSavedLoadError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [actionToast, setActionToast] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [urgency, setUrgency] = useState("All");
  const [sortBy, setSortBy] = useState(sortOptions[0]);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Campaigns");
  const [isModalMounted, setIsModalMounted] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get("campaign"),
  );
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const modalPanelRef = useRef<HTMLDivElement | null>(null);
  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    urgency !== "All";

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

  useEffect(() => {
    if (!actionToast) return;
    const timer = window.setTimeout(() => setActionToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [actionToast]);

  function clearFilters() {
    setSearchTerm("");
    setUrgency("All");
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

      setActionToast(
        isSaved ? "Campaign removed from saved list." : "Campaign saved.",
      );
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
          campaign.story,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesUrgency = urgency === "All" || campaign.urgency === urgency;
      return matchesSearch && matchesUrgency;
    });
  }, [searchTerm, urgency]);

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
  const filteredShelters = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return shelters.filter((shelter) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          shelter.name,
          shelter.story,
          ...shelter.campaigns.map((campaign) => campaign.title),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesUrgency =
        urgency === "All" ||
        shelter.campaigns.some((campaign) => campaign.urgency === urgency);

      return matchesSearch && matchesUrgency;
    });
  }, [searchTerm, shelters, urgency]);

  const savedCampaigns = useMemo(() => {
    return sortedCampaigns.filter((campaign) => savedIds.includes(campaign.id));
  }, [savedIds, sortedCampaigns]);

  useEffect(() => {
    setIsModalMounted(true);
  }, []);

  useEffect(() => {
    if (!selectedCampaign) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.documentElement.style.overflow = "hidden";

    window.requestAnimationFrame(() => {
      if (modalPanelRef.current) {
        modalPanelRef.current.scrollTop = 0;
      }
    });
    const resetTimer = window.setTimeout(() => {
      if (modalPanelRef.current) {
        modalPanelRef.current.scrollTop = 0;
      }
    }, 80);

    return () => {
      window.clearTimeout(resetTimer);
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [selectedCampaign]);
  const activeCampaigns = useMemo(
    () => sortedCampaigns.filter((campaign) => campaign.status === "Active"),
    [sortedCampaigns],
  );
  const completedCampaigns = useMemo(
    () => sortedCampaigns.filter((campaign) => campaign.status === "Completed"),
    [sortedCampaigns],
  );
  const closedCampaigns = useMemo(
    () => sortedCampaigns.filter((campaign) => campaign.status === "Closed"),
    [sortedCampaigns],
  );
  const displayedCampaigns =
    activeTab === "Saved"
      ? savedCampaigns
      : activeTab === "Completed"
        ? completedCampaigns
        : activeTab === "Closed"
          ? closedCampaigns
          : activeCampaigns.length === 0 && campaigns.length > 0
            ? campaigns.filter((campaign) => campaign.status === "Active")
            : activeCampaigns;
  const selectedMilestones = getCampaignMilestoneItems(selectedCampaign);
  const selectedCurrentMilestoneIndex = getCurrentMilestoneIndex(
    selectedMilestones,
    selectedCampaign?.raised ?? 0,
    selectedCampaign?.status ?? "",
    selectedCampaign?.currentMilestoneIndex,
  );
  const selectedCurrentMilestone =
    selectedCurrentMilestoneIndex >= 0
      ? selectedMilestones[selectedCurrentMilestoneIndex]
      : null;
  const selectedProgressWidth = Math.min(
    100,
    Math.max(0, selectedCampaign?.raised ?? 0),
  );

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
    Closed: campaigns.filter((campaign) => campaign.status === "Closed").length,
    Shelters: shelters.length,
    Saved: savedIds.length,
  };
  const openCampaignCount = tabCounts.Campaigns;
  const emptyCampaignTitle =
    activeTab === "Saved"
      ? "No saved campaigns yet"
      : activeTab === "Completed"
        ? "No completed campaigns yet"
      : activeTab === "Closed"
        ? "No closed campaigns yet"
      : hasActiveFilters && campaigns.length > 0
        ? "No campaigns match these filters"
        : "No active campaigns found";
  const emptyCampaignMessage =
    activeTab === "Saved"
      ? "Tap the heart on a campaign to keep it in this list."
      : activeTab === "Completed"
        ? "Completed campaign records will appear here after milestone release is finished."
      : activeTab === "Closed"
        ? "Closed campaigns will appear here after refund or closure actions."
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
                {openCampaignCount} open campaigns
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
        <div className="rounded-2xl border border-orange-100 bg-[linear-gradient(120deg,rgba(255,247,237,0.8),rgba(255,255,255,0.98))] p-4">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">Refine results</p>
            <p className="mt-1 text-xs font-semibold text-stone-500">Search, prioritize urgency, or change the result order.</p>
          </div>
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
        <div className="grid gap-4 md:grid-cols-[1.5fr_0.75fr_0.75fr] md:items-end">
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
            label="Sort by"
            value={sortBy}
            options={sortOptions}
            onChange={setSortBy}
          />
        </div>
        <div className="mt-4 border-t border-orange-100 pt-4">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const selected = activeTab === tab;
              const design = tabDesign[tab];
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  suppressHydrationWarning
                  className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-black shadow-sm transition hover:-translate-y-0.5 ${selected ? `${design.active} ring-2 ring-current/10` : design.inactive}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                    <path d={design.icon} />
                  </svg>
                  <span>{tab}</span>
                  <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] text-current">
                    {tabCounts[tab]}
                  </span>
                </button>
              );
            })}
          </div>
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
          <div className="grid auto-rows-fr items-stretch justify-items-center gap-3 lg:grid-cols-2 xl:grid-cols-3">
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
                  "group/card donor-gradient-card relative flex h-full w-full [zoom:0.88] cursor-pointer flex-col overflow-hidden rounded-2xl border border-orange-100 bg-transparent shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-200",
                  selectedCampaign?.id === campaign.id
                    ? "ring-2 ring-[var(--color-orange)]"
                    : "",
                ].join(" ")}
              >
                <div className="relative h-40 shrink-0 overflow-hidden transition-[height] duration-500 ease-in-out group-hover/card:h-[6.75rem] group-focus-within/card:h-[6.75rem] motion-reduce:transition-none sm:h-44 sm:group-hover/card:h-[7.75rem] sm:group-focus-within/card:h-[7.75rem]">
                  <CampaignImage
                    imageClass={campaign.imageClass}
                    imageUrl={campaign.imageUrl}
                    size="card"
                    rounded={false}
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

                <div className="group/info relative z-10 -mt-3 flex flex-1 flex-col rounded-2xl border border-orange-100 bg-white px-3 pb-2 pt-4 transition-colors group-hover/card:border-orange-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 min-h-10 text-base font-black leading-5 text-stone-950">
                        {campaign.title}
                      </h3>
                      <Link
                        href={`/Donor/shelters/${campaign.shelterId}`}
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                        className="mt-1 inline-flex max-w-full items-center gap-1.5 text-xs font-black text-[var(--color-orange)] transition hover:text-orange-700 hover:underline"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
                          <path d="M3 11 12 4l9 7M5 10v10h14V10M9 20v-6h6v6" />
                        </svg>
                        <span className="truncate">{campaign.shelter}</span>
                      </Link>
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

                  <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-stone-600">
                    {campaign.story}
                  </p>

                  <div className="mt-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-orange-100 bg-orange-50/40 px-3 py-2.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-orange-700">Raised</p>
                        <p className="mt-1 text-base font-black text-stone-950">
                          {formatEth(campaign.onChainTotalRaisedEth ?? 0)}
                        </p>
                        <p className="mt-0.5 text-[10px] font-semibold leading-4 text-stone-500">
                          {formatApproxMyr(
                            (campaign.onChainTotalRaisedEth ?? 0) * ethMyrRate,
                            ethMyrRateSource === "coingecko",
                          )}
                        </p>
                      </div>
                      <div className="rounded-xl border border-violet-100 bg-violet-50/40 px-3 py-2.5 text-right">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-violet-700">Goal</p>
                        <p className="mt-1 text-base font-black text-stone-950">
                          {typeof campaign.onChainGoalEth === "number"
                            ? formatEth(campaign.onChainGoalEth)
                            : campaign.goal}
                        </p>
                        {typeof campaign.onChainGoalEth === "number" ? (
                          <p className="mt-0.5 text-[10px] font-semibold leading-4 text-stone-500">
                            {formatApproxMyr(
                              campaign.onChainGoalEth * ethMyrRate,
                              ethMyrRateSource === "coingecko",
                            )}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400">Campaign funding</p>
                      <p className="text-sm font-black text-[var(--color-orange)]">
                        {campaign.raised}%
                      </p>
                    </div>
                    <div className="relative mt-3 h-2 rounded-full bg-orange-100">
                      <div
                        className="donor-progress-fill h-full rounded-full bg-[var(--color-orange)]"
                        style={{ width: `${Math.min(100, Math.max(0, campaign.raised))}%` }}
                      />
                      {campaign.raised > 0 ? (
                        <span
                          className="absolute top-1/2 grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-[var(--color-orange)] text-white shadow-[0_3px_10px_rgba(249,115,22,0.35)] transition-[left] duration-700"
                          style={{ left: `${Math.min(98, Math.max(2, campaign.raised))}%` }}
                          title={`${campaign.raised}% of the campaign goal reached`}
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
                            <circle cx="7.5" cy="7" r="2.2" />
                            <circle cx="16.5" cy="7" r="2.2" />
                            <circle cx="4.8" cy="12" r="1.8" />
                            <circle cx="19.2" cy="12" r="1.8" />
                            <path d="M12 10.2c-3.4 0-6 2.8-6 5.5 0 2.1 1.7 3.5 3.7 3.5.9 0 1.6-.4 2.3-.4s1.4.4 2.3.4c2 0 3.7-1.4 3.7-3.5 0-2.7-2.6-5.5-6-5.5Z" />
                          </svg>
                        </span>
                      ) : null}
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

                  <div className="mt-3 overflow-hidden rounded-xl border border-violet-100 bg-violet-50/35 p-2.5">
                    {campaign.contractAddress ? (
                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={getAddressExplorerUrl(campaign.contractAddress)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          title="View campaign funds and contract activity"
                          className="min-w-0 rounded-lg border border-violet-200 bg-white px-2.5 py-2 shadow-sm transition hover:border-violet-400 hover:bg-violet-50"
                        >
                          <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-violet-700">Contract address</span>
                          <span className="mt-1 flex items-center justify-between gap-1 font-mono text-[10px] font-black text-stone-800">
                            <span className="truncate">{shortAddress(campaign.contractAddress)}</span>
                            <span className="text-violet-600" aria-hidden="true">↗</span>
                          </span>
                        </a>
                        {campaign.deploymentTxHash && getTransactionExplorerUrl(campaign.deploymentTxHash) ? (
                          <a
                            href={getTransactionExplorerUrl(campaign.deploymentTxHash)}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(event) => event.stopPropagation()}
                            title={`View when this contract was created: ${shortHash(campaign.deploymentTxHash)}`}
                            className="min-w-0 rounded-lg border border-orange-200 bg-white px-2.5 py-2 shadow-sm transition hover:border-orange-400 hover:bg-orange-50"
                          >
                            <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-orange-700">Deployment TX</span>
                            <span className="mt-1 flex items-center justify-between gap-1 font-mono text-[10px] font-black text-stone-800">
                              <span className="truncate">{shortAddress(campaign.deploymentTxHash)}</span>
                              <span className="text-orange-600" aria-hidden="true">↗</span>
                            </span>
                          </a>
                        ) : (
                          <div className="rounded-lg border border-stone-200 bg-white px-2.5 py-2">
                            <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-stone-500">Deployment TX</span>
                            <span className="mt-1 block text-[10px] font-semibold text-stone-400">Unavailable</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-stone-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
                        Contract deployment pending
                      </div>
                    )}
                  </div>

                  <div className="mt-auto h-0 overflow-hidden pt-0 opacity-0 transition-[height,padding,opacity] duration-500 ease-in-out group-hover/card:h-[52px] group-hover/card:pt-3 group-hover/card:opacity-100 group-focus-within/card:h-[52px] group-focus-within/card:pt-3 group-focus-within/card:opacity-100 motion-reduce:transition-none">
                    {campaign.status === "Active" ? (
                      <Link
                        href={`/Donor/donate?campaign=${campaign.id}`}
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--color-orange)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600"
                      > 
                        Donate Now
                      </Link>
                    ) : null}
                  </div>
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

      {isModalMounted && selectedCampaign ? createPortal((
        <div className="fixed inset-x-0 bottom-0 top-16 z-[900] flex items-stretch justify-center overflow-hidden bg-stone-950/50 px-3 py-3 backdrop-blur-md sm:px-6 sm:py-5">
          <div
            className="animate-fade-up flex h-full min-h-0 w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-[0_28px_90px_rgba(0,0,0,0.26)]"
          >
            <div className="shrink-0 flex items-start justify-between gap-4 border-b border-orange-100 bg-white/95 p-4 backdrop-blur-xl sm:p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">
                  Campaign details
                </p>
                <h2 className="mt-1 line-clamp-1 text-xl font-black text-stone-950 sm:text-2xl">
                  {selectedCampaign.title}
                </h2>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-orange)]">
                  <span>
                    {selectedCampaign.shelter}
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

            <div
              ref={modalPanelRef}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth pb-6"
            >
            <div className="grid items-start gap-5 p-4 sm:p-5 lg:grid-cols-[1fr_1.1fr]">
              <div className="self-start overflow-hidden rounded-3xl bg-white">
                <CampaignImage
                  imageClass={selectedCampaign.imageClass}
                  imageUrl={selectedCampaign.imageUrl}
                  size="hero"
                />
                {selectedCampaign.deploymentTxHash &&
                getTransactionExplorerUrl(selectedCampaign.deploymentTxHash) ? (
                  <a
                    href={getTransactionExplorerUrl(
                      selectedCampaign.deploymentTxHash,
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="mx-auto mt-3 flex w-fit items-center justify-center gap-2 rounded-full bg-stone-100 px-4 py-2 text-sm font-black text-stone-700 transition hover:-translate-y-0.5 hover:bg-stone-200 hover:text-stone-950"
                  >
                    <span className="text-stone-500">Campaign tx:</span>
                    <span>{shortHash(selectedCampaign.deploymentTxHash)}</span>
                  </a>
                ) : null}
              </div>

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
                </div>
                <p className="mt-4 text-sm leading-7 text-stone-600">
                  {selectedCampaign.story}
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="donor-tech-metric rounded-2xl bg-orange-50/70 p-3 shadow-sm">
                    <p className="font-black text-stone-950">
                      {selectedCampaign.verifiedSince}
                    </p>
                    <p className="text-xs font-medium text-stone-500">Verified</p>
                  </div>
                  <div className="donor-tech-metric rounded-2xl bg-orange-50/70 p-3 shadow-sm">
                    <p className="font-black text-stone-950">
                      {selectedCampaign.animalsHelped}
                    </p>
                    <p className="text-xs font-medium text-stone-500">
                      Animals helped
                    </p>
                  </div>
                  <div className="donor-tech-metric rounded-2xl bg-orange-50/70 p-3 shadow-sm">
                    <p className="font-black text-stone-950">
                      {shelterCampaigns.length}
                    </p>
                    <p className="text-xs font-medium text-stone-500">
                      Shelter campaigns
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="donor-tech-metric rounded-2xl bg-orange-50/70 p-3 shadow-sm">
                    <p className="font-black text-stone-950">
                      {selectedCampaign.duration}
                    </p>
                    <p className="text-xs font-medium text-stone-500">
                      Campaign duration
                    </p>
                  </div>
                  <div className="donor-tech-metric rounded-2xl bg-orange-50/70 p-3 shadow-sm">
                    <p className="font-black text-stone-950">
                      {selectedCampaign.goal}
                    </p>
                    <p className="text-xs font-medium text-stone-500">
                      Funding goal
                    </p>
                  </div>
                </div>

                <div className="donor-donate-card mt-5 rounded-2xl border border-orange-100 p-4 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-black text-stone-500">
                    <span className="uppercase tracking-[0.14em]">
                      Funding progress
                    </span>
                    <span>
                      {selectedCampaign.raised}% of {selectedCampaign.goal}
                    </span>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-orange-100">
                    <div
                      className="donor-progress-fill h-full rounded-full bg-[var(--color-orange)]"
                      style={{ width: `${selectedProgressWidth}%` }}
                    />
                  </div>
                  {selectedCurrentMilestone ? (
                    <>
                      <p className="mt-3 text-xs font-bold text-stone-600">
                        {selectedCampaign.status === "Completed"
                          ? "Final milestone"
                          : "Current milestone"}
                        : {selectedCurrentMilestone.title} (
                        {selectedCurrentMilestone.percentage}% release)
                      </p>
                      <p className="mt-1 text-xs font-semibold text-stone-500">
                        Stage amount:{" "}
                        {getMilestoneDisplayAmount(
                          selectedCampaign,
                          selectedCurrentMilestone.percentage,
                        )}
                      </p>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mx-4 mt-1 grid gap-4 sm:mx-5 lg:grid-cols-3">
              <div className="donor-ledger-row rounded-2xl border border-orange-100 p-4 shadow-sm lg:col-span-2">
                <p className="text-sm font-semibold text-stone-950">
                  Campaign usage plan
                </p>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  {selectedCampaign.campaignDetails}
                </p>
              </div>

              <div className="donor-ledger-row rounded-2xl border border-orange-100 p-4 shadow-sm">
                <p className="text-sm font-semibold text-stone-950">
                  Shelter profile
                </p>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  Verified shelter on PawChain.
                </p>
              </div>
            </div>

            <div className="mx-4 mt-4 rounded-2xl border border-orange-100 bg-white/90 p-4 shadow-sm sm:mx-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">
                Milestone plan
              </p>
              <p className="mt-1 text-lg font-black text-stone-950">
                Transparent release stages
              </p>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {selectedMilestones.map((milestone, index) => {
                  const fundingState = getMilestoneFundingState(
                    selectedMilestones,
                    index,
                    selectedCampaign.raised,
                  );
                  const isLocked = fundingState.tone === "locked";

                  return (
                  <div
                    key={milestone.title}
                    className={[
                      "donor-ledger-row rounded-2xl border p-3 shadow-sm transition hover:-translate-y-0.5",
                      isLocked
                        ? "border-slate-200 bg-slate-50/70 opacity-80"
                        : index === selectedCurrentMilestoneIndex
                          ? "border-[var(--color-orange)] bg-orange-50/45"
                          : "border-orange-100 hover:border-orange-200",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={[
                          "grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-white text-xs font-black ring-1",
                          isLocked
                            ? "text-slate-400 ring-slate-200"
                            : "text-[var(--color-orange)] ring-orange-100",
                        ].join(" ")}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            className={[
                              "text-sm font-medium",
                              isLocked ? "text-slate-500" : "text-stone-700",
                            ].join(" ")}
                          >
                            {milestone.title}
                          </p>
                          <span
                            className={[
                              "rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em]",
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
                        <p
                          className={[
                            "text-xs font-semibold",
                            isLocked
                              ? "text-slate-400"
                              : "text-[var(--color-orange)]",
                          ].join(" ")}
                        >
                          {milestone.percentage}% release
                        </p>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
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
                        <p className="text-xs font-semibold text-stone-500">
                          Stage:{" "}
                          {getMilestoneDisplayAmount(
                            selectedCampaign,
                            milestone.percentage,
                          )}
                        </p>
                        <p className="text-xs font-semibold text-stone-500">
                          Cumulative:{" "}
                          {getMilestoneDisplayAmount(
                            selectedCampaign,
                            getCumulativeMilestonePercentage(
                              selectedMilestones,
                              index,
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
                  );
                })}
              </div>
            </div>

            {otherShelterCampaigns.length > 0 ? (
              <div className="mx-4 mt-4 rounded-2xl border border-orange-100 bg-white/90 p-4 shadow-sm sm:mx-5">
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
                      className="rounded-xl bg-orange-50/40 p-3 text-left transition hover:-translate-y-0.5 hover:bg-orange-100/70"
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

            </div>

            <div className="shrink-0 flex flex-col gap-3 border-t border-orange-100 bg-white/95 p-4 backdrop-blur-xl sm:flex-row sm:justify-end sm:p-5">
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
      ), document.body) : null}
      {actionToast ? (
        <div className="fixed bottom-6 right-6 z-[130] max-w-sm rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm font-black text-stone-950 shadow-[0_20px_60px_rgba(28,25,23,0.18)]">
          <p>{actionToast}</p>
        </div>
      ) : null}
    </div>
  );
}
