import Link from "next/link";
import { DonorRoleNFTCard } from "@/app/components/DonorRoleNFTCard";
import {
  donorBadgeTiers,
  formatBadgeEth,
  getBadgeProgress,
  getEarnedBadgeTier,
} from "@/lib/donor-badges";
import { getLatestEthMyrRate } from "@/lib/currency";
import { getDashboardProfile } from "@/lib/dashboard-access";
import { getDonorDonations } from "@/lib/donor-donations";

type DonorBadgesPageProps = {
  searchParams?: Promise<{
    walletAddress?: string;
  }>;
};

function formatLiveMyr(value: number) {
  return `Approx. live MYR ${value.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function EthWithMyr({
  eth,
  ethClassName = "text-2xl font-black text-stone-950",
  myrClassName = "mt-1 text-xs font-medium text-stone-500",
  suffix,
  rate,
}: {
  eth: number;
  ethClassName?: string;
  myrClassName?: string;
  suffix?: string;
  rate: number;
}) {
  return (
    <div>
      <p className={ethClassName}>
        {formatBadgeEth(eth)}
        {suffix ? ` ${suffix}` : ""}
      </p>
      <p className={myrClassName}>{formatLiveMyr(eth * rate)}</p>
    </div>
  );
}

function badgeVisual(level: string) {
  const styles: Record<string, string> = {
    normal: "border-stone-200 bg-stone-50 text-stone-700",
    bronze: "border-orange-200 bg-orange-50 text-orange-700",
    silver: "border-slate-200 bg-slate-50 text-slate-700",
    gold: "border-amber-200 bg-amber-50 text-amber-700",
    hero: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };

  return styles[level] ?? styles.normal;
}

function withWallet(href: string, walletAddress?: string) {
  if (!walletAddress) {
    return href;
  }

  return `${href}?walletAddress=${encodeURIComponent(walletAddress)}`;
}

export default async function DonorBadgesPage({
  searchParams,
}: DonorBadgesPageProps) {
  const params = await searchParams;
  const { userId, profile, accessMode, roleNFT } = await getDashboardProfile(
    "donor",
    params?.walletAddress,
  );
  const walletAddress = profile?.wallet_address ?? params?.walletAddress ?? "";
  const donationData = await getDonorDonations(walletAddress);
  const ethMyrRate = (await getLatestEthMyrRate()).rate;
  const totalEth =
    roleNFT?.donorTotalContributedEth ?? donationData.summary.totalEth;
  const currentLevel = roleNFT?.donorLevel ?? "normal";
  const earnedTier = getEarnedBadgeTier(totalEth);
  const progress = getBadgeProgress(totalEth, currentLevel);
  const eligibleForUpgrade =
    donorBadgeTiers.findIndex((tier) => tier.level === earnedTier.level) >
    donorBadgeTiers.findIndex((tier) => tier.level === currentLevel);

  return (
    <div className="space-y-5">
      <section className="donor-tech-hero overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-orange)]">
              NFT badges
            </p>
            <h1 className="mt-2 max-w-2xl text-2xl font-black tracking-tight text-stone-950 sm:text-3xl">
              Donor badge progress
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Track your current RoleNFT badge, confirmed donation total, and
              how much more support is needed to reach the next donor badge.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Link
                href={withWallet("/Donor/donate", walletAddress)}
                className="inline-flex items-center justify-center rounded-xl bg-[var(--color-orange)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                Donate toward next badge
              </Link>
              <Link
                href={withWallet("/Donor/tracking", walletAddress)}
                className="inline-flex items-center justify-center rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-900 transition hover:border-[var(--color-orange)] hover:bg-orange-50"
              >
                View donation ledger
              </Link>
            </div>
          </div>

          <DonorRoleNFTCard
            accessMode={accessMode}
            roleNFT={roleNFT}
            userId={userId}
            variant="compact"
            walletAddress={walletAddress || "-"}
          />
        </div>
      </section>

      <section className="donor-gradient-card rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-orange)]">
              Next upgrade
            </p>
            <h2 className="mt-1 text-xl font-black text-stone-950">
              {progress.nextTier
                ? `${progress.currentTier.name} to ${progress.nextTier.name}`
                : "Highest donor badge reached"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              Badge progress is calculated from confirmed donation records.
              After the upgraded RoleNFT contract is deployed, confirmed
              campaign donations can upgrade the badge automatically.
            </p>
          </div>
          {eligibleForUpgrade ? (
            <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
              Eligible for upgrade
            </span>
          ) : null}
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500">
            <span>{progress.currentTier.name}</span>
            <span>
              {progress.nextTier
                ? `${Math.round(progress.progress)}% to next`
                : "100%"}
            </span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-orange-50 ring-1 ring-orange-100">
            <div
              className="donor-progress-fill h-full rounded-full bg-[var(--color-orange)] transition-all"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs font-semibold text-stone-500">
            <div>
              <p>{formatBadgeEth(totalEth)} donated</p>
              <p className="mt-0.5 font-medium text-stone-400">
                {formatLiveMyr(totalEth * ethMyrRate)}
              </p>
            </div>
            <div className="text-right">
              {progress.nextTier
                ? (
                    <>
                      <p>{formatBadgeEth(progress.nextTier.requiredEth)} target</p>
                      <p className="mt-0.5 font-medium text-stone-400">
                        {formatLiveMyr(progress.nextTier.requiredEth * ethMyrRate)}
                      </p>
                    </>
                  )
                : "Complete"}
            </div>
          </div>
        </div>
      </section>

      <section className="donor-gradient-card rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-orange)]">
              Badge tiers
            </p>
            <h2 className="mt-1 text-xl font-black text-stone-950">
              Donation thresholds
            </h2>
          </div>
          <p className="text-xs font-semibold text-stone-500">
            Based on confirmed donations.
          </p>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-5">
          {donorBadgeTiers.map((tier) => {
            const earned = totalEth >= tier.requiredEth;
            const active = tier.level === currentLevel;
            const remaining = Math.max(0, tier.requiredEth - totalEth);

            return (
              <article
                key={tier.level}
                className={[
                  "rounded-2xl border p-4 shadow-sm",
                  active
                    ? "donor-badge-current donor-badge-glow border-[var(--color-orange)] bg-gradient-to-br from-orange-50 via-white to-[rgba(var(--color-gold-rgb),0.24)]"
                    : earned
                      ? "donor-badge-glow border-orange-200 bg-white"
                      : "border-orange-100 bg-white/80",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={[
                      "grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border text-sm font-black",
                      badgeVisual(tier.level),
                    ].join(" ")}
                  >
                    <img
                      src={tier.imageUrl}
                      alt={tier.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  {active ? (
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-[var(--color-orange)] ring-1 ring-orange-100">
                      Current
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-3 text-base font-black text-stone-950">
                  {tier.name}
                </h3>
                <p className="mt-1 text-xs font-semibold text-[var(--color-orange)]">
                  {formatBadgeEth(tier.requiredEth)} total donated
                </p>
                <p className="mt-0.5 text-xs font-semibold text-stone-400">
                  {formatLiveMyr(tier.requiredEth * ethMyrRate)}
                </p>
                <p className="mt-2 min-h-10 text-xs leading-5 text-stone-600">
                  {tier.description}
                </p>
                <div className="mt-3 rounded-xl bg-orange-50/45 px-3 py-2">
                  <p className="text-xs font-semibold text-stone-500">
                    {earned
                      ? active
                        ? "Current badge"
                        : "Threshold reached"
                      : `${formatBadgeEth(remaining)} remaining`}
                  </p>
                  {!earned ? (
                    <p className="mt-0.5 text-xs font-semibold text-stone-400">
                      {formatLiveMyr(remaining * ethMyrRate)}
                    </p>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
