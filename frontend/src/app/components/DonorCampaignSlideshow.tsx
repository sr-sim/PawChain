"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import type { DonorCampaign } from "@/lib/donor-campaigns";

type DonorCampaignSlideshowProps = {
  campaigns: DonorCampaign[];
  overview?: ReactNode;
};

function formatEth(value?: number) {
  const amount = Number(value ?? 0);

  return `${amount.toLocaleString("en-MY", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  })} ETH`;
}

export function DonorCampaignSlideshow({
  campaigns,
  overview,
}: DonorCampaignSlideshowProps) {
  const slides = useMemo(() => campaigns.slice(0, 5), [campaigns]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const overviewOffset = overview ? 1 : 0;
  const slideCount = slides.length + overviewOffset;

  useEffect(() => {
    if (isPaused || slideCount <= 1) return;

    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slideCount);
    }, 5200);

    return () => window.clearInterval(timer);
  }, [isPaused, slideCount]);

  useEffect(() => {
    if (activeSlide >= slideCount) {
      setActiveSlide(0);
    }
  }, [activeSlide, slideCount]);

  if (slideCount === 0) {
    return null;
  }

  return (
    <section
      aria-label="Featured donor campaigns"
      aria-roledescription="carousel"
      className="group relative overflow-visible rounded-[1.35rem] border border-orange-100 bg-white text-stone-950 shadow-sm"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsPaused(false);
        }
      }}
    >
      <div className="relative min-h-[21rem] overflow-hidden rounded-[1.35rem]">
        <div
          className="flex min-h-[21rem] transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${activeSlide * 100}%)` }}
        >
          {overview ? (
            <div
              aria-hidden={activeSlide !== 0}
              className="relative flex min-h-[21rem] w-full shrink-0 overflow-visible"
            >
              {overview}
            </div>
          ) : null}

          {slides.map((campaign, index) => {
            const raisedEth =
              campaign.onChainTotalRaisedEth ?? campaign.currentAmount ?? 0;
            const goalEth = campaign.onChainGoalEth ?? 0;
            const progress = Math.min(100, Math.max(0, campaign.raised ?? 0));

            return (
              <article
                key={campaign.id}
                aria-hidden={activeSlide !== index + overviewOffset}
                className="relative flex min-h-[21rem] w-full shrink-0 overflow-hidden bg-stone-950 text-white"
              >
                {campaign.imageUrl ? (
                  <img
                    src={campaign.imageUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-45 transition duration-700 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_30%,rgba(255,138,0,0.34),transparent_38%),linear-gradient(120deg,#1c1917,#292524)]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-stone-950/95 via-stone-950/74 to-stone-950/20" />
                <div className="relative flex min-h-[21rem] max-w-4xl flex-col justify-center px-5 pb-14 pt-5 sm:px-8">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em]">
                    <span className="text-orange-300">
                      Featured campaign {index + 1}
                    </span>
                    <span className="text-stone-500">/</span>
                    <span className="text-stone-300">{campaign.status}</span>
                  </div>
                  <h2 className="mt-2 line-clamp-2 max-w-3xl text-2xl font-black tracking-tight sm:text-4xl">
                    {campaign.title}
                  </h2>
                  <p className="mt-2 text-sm font-semibold text-stone-300">
                    {campaign.shelter}
                  </p>
                  <p className="mt-3 line-clamp-2 max-w-2xl text-sm font-medium leading-6 text-stone-300">
                    {campaign.story}
                  </p>

                  <div className="mt-5 max-w-xl">
                    <div className="flex justify-between gap-3 text-xs font-bold text-stone-300">
                      <span>{formatEth(raisedEth)} raised</span>
                      <span>
                        {progress}% of{" "}
                        {goalEth > 0 ? formatEth(goalEth) : campaign.goal}
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15">
                      <div
                        className="h-full rounded-full bg-[var(--color-orange)]"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <Link
                      href={`/Donor/campaigns/${campaign.id}`}
                      className="rounded-xl bg-white px-4 py-2.5 text-xs font-black text-stone-950 transition hover:bg-orange-100"
                    >
                      View campaign
                    </Link>
                    <Link
                      href={`/Donor/donate?campaignId=${campaign.id}`}
                      className="rounded-xl bg-[var(--color-orange)] px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-orange-600"
                    >
                      Donate
                    </Link>
                    <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-stone-200 ring-1 ring-white/15">
                      {campaign.daysLeft} days left
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {slideCount > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous campaign"
            onClick={() =>
              setActiveSlide((current) => (current - 1 + slideCount) % slideCount)
            }
            className="absolute -left-3.5 top-1/2 hidden h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-stone-950/35 text-sm font-black text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-stone-950/65 sm:grid"
          >
            {"<"}
          </button>
          <button
            type="button"
            aria-label="Next campaign"
            onClick={() => setActiveSlide((current) => (current + 1) % slideCount)}
            className="absolute -right-3.5 top-1/2 hidden h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-stone-950/35 text-sm font-black text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-stone-950/65 sm:grid"
          >
            {">"}
          </button>
          <div
            className="pointer-events-none absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2"
            aria-label="Choose campaign slide"
          >
            {overview ? (
              <button
                type="button"
                aria-label="Go to dashboard overview"
                aria-current={activeSlide === 0 ? "true" : undefined}
                onClick={() => setActiveSlide(0)}
                className={[
                  "pointer-events-auto h-2 rounded-full transition-all",
                  activeSlide === 0
                    ? "w-7 bg-orange-300"
                    : "w-2 bg-stone-300 hover:bg-stone-400",
                ].join(" ")}
              />
            ) : null}
            {slides.map((campaign, index) => (
              <button
                key={campaign.id}
                type="button"
                aria-label={`Go to campaign slide ${index + 1}`}
                aria-current={
                  activeSlide === index + overviewOffset ? "true" : undefined
                }
                onClick={() => setActiveSlide(index + overviewOffset)}
                className={[
                  "pointer-events-auto h-2 rounded-full transition-all",
                  activeSlide === index + overviewOffset
                    ? "w-7 bg-orange-300"
                    : activeSlide === 0
                      ? "w-2 bg-stone-300 hover:bg-stone-400"
                      : "w-2 bg-white/40 hover:bg-white/70",
                ].join(" ")}
              />
            ))}
          </div>
        </>
      ) : null}
      {/* Manual navigation controls removed to ensure auto-slide only */}
    </section>
  );
}
