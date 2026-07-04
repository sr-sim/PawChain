"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { campaigns, getShelters } from "../campaignData";

const urgencies = ["All", "Critical", "High", "Medium"];
const locations = ["All", "Kuala Lumpur", "Selangor", "Penang", "Johor"];
const sortOptions = ["Most urgent", "Deadline soon", "Most progress", "Most donors"];
const tabs = ["Campaigns", "Shelters", "Saved"] as const;
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

function VerifiedBadge() {
  return (
    <span
      aria-label="Verified shelter"
      title="Verified shelter"
      className="inline-grid h-5 w-5 shrink-0 place-items-center rounded-full bg-orange-100 text-[var(--color-orange)] ring-1 ring-orange-200"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5"
        aria-hidden="true"
      >
        <path d="m8 12 2.5 2.5L16 9" />
        <path d="M12 3 4.5 6v5c0 4.7 3.2 8.1 7.5 10 4.3-1.9 7.5-5.3 7.5-10V6L12 3Z" />
      </svg>
    </span>
  );
}

function CampaignImage({
  imageClass,
  size = "card",
}: {
  imageClass: string;
  size?: "card" | "hero";
}) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-xl bg-gradient-to-br",
        imageClass,
        size === "hero" ? "min-h-52" : "h-32",
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
  const [searchTerm, setSearchTerm] = useState("");
  const [urgency, setUrgency] = useState("All");
  const [location, setLocation] = useState("All");
  const [sortBy, setSortBy] = useState(sortOptions[0]);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Campaigns");
  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get("campaign"),
  );
  const [savedIds, setSavedIds] = useState<string[]>([
    "vaccination-drive",
    "adoption-care-kits",
  ]);
  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    urgency !== "All" ||
    location !== "All";

  function clearFilters() {
    setSearchTerm("");
    setUrgency("All");
    setLocation("All");
  }

  function toggleSaved(campaignId: string) {
    setSavedIds((current) =>
      current.includes(campaignId)
        ? current.filter((item) => item !== campaignId)
        : [...current, campaignId],
    );
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
  const shelters = useMemo(() => getShelters(), []);

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

  const matchingCount =
    activeTab === "Campaigns"
      ? sortedCampaigns.length
      : activeTab === "Saved"
        ? savedCampaigns.length
        : sortedShelters.length;
  const totalDiscoverable = campaigns.length + shelters.length;
  const resultLabel =
    activeTab === "Campaigns"
      ? "campaigns found"
      : activeTab === "Saved"
        ? "saved campaigns"
        : "shelters found";

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
              Browse & discover
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-stone-950 sm:text-3xl">
              Discover verified shelters and campaigns
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Explore trusted shelter profiles, compare active campaigns, read background stories, and review milestone plans before donating.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-orange-50/60 p-2.5">
            <div className="rounded-xl bg-white/85 px-3 py-2.5">
              <p className="text-sm font-black text-stone-950">
                {matchingCount} {resultLabel}
              </p>
              <p className="text-xs font-semibold text-stone-500">
                Current filters
              </p>
            </div>
            <div className="rounded-xl bg-white/85 px-3 py-2.5">
              <p className="text-sm font-black text-stone-950">
                {totalDiscoverable} total listings
              </p>
              <p className="text-xs font-semibold text-stone-500">
                Shelters and campaigns
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-stone-950">
              Search and filters
            </p>
            <p className="mt-1 text-xs font-medium text-stone-500">
              Narrow campaigns and shelter profiles by urgency or location.
            </p>
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
            options={locations}
            onChange={setLocation}
          />
          <SelectField
            label="Sort by"
            value={sortBy}
            options={sortOptions}
            onChange={setSortBy}
          />
        </div>
      </section>

      <section className="border-b border-orange-100">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            suppressHydrationWarning
            className={[
              "mr-6 border-b-2 px-1 pb-3 text-sm font-semibold transition",
              activeTab === tab
                ? "border-[var(--color-orange)] text-[var(--color-orange)]"
                : "border-transparent text-stone-500 hover:text-stone-950",
            ].join(" ")}
          >
            {tab}
          </button>
        ))}
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
            {(activeTab === "Saved" ? savedCampaigns : sortedCampaigns).length > 0 ? (
            (activeTab === "Saved" ? savedCampaigns : sortedCampaigns).map((campaign) => (
              <article
                key={campaign.id}
                className={[
                  "rounded-2xl border bg-white p-3 shadow-sm transition hover:border-orange-200",
                  selectedCampaign?.id === campaign.id
                    ? "border-[var(--color-orange)]"
                    : "border-orange-100",
                ].join(" ")}
              >
                <div className="relative">
                  <CampaignImage imageClass={campaign.imageClass} />
                  <button
                    type="button"
                    onClick={() => toggleSaved(campaign.id)}
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

                <div className="mt-4 flex items-start justify-between gap-4">
                  <div>
                    <Link
                      href={`/Donor/campaigns/${campaign.id}`}
                      className="block text-base font-black text-stone-950 transition hover:text-[var(--color-orange)]"
                    >
                      {campaign.title}
                    </Link>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-orange)]">
                      <span>{campaign.shelter}</span>
                      <VerifiedBadge />
                    </p>
                  </div>
                  <span
                    className={[
                      "rounded-full px-3 py-1 text-xs font-semibold",
                      getUrgencyStyle(campaign.urgency),
                    ].join(" ")}
                  >
                    {campaign.urgency}
                  </span>
                </div>

                <p className="mt-2 line-clamp-3 text-sm leading-6 text-stone-600">
                  {campaign.story}
                </p>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-stone-500">
                    <span>Raised</span>
                    <span>
                      {campaign.raised}% of {campaign.goal}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-orange-100">
                    <div
                      className="donor-progress-fill h-full rounded-full bg-[var(--color-orange)]"
                      style={{ width: `${campaign.raised}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs font-medium text-stone-500">
                    Next milestone: {campaign.milestones[0].title} (
                    {campaign.milestones[0].percentage}% release)
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-orange-50/50 p-3">
                    <p className="font-semibold text-stone-950">{campaign.donors}</p>
                    <p className="text-xs font-medium text-stone-500">Donors</p>
                  </div>
                  <div className="rounded-xl bg-orange-50/50 p-3">
                    <p className="font-semibold text-stone-950">
                      {campaign.daysLeft} days left
                    </p>
                    <p className="text-xs font-medium text-stone-500">
                      {campaign.duration} campaign
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
                    {campaign.location}
                  </span>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                    {campaign.milestones.length} milestones
                  </span>
                  <span
                    className={[
                      "rounded-full px-3 py-1 text-xs font-medium",
                      getStatusStyle(campaign.status),
                    ].join(" ")}
                  >
                    {campaign.status}
                  </span>
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setSelectedId(campaign.id)}
                    suppressHydrationWarning
                    className="inline-flex flex-1 items-center justify-center rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-900 transition hover:border-[var(--color-orange)] hover:bg-orange-50"
                  >
                    View details
                  </button>
                  <Link
                    href={`/Donor/donate?campaign=${campaign.id}`}
                    className="inline-flex flex-1 items-center justify-center rounded-xl bg-[var(--color-orange)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
                  >
                    Donate
                  </Link>
                </div>
              </article>
            ))
            ) : (
            <div className="rounded-2xl border border-dashed border-orange-200 bg-white p-6 text-center lg:col-span-2 xl:col-span-3">
              <h2 className="text-xl font-black text-stone-950">
                No campaigns found
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
                Try another search term or adjust the filters to discover more verified shelter campaigns.
              </p>
            </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {sortedShelters.length > 0 ? (
              sortedShelters.map((shelter) => (
                <article
                  key={shelter.name}
                  className="grid gap-4 rounded-2xl border border-orange-100 bg-white p-3 shadow-sm transition hover:border-orange-200 lg:grid-cols-[14rem_1fr]"
                >
                  <CampaignImage imageClass={shelter.imageClass} />

                  <div className="min-w-0">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <Link
                          href={`/Donor/shelters/${shelter.id}`}
                          className="flex items-center gap-1.5 text-lg font-black text-stone-950 transition hover:text-[var(--color-orange)]"
                        >
                          <span>{shelter.name}</span>
                          <VerifiedBadge />
                        </Link>
                        <p className="mt-1 text-sm font-medium text-stone-500">
                          {shelter.location}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-fit rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-[var(--color-orange)]">
                          {shelter.campaigns.length} active campaigns
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
                  <VerifiedBadge />
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
                {selectedCampaign.milestones.map((milestone, index) => (
                  <div
                    key={milestone.title}
                    className="flex items-center gap-3 rounded-xl bg-orange-50/40 p-3"
                  >
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
              <Link
                href={`/Donor/donate?campaign=${selectedCampaign.id}`}
                className="inline-flex items-center justify-center rounded-xl bg-[var(--color-orange)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                Donate to this campaign
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
