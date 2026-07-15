"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Campaign } from "../campaignData";

type DonorCampaign = Campaign & {
  imageUrl?: string | null;
  source?: "supabase";
};

const quickAmounts = [25, 50, 100, 250];
const currencies = ["MYR", "ETH", "USDC"];

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
  imageUrl,
}: {
  imageClass: string;
  imageUrl?: string | null;
}) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className="h-16 w-full rounded-xl object-cover"
      />
    );
  }

  return (
    <div
      className={[
        "relative h-16 overflow-hidden rounded-xl bg-gradient-to-br",
        imageClass,
      ].join(" ")}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.95),transparent_30%),radial-gradient(circle_at_80%_70%,rgba(255,138,0,0.18),transparent_34%)]" />
    </div>
  );
}

function parseGoal(goal: string) {
  return Number(goal.replace(/[^0-9]/g, ""));
}

export default function DonorDonatePage() {
  const searchParams = useSearchParams();
  const initialCampaign = searchParams.get("campaign");
  const [campaigns, setCampaigns] = useState<DonorCampaign[]>([]);
  const [campaignLoadError, setCampaignLoadError] = useState("");
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);
  const [selectedId, setSelectedId] = useState(initialCampaign ?? "");
  const [amount, setAmount] = useState("100");
  const [currency, setCurrency] = useState("MYR");
  const [isSubmitted, setIsSubmitted] = useState(false);

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

        const liveCampaigns = Array.isArray(result.campaigns)
          ? (result.campaigns as DonorCampaign[])
          : [];

        setCampaigns(liveCampaigns);
        setSelectedId((current) =>
          liveCampaigns.some((campaign) => campaign.id === current)
            ? current
            : liveCampaigns[0]?.id ?? "",
        );
      } catch (error) {
        if (isMounted) {
          setCampaigns([]);
          setCampaignLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load active campaigns.",
          );
        }
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

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedId) ?? campaigns[0],
    [campaigns, selectedId],
  );

  const numericAmount = Number(amount) || 0;
  const goalAmount = selectedCampaign ? parseGoal(selectedCampaign.goal) : 0;
  const estimatedProgress =
    selectedCampaign && currency === "MYR" && goalAmount > 0
      ? Math.min(100, selectedCampaign.raised + (numericAmount / goalAmount) * 100)
      : selectedCampaign?.raised ?? 0;
  const platformFee = currency === "MYR" ? numericAmount * 0.015 : 0;
  const estimatedGas = currency === "MYR" ? 2.5 : 0;
  const netDonation = Math.max(0, numericAmount - platformFee);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
              Donation
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-stone-950 sm:text-3xl">
              Choose a campaign and confirm your support.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Select a verified shelter campaign, enter the donation amount, and review the transaction preview before blockchain confirmation.
            </p>
          </div>
          <Link
            href="/Donor/discover"
            className="inline-flex w-fit items-center justify-center rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-900 transition hover:border-[var(--color-orange)] hover:bg-orange-50"
          >
            Browse campaigns
          </Link>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.82fr]">
        <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
                Step 1
              </p>
              <h2 className="mt-1 text-xl font-black text-stone-950">
                Select campaign
              </h2>
            </div>
            <p className="text-sm font-medium text-stone-500">
              {isLoadingCampaigns
                ? "Loading..."
                : `${campaigns.length} active campaigns`}
            </p>
          </div>

          <div className="mt-4 max-h-[34rem] space-y-3 overflow-y-auto pr-1">
            {isLoadingCampaigns ? (
              <div className="rounded-xl border border-orange-100 bg-orange-50/30 p-5 text-center">
                <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-orange-100 border-t-[var(--color-orange)]" />
                <p className="mt-3 text-sm font-semibold text-stone-600">
                  Loading active campaigns...
                </p>
              </div>
            ) : campaignLoadError ? (
              <div className="rounded-xl border border-red-100 bg-red-50 p-5 text-center">
                <p className="text-sm font-black text-red-800">
                  Unable to load campaigns
                </p>
                <p className="mt-2 text-sm leading-6 text-red-700">
                  {campaignLoadError}
                </p>
              </div>
            ) : campaigns.length > 0 ? (
            campaigns.map((campaign) => (
              <button
                key={campaign.id}
                type="button"
                onClick={() => setSelectedId(campaign.id)}
                suppressHydrationWarning
                className={[
                  "grid w-full gap-3 rounded-xl border p-3 text-left transition sm:grid-cols-[5.5rem_1fr]",
                  selectedId === campaign.id
                    ? "border-[var(--color-orange)] bg-orange-50/55 shadow-sm"
                    : "border-orange-100 bg-white hover:border-orange-200 hover:bg-orange-50/35",
                ].join(" ")}
              >
                <CampaignImage
                  imageClass={campaign.imageClass}
                  imageUrl={campaign.imageUrl}
                />
                <div className="min-w-0">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-sm font-black text-stone-950">
                        {campaign.title}
                      </h3>
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-orange)]">
                        <span>{campaign.shelter}</span>
                        <VerifiedBadge />
                      </p>
                    </div>
                    <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      {campaign.status}
                    </span>
                  </div>

                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-stone-500">
                      <span>{campaign.raised}% raised</span>
                      <span>{campaign.goal}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-orange-100">
                      <div
                        className="donor-progress-fill h-full rounded-full bg-[var(--color-orange)]"
                        style={{ width: `${campaign.raised}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
                      {campaign.location}
                    </span>
                    <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-medium text-[var(--color-orange)]">
                      {campaign.daysLeft} days left
                    </span>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                      {campaign.milestones.length} milestones
                    </span>
                  </div>
                </div>
              </button>
            ))
            ) : (
              <div className="rounded-xl border border-dashed border-orange-200 bg-orange-50/30 p-5 text-center">
                <p className="text-sm font-black text-stone-950">
                  No active campaigns available
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
                  Donations can start after Admin approves at least one shelter campaign.
                </p>
                <Link
                  href="/Donor/discover"
                  className="mt-4 inline-flex items-center justify-center rounded-xl border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-[var(--color-orange)] transition hover:border-[var(--color-orange)] hover:bg-orange-50"
                >
                  Back to Discover
                </Link>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
              Step 2
            </p>
            <h2 className="mt-1 text-xl font-black text-stone-950">
              Donation amount
            </h2>

            <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_8rem]">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Amount
                </span>
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                  suppressHydrationWarning
                  className="mt-2 h-11 w-full rounded-xl border border-orange-100 bg-white px-3 text-base font-semibold text-stone-950 outline-none transition focus:border-[var(--color-orange)] focus:ring-2 focus:ring-orange-100"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Currency
                </span>
                <select
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                  suppressHydrationWarning
                  className="mt-2 h-11 w-full rounded-xl border border-orange-100 bg-white px-3 text-sm font-semibold text-stone-800 outline-none transition focus:border-[var(--color-orange)] focus:ring-2 focus:ring-orange-100"
                >
                  {currencies.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  type="button"
                  onClick={() => setAmount(String(quickAmount))}
                  suppressHydrationWarning
                  className={[
                    "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                    Number(amount) === quickAmount
                      ? "border-[var(--color-orange)] bg-orange-50 text-[var(--color-orange)]"
                      : "border-orange-100 bg-white text-stone-700 hover:border-orange-200 hover:bg-orange-50",
                  ].join(" ")}
                >
                  {quickAmount}
                </button>
              ))}
            </div>
          </div>

          {selectedCampaign ? (
            <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-orange)]">
                Review
              </p>
              <h2 className="mt-1 text-xl font-black text-stone-950">
                Transaction preview
              </h2>

              <div className="mt-4 rounded-xl bg-orange-50/45 p-3">
                <p className="text-sm font-semibold text-stone-950">
                  {selectedCampaign.title}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-orange)]">
                  <span>{selectedCampaign.shelter}</span>
                  <VerifiedBadge />
                </p>
                <p className="mt-3 text-sm leading-6 text-stone-600">
                  Next milestone: {selectedCampaign.milestones[0].title} (
                  {selectedCampaign.milestones[0].percentage}% release)
                </p>
              </div>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium text-stone-500">Donation</span>
                  <span className="font-semibold text-stone-950">
                    {currency} {numericAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium text-stone-500">
                    Campaign progress after donation
                  </span>
                  <span className="font-semibold text-stone-950">
                    {estimatedProgress.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium text-stone-500">
                    Blockchain status
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    Preview only
                  </span>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-orange-100">
                <div className="border-b border-orange-100 bg-orange-50/35 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                    Checkout estimate
                  </p>
                </div>
                <div className="divide-y divide-orange-100 text-sm">
                  <div className="flex items-center justify-between gap-4 px-3 py-2.5">
                    <span className="text-stone-500">Donation amount</span>
                    <span className="font-semibold text-stone-950">
                      {currency} {numericAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 px-3 py-2.5">
                    <span className="text-stone-500">Platform fee preview</span>
                    <span className="font-semibold text-stone-950">
                      {currency === "MYR"
                        ? `MYR ${platformFee.toFixed(2)}`
                        : "Calculated by wallet"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 px-3 py-2.5">
                    <span className="text-stone-500">Estimated gas</span>
                    <span className="font-semibold text-stone-950">
                      {currency === "MYR"
                        ? `MYR ${estimatedGas.toFixed(2)}`
                        : "Wallet network fee"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 px-3 py-2.5">
                    <span className="font-semibold text-stone-950">
                      Estimated support to campaign
                    </span>
                    <span className="font-black text-stone-950">
                      {currency === "MYR"
                        ? `MYR ${netDonation.toFixed(2)}`
                        : `${currency} ${numericAmount.toLocaleString()}`}
                    </span>
                  </div>
                </div>
              </div>

              {isSubmitted ? (
                <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-black text-emerald-800">
                    Donation preview submitted
                  </p>
                  <div className="mt-3 space-y-2">
                    {[
                      ["Wallet confirmation", "Pending live connection"],
                      ["Transaction hash", "Generated after contract call"],
                      ["Tracking", "Ready to appear in donation history"],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between gap-4 text-sm"
                      >
                        <span className="font-medium text-emerald-700">
                          {label}
                        </span>
                        <span className="text-right font-semibold text-emerald-950">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <Link
                      href="/Donor/tracking"
                      className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
                    >
                      View tracking
                    </Link>
                    <button
                      type="button"
                      onClick={() => setIsSubmitted(false)}
                      className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-white"
                    >
                      Edit donation
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={numericAmount <= 0}
                    onClick={() => setIsSubmitted(true)}
                    suppressHydrationWarning
                    className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[var(--color-orange)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-200"
                  >
                    Connect wallet and confirm
                  </button>
                  <p className="mt-3 text-center text-xs font-medium text-stone-500">
                    Wallet confirmation and smart contract payment will be connected later.
                  </p>
                </>
              )}
            </div>
          ) : null}

          <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
              After confirmation
            </p>
            <h2 className="mt-1 text-xl font-black text-stone-950">
              Receipt and tracking
            </h2>
            <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50/25 p-3">
              <p className="text-sm font-semibold text-stone-950">
                Smart contract payment path
              </p>
              <div className="mt-3 space-y-2">
                {[
                  ["1", "Wallet signs donation transaction"],
                  ["2", "Contract records campaign, amount, and donor"],
                  ["3", "Transaction hash appears in tracking"],
                ].map(([step, label]) => (
                  <div key={step} className="flex items-center gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-white text-xs font-black text-[var(--color-orange)] ring-1 ring-orange-100">
                      {step}
                    </span>
                    <span className="text-xs font-semibold text-stone-700">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              {[
                ["Wallet connection", "Required before live payment"],
                ["RoleNFT access", "Donor credential verified"],
                ["Receipt", "Generated after confirmation"],
                ["Tracking", "Added to donation history"],
                ["Tx hash", "Stored with the donation record"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 rounded-xl border border-orange-100 bg-orange-50/20 px-3 py-2.5"
                >
                  <span className="font-medium text-stone-500">{label}</span>
                  <span className="text-right font-semibold text-stone-950">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </aside>
      </section>
    </div>
  );
}
