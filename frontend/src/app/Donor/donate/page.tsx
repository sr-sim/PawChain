"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Campaign } from "../campaignData";

type DonorCampaign = Campaign & {
  imageUrl?: string | null;
  source?: "supabase";
};

const quickAmountsMyr = [25, 50, 100, 250];
const ethToMyrRate = 8000;
const estimatedGasEth = 0.0002;

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

function formatEth(value: number) {
  return value.toLocaleString("en-MY", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  });
}

function formatMyr(value: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function EthIcon() {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-950 text-white shadow-sm ring-1 ring-slate-200">
      <svg
        viewBox="0 0 256 417"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path fill="#ffffff" d="M127.9 0 125.1 9.5v275.3l2.8 2.8 127.9-75.6z" />
        <path fill="#d6d6d6" d="M127.9 0 0 212l127.9 75.6V154.1z" />
        <path fill="#ffffff" d="m127.9 311.8-1.6 2v98.1l1.6 4.7 128-180.3z" />
        <path fill="#d6d6d6" d="M127.9 416.6v-104.8L0 236.3z" />
        <path fill="#f3f3f3" d="m127.9 287.6 127.9-75.6-127.9-57.9z" />
        <path fill="#bdbdbd" d="M0 212l127.9 75.6V154.1z" />
      </svg>
    </span>
  );
}

export default function DonorDonatePage() {
  const searchParams = useSearchParams();
  const initialCampaign = searchParams.get("campaign");
  const walletAddress = searchParams.get("walletAddress") ?? "";
  const [campaigns, setCampaigns] = useState<DonorCampaign[]>([]);
  const [campaignLoadError, setCampaignLoadError] = useState("");
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);
  const [selectedId, setSelectedId] = useState(initialCampaign ?? "");
  const [amount, setAmount] = useState("0.0125");
  const [token, setToken] = useState("ETH");
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

  const trimmedAmount = amount.trim();
  const parsedAmount = Number(trimmedAmount);
  const hasInvalidAmount =
    trimmedAmount.length === 0 || !Number.isFinite(parsedAmount) || parsedAmount <= 0;
  const numericAmount = hasInvalidAmount ? 0 : parsedAmount;
  const myrEstimate = numericAmount * ethToMyrRate;
  const goalAmount = selectedCampaign ? parseGoal(selectedCampaign.goal) : 0;
  const estimatedProgress =
    selectedCampaign && goalAmount > 0
      ? Math.min(100, selectedCampaign.raised + (myrEstimate / goalAmount) * 100)
      : selectedCampaign?.raised ?? 0;
  const requiredTotalEth = numericAmount + estimatedGasEth;
  const requiredTotalMyr = requiredTotalEth * ethToMyrRate;
  const shortWallet = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "Not connected";

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
              Select a verified shelter campaign, enter the ETH donation amount,
              and review the MYR estimate before blockchain confirmation.
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
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
                  Step 2
                </p>
                <h2 className="mt-1 text-xl font-black text-stone-950">
                  Enter your donation
                </h2>
              </div>
              <span className="rounded-full border border-orange-100 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-[var(--color-orange)]">
                Preview
              </span>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-orange-100 bg-orange-50/35 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                    Connected wallet
                  </p>
                  <p className="mt-1 font-mono text-sm font-black text-stone-950">
                    {shortWallet}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                    Available balance
                  </p>
                  <p className="mt-1 text-sm font-semibold text-stone-500">
                    Loads after Web3 balance check
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-[12.5rem_1fr]">
                <label className="border-b border-orange-100 bg-orange-50/15 px-4 py-4 sm:border-b-0 sm:border-r">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Token
                  </span>
                  <div className="mt-2 flex h-12 items-center gap-2.5 rounded-xl border border-orange-100 bg-white px-3 shadow-sm">
                    <EthIcon />
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-black text-stone-950">ETH</p>
                      <p className="text-xs font-semibold text-stone-400">
                        Native token
                      </p>
                    </div>
                  </div>
                </label>
                <label className="block px-4 py-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Amount
                  </span>
                  <div className="mt-1 flex items-end justify-between gap-3">
                    <input
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      inputMode="decimal"
                      suppressHydrationWarning
                      className="min-w-0 flex-1 border-0 bg-transparent text-3xl font-black text-stone-950 outline-none placeholder:text-stone-300"
                      placeholder="0.00"
                    />
                    <span className="pb-1 text-sm font-black text-stone-400">
                      ETH
                    </span>
                  </div>
                  {hasInvalidAmount ? (
                    <p className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                      Please enter a valid ETH amount greater than 0.
                    </p>
                  ) : null}
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-orange-50/50 px-3 py-2">
                    <span className="text-xs font-semibold text-stone-500">
                      Estimated value
                    </span>
                    <span className="text-sm font-black text-stone-950">
                      {formatMyr(myrEstimate)}
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                Quick RM estimate
              </p>
              <p className="text-xs font-semibold text-stone-500">
                1 ETH = {formatMyr(ethToMyrRate)}
              </p>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {quickAmountsMyr.map((quickAmount) => {
                const ethAmount = quickAmount / ethToMyrRate;

                return (
                <button
                  key={quickAmount}
                  type="button"
                  onClick={() => setAmount(ethAmount.toFixed(6))}
                  suppressHydrationWarning
                  className={[
                    "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                    Math.abs(numericAmount - ethAmount) < 0.000001
                      ? "border-[var(--color-orange)] bg-orange-50 text-[var(--color-orange)]"
                      : "border-orange-100 bg-white text-stone-700 hover:border-orange-200 hover:bg-orange-50",
                  ].join(" ")}
                >
                  RM {quickAmount}
                </button>
              )})}
            </div>
            <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50/25 px-3 py-2.5">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-xs font-black text-[var(--color-orange)] ring-1 ring-orange-100">
                  i
                </span>
                <p className="text-xs font-medium leading-5 text-stone-500">
                  The live wallet will confirm exact ETH balance and network gas
                  during Web3 checkout. Keep extra ETH available for gas.
                </p>
              </div>
            </div>
          </div>

          {selectedCampaign ? (
            <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-orange)]">
                    Review
                  </p>
                  <h2 className="mt-1 text-xl font-black text-stone-950">
                    Transaction preview
                  </h2>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  Web3 later
                </span>
              </div>

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

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-orange-100 bg-orange-50/25 px-3 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
                    Donation
                  </p>
                  <p className="mt-1 text-lg font-black text-stone-950">
                    {formatEth(numericAmount)} {token}
                  </p>
                  <p className="text-xs font-semibold text-stone-500">
                    {formatMyr(myrEstimate)}
                  </p>
                </div>
                <div className="rounded-xl border border-orange-100 bg-orange-50/25 px-3 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
                    Campaign progress
                  </p>
                  <p className="mt-1 text-lg font-black text-stone-950">
                    {estimatedProgress.toFixed(1)}%
                  </p>
                  <p className="text-xs font-semibold text-stone-500">
                    after this preview
                  </p>
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-xl border border-orange-100">
                <div className="border-b border-orange-100 bg-stone-950 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white">
                    Checkout estimate
                  </p>
                </div>
                <div className="divide-y divide-orange-100 text-sm">
                  <div className="flex items-center justify-between gap-4 px-3 py-2.5">
                    <span className="text-stone-500">Donation amount</span>
                    <span className="font-semibold text-stone-950">
                      {formatEth(numericAmount)} {token}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 px-3 py-2.5">
                    <span className="text-stone-500">MYR estimate</span>
                    <span className="font-semibold text-stone-950">
                      {formatMyr(myrEstimate)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 px-3 py-2.5">
                    <span className="text-stone-500">Estimated gas buffer</span>
                    <span className="font-semibold text-stone-950">
                      {formatEth(estimatedGasEth)} ETH
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 px-3 py-2.5">
                    <span className="font-semibold text-stone-950">
                      Required total preview
                    </span>
                    <span className="font-black text-stone-950">
                      {formatEth(requiredTotalEth)} ETH
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 px-3 py-2.5">
                    <span className="text-stone-500">Total value estimate</span>
                    <span className="font-semibold text-stone-950">
                      {formatMyr(requiredTotalMyr)}
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
                      ["Amount", `${formatEth(numericAmount)} ETH (${formatMyr(myrEstimate)})`],
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
                    disabled={hasInvalidAmount}
                    onClick={() => setIsSubmitted(true)}
                    suppressHydrationWarning
                    className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[var(--color-orange)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-200"
                  >
                    Connect wallet and confirm
                  </button>
                  <p className="mt-3 text-center text-xs font-medium text-stone-500">
                    Wallet confirmation, live balance check, and exact gas fee
                    will be connected during Web3 integration.
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
