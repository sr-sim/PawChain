"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type ShelterRecentCampaignItem = {
  id: string;
  title: string;
  imageUrl: string | null;
  status: string;
  progress: number;
  raisedEth: number;
  raisedMyr: number;
};

function formatEth(value: number) {
  return `${value.toLocaleString("en-MY", { maximumFractionDigits: 6 })} ETH`;
}

function formatLiveMyr(value: number) {
  return `≈ live MYR ${value.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function ShelterRecentCampaignCarousel({
  campaigns,
  intervalMs = 4_000,
}: {
  campaigns: ShelterRecentCampaignItem[];
  intervalMs?: number;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (campaigns.length < 2) return;

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % campaigns.length);
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [campaigns.length, intervalMs]);

  useEffect(() => {
    if (activeIndex >= campaigns.length) setActiveIndex(0);
  }, [activeIndex, campaigns.length]);

  if (!campaigns.length) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-orange-200 bg-orange-50/40 p-6 text-center text-sm font-bold text-stone-500">
        No campaigns yet. Create your first campaign to begin.
      </div>
    );
  }

  function showPrevious() {
    setActiveIndex(
      (current) => (current - 1 + campaigns.length) % campaigns.length,
    );
  }

  function showNext() {
    setActiveIndex((current) => (current + 1) % campaigns.length);
  }

  return (
    <div
      className="mt-5"
      aria-roledescription="carousel"
      aria-label="Recent shelter campaigns"
    >
      <div className="overflow-hidden rounded-2xl">
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {campaigns.map((campaign, index) => {
            const progress = Math.min(100, Math.max(0, campaign.progress));

            return (
              <Link
                key={campaign.id}
                href={`/Shelter/campaigns/${campaign.id}`}
                tabIndex={index === activeIndex ? 0 : -1}
                aria-hidden={index !== activeIndex}
                className="grid w-full shrink-0 gap-4 rounded-2xl border border-orange-200 p-4 transition hover:bg-orange-50/30 hover:shadow-md sm:grid-cols-[6rem_1fr] sm:items-center"
              >
                <div className="aspect-square overflow-hidden rounded-xl bg-orange-50 ring-1 ring-orange-100">
                  {campaign.imageUrl ? (
                    <img src={campaign.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center p-3">
                      <img src="/images/logo.png" alt="" className="h-full w-full object-contain opacity-60" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="line-clamp-2 text-sm font-black leading-5 text-stone-950">{campaign.title}</p>
                    <span className="shrink-0 text-lg font-black text-[var(--color-orange)]">
                      {progress.toLocaleString("en-MY", { maximumFractionDigits: 2 })}%
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-orange-100">
                    <div className="h-full rounded-full bg-[var(--color-orange)] transition-[width] duration-700" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="mt-3 text-xs font-semibold capitalize text-stone-500">
                    {campaign.status.replaceAll("_", " ")} · {formatEth(campaign.raisedEth)} raised
                  </p>
                  <p className="mt-1 text-[10px] font-bold text-stone-400">{formatLiveMyr(campaign.raisedMyr)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {campaigns.length > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button type="button" onClick={showPrevious} aria-label="Show previous campaign" className="grid h-8 w-8 place-items-center rounded-full border border-orange-100 bg-white text-lg font-black text-stone-500 transition hover:border-orange-300 hover:text-[var(--color-orange)]">‹</button>
          <div className="flex items-center gap-2" aria-label={`${activeIndex + 1} of ${campaigns.length}`}>
            {campaigns.map((campaign, index) => (
              <button
                key={campaign.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Show campaign ${index + 1}: ${campaign.title}`}
                aria-current={index === activeIndex ? "true" : undefined}
                className={[
                  "h-2.5 rounded-full transition-all duration-300",
                  index === activeIndex ? "w-7 bg-[var(--color-orange)]" : "w-2.5 bg-orange-100 hover:bg-orange-300",
                ].join(" ")}
              />
            ))}
          </div>
          <button type="button" onClick={showNext} aria-label="Show next campaign" className="grid h-8 w-8 place-items-center rounded-full border border-orange-100 bg-white text-lg font-black text-stone-500 transition hover:border-orange-300 hover:text-[var(--color-orange)]">›</button>
        </div>
      ) : null}
    </div>
  );
}
