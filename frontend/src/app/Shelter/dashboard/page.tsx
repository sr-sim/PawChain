import Link from "next/link";
import { formatEther, isAddress, type Address } from "viem";
import { ShelterRoleNFTCard } from "@/app/Shelter/components/ShelterRoleNFTCard";
import { ShelterRecentCampaignCarousel } from "@/app/Shelter/components/ShelterRecentCampaignCarousel";
import { getPawChainPublicClient } from "@/lib/campaign-blockchain";
import { campaignContractAbi } from "@/lib/campaign-contract-abi";
import { getDashboardProfile } from "@/lib/dashboard-access";
import { getShelterPortalData } from "@/lib/shelter-portal";
import { ShelterEthMyrMarketCard } from "@/app/Shelter/components/ShelterEthMyrMarketCard";
import { getLatestEthMyrRate } from "@/lib/currency";
import styles from "./dashboard.module.css";

type DashboardProps = { searchParams?: Promise<{ walletAddress?: string }> };

type CampaignChainState = {
  goalEth: string;
  raisedEth: string;
  progress: number;
  campaignStatus: number;
};

function formatETH(value: string | number) {
  return `${Number(value).toLocaleString("en-MY", {
    maximumFractionDigits: 8,
  })} ETH`;
}

function formatLiveMYR(value: number) {
  return `≈ live MYR ${value.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function QuickActionIcon({ type }: { type: "create" | "manage" | "donations" | "withdraw" }) {
  const paths = {
    create: "M12 5v14M5 12h14",
    manage: "M7 4h10v16H7zM10 8h4M10 12h4M10 16h3M5 7H3v10h2",
    donations: "M12 20s-7-4.3-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.7-7 10-7 10Z",
    withdraw: "M3.5 7h17v11h-17zM3.5 10h17M16 13h5v3h-5a1.5 1.5 0 0 1 0-3Z",
  };
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <path d={paths[type]} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProgressRing({ value }: { value: number }) {
  const safeValue = Math.min(100, Math.max(0, value));
  return (
    <div className="relative grid h-36 w-36 place-items-center rounded-full" style={{ background: `conic-gradient(#FF8A00 ${safeValue * 3.6}deg, #FFF0D8 0deg)` }}>
      <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center shadow-inner">
        <div><p className="text-3xl font-black text-stone-950">{safeValue}%</p><p className="text-[10px] font-black uppercase tracking-wide text-stone-500">goal achieved</p></div>
      </div>
    </div>
  );
}

export default async function ShelterDashboard({ searchParams }: DashboardProps) {
  const params = await searchParams;
  const { userId, profile, roleNFT } = await getDashboardProfile("shelter", params?.walletAddress);
  const { campaigns, milestones } = await getShelterPortalData(userId);
  const { rate: liveEthMyrRate } = await getLatestEthMyrRate();
  const shelterName = profile?.full_name ?? "Shelter";
  const walletAddress = profile?.wallet_address ?? params?.walletAddress ?? null;

  const publicClient = getPawChainPublicClient();
  const chainStateEntries = await Promise.all(
    campaigns.map(async (campaign) => {
      if (!campaign.contract_address || !isAddress(campaign.contract_address)) {
        return null;
      }

      try {
        const contractAddress = campaign.contract_address as Address;
        const [goalWei, raisedWei, campaignStatus] = await Promise.all([
          publicClient.readContract({
            address: contractAddress,
            abi: campaignContractAbi,
            functionName: "goal",
          }),
          publicClient.readContract({
            address: contractAddress,
            abi: campaignContractAbi,
            functionName: "totalRaised",
          }),
          publicClient.readContract({
            address: contractAddress,
            abi: campaignContractAbi,
            functionName: "campaignStatus",
          }),
        ]);
        const progress = goalWei > BigInt(0)
          ? Number((raisedWei * BigInt(100_000)) / goalWei) / 1_000
          : 0;

        return [
          campaign.id,
          {
            goalEth: formatEther(goalWei),
            raisedEth: formatEther(raisedWei),
            progress: Math.min(100, progress),
            campaignStatus: Number(campaignStatus),
          } satisfies CampaignChainState,
        ] as const;
      } catch {
        return null;
      }
    }),
  );
  const chainStateByCampaignId = new Map(
    chainStateEntries.filter(
      (entry): entry is NonNullable<typeof entry> => entry !== null,
    ),
  );
  const displayedCampaigns = campaigns.map((campaign) => {
    const chainState = chainStateByCampaignId.get(campaign.id);
    return {
      ...campaign,
      campaign_status:
        chainState?.campaignStatus === 1
          ? "completed"
          : chainState?.campaignStatus === 2 || chainState?.campaignStatus === 3
            ? "closed"
          : campaign.campaign_status,
      chainState,
    };
  });

  const activeCampaigns = displayedCampaigns.filter((campaign) => campaign.campaign_status === "active");
  const pendingReviews = milestones.filter((milestone) => milestone.status === "submitted");
  const allActiveCampaignsHaveChainState = activeCampaigns.every(
    (campaign) => Boolean(campaign.chainState),
  );
  const totalGoal = activeCampaigns.reduce(
    (sum, campaign) =>
      sum + Number(
        allActiveCampaignsHaveChainState
          ? campaign.chainState?.goalEth ?? 0
          : campaign.goal_amount || 0,
      ),
    0,
  );
  const totalRaised = activeCampaigns.reduce(
    (sum, campaign) =>
      sum + Number(
        allActiveCampaignsHaveChainState
          ? campaign.chainState?.raisedEth ?? 0
          : campaign.current_amount || 0,
      ),
    0,
  );
  const progress = totalGoal > 0 ? Math.round((totalRaised / totalGoal) * 100) : 0;
  const contractConnectedCampaigns = displayedCampaigns.filter(
    (campaign) => Boolean(campaign.contract_address),
  );

  const quickActions = [
    { label: "Create campaign", detail: "Start a new fundraising campaign", href: "/Shelter/campaigns/create", icon: "create" as const, tone: "text-orange-600 bg-orange-50" },
    { label: "Manage campaigns", detail: "View and update your campaigns", href: "/Shelter/campaigns", icon: "manage" as const, tone: "text-emerald-600 bg-emerald-50" },
    { label: "View donations", detail: "Inspect confirmed donor support", href: "/Shelter/donations", icon: "donations" as const, tone: "text-violet-600 bg-violet-50" },
    { label: "Withdraw funds", detail: "Request milestone fund release", href: "/Shelter/withdrawals", icon: "withdraw" as const, tone: "text-blue-600 bg-blue-50" },
  ];
  const recentCampaigns = displayedCampaigns.map((campaign) => {
    const itemProgress = campaign.chainState?.progress ?? (
      Number(campaign.goal_amount) > 0
        ? Math.round(Number(campaign.current_amount || 0) / Number(campaign.goal_amount) * 100)
        : 0
    );
    const raisedEth = Number(campaign.chainState?.raisedEth ?? campaign.current_amount ?? 0);

    return {
      id: campaign.id,
      title: campaign.title,
      imageUrl: campaign.image_url,
      status: campaign.campaign_status,
      progress: itemProgress,
      raisedEth,
      raisedMyr: raisedEth * liveEthMyrRate,
    };
  });

  return (
    <div className="w-full space-y-6 py-6">
      <section className="w-full overflow-hidden rounded-[1.35rem] border border-orange-100 bg-white shadow-sm">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,0.8fr)]">
          <div className={`${styles.premiumPanel} relative overflow-hidden p-5 sm:p-6`}>
            <div className="relative z-10">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-orange)]">
                Shelter command center
              </p>
              <h1 className="mt-2 max-w-2xl text-2xl font-black tracking-tight text-stone-950 sm:text-4xl">
                Welcome back, {shelterName}.
              </h1>
              <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">
                    Raised across active campaigns
                  </p>
                  <p className={`${styles.ethGradient} mt-1 text-4xl font-black tracking-tight sm:text-6xl`}>
                    {formatETH(totalRaised)}
                  </p>
                  <p className="mt-2 text-sm font-black text-stone-500">
                    {formatLiveMYR(totalRaised * liveEthMyrRate)}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-stone-600">
                    Supporting {activeCampaigns.length} active {activeCampaigns.length === 1 ? "campaign" : "campaigns"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs sm:min-w-80 xl:min-w-[22rem]">
                  <div className={`${styles.metric} relative min-h-32 rounded-2xl border border-orange-100 bg-white/85 p-4`}>
                    <p className="text-sm font-black uppercase tracking-[0.12em] text-stone-700">Pending reviews</p>
                    <p className="mt-2 text-3xl font-black text-stone-950">{pendingReviews.length}</p>
                    <p className="mt-1 text-xs font-bold text-stone-600">milestone submissions</p>
                  </div>
                  <div className={`${styles.metric} relative min-h-32 overflow-visible rounded-2xl border border-orange-100 bg-white/85 p-4`}>
                    <div className={styles.animalArt} aria-hidden="true">
                      <img src="/images/donor-dashboard-pets-transparent.png" alt="" />
                    </div>
                    <p className="relative text-sm font-black uppercase tracking-[0.12em] text-stone-700">Smart campaigns</p>
                    <p className="relative mt-2 text-3xl font-black text-stone-950">{contractConnectedCampaigns.length}</p>
                    <p className="relative mt-1 text-xs font-bold text-stone-600">contract linked</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-orange-100 bg-white p-5 sm:p-6 xl:border-l xl:border-t-0">
            <ShelterRoleNFTCard
              roleNFT={roleNFT}
              walletAddress={walletAddress}
            />
          </div>
        </div>
      </section>

      <section className="grid w-full items-stretch gap-6 min-[1200px]:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]" aria-label="Market and quick actions">
        <ShelterEthMyrMarketCard />

        <section className="flex h-full w-full flex-col rounded-3xl border border-orange-100 bg-white p-5 shadow-[0_12px_36px_rgba(111,69,20,0.07)] sm:p-6" aria-label="Quick actions">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-orange-50 text-lg text-[var(--color-orange)]" aria-hidden="true">⚡</span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">Shelter tools</p>
              <h2 className="text-sm font-black uppercase tracking-[0.14em] text-stone-700">Quick actions</h2>
            </div>
          </div>
          <div className="mt-4 grid flex-1 grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group flex min-h-36 flex-col items-center justify-center rounded-2xl border border-orange-100 bg-orange-50/20 p-3 text-center shadow-sm transition hover:-translate-y-1 hover:border-[var(--color-orange)] hover:bg-white hover:shadow-lg hover:shadow-orange-100"
              >
                <span className={`mx-auto grid h-11 w-11 shrink-0 place-items-center rounded-full ${action.tone}`}>
                  <QuickActionIcon type={action.icon} />
                </span>
                <span className="mt-3 block text-sm font-black text-stone-950 group-hover:text-[var(--color-orange)]">{action.label}</span>
                <span className="mx-auto mt-1 block max-w-36 text-[11px] font-semibold leading-4 text-stone-500">{action.detail}</span>
              </Link>
            ))}
          </div>
        </section>
      </section>

      <section className="grid w-full gap-6 xl:grid-cols-2">
        <article className="rounded-3xl border border-orange-100 bg-white p-5 shadow-[0_12px_36px_rgba(111,69,20,0.07)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[var(--color-orange)]">Funding overview</p>
              <h2 className="mt-1 text-xl font-black text-stone-950">Active campaign progress</h2>
            </div>
            <Link href="/Shelter/campaigns" className="shrink-0 text-xs font-black text-[var(--color-orange)] hover:underline">View all campaigns →</Link>
          </div>
          <div className="mt-6 grid gap-7 sm:grid-cols-[9rem_1fr] sm:items-center">
            <ProgressRing value={progress} />
            <div className="space-y-4">
              <div>
                <div className="flex items-start justify-between gap-3 text-xs font-black">
                  <span>Raised</span>
                  <span className="text-right">{formatETH(totalRaised)}<span className="mt-1 block text-[10px] text-stone-400">{formatLiveMYR(totalRaised * liveEthMyrRate)}</span></span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-orange-100"><div className="h-full rounded-full bg-[var(--color-orange)]" style={{ width: `${Math.min(100, progress)}%` }} /></div>
              </div>
              <div className="flex items-start justify-between gap-3 border-t border-orange-100 pt-4 text-sm">
                <span className="font-bold text-stone-500">Combined goal</span>
                <span className="text-right font-black">{formatETH(totalGoal)}<span className="mt-1 block text-[10px] text-stone-400">{formatLiveMYR(totalGoal * liveEthMyrRate)}</span></span>
              </div>
              <div className="flex justify-between text-sm"><span className="font-bold text-stone-500">Campaigns running</span><span className="font-black">{activeCampaigns.length}</span></div>
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-orange-100 bg-white p-5 shadow-[0_12px_36px_rgba(111,69,20,0.07)] sm:p-6">
          <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-[var(--color-orange)]">Recent campaign</p><h2 className="mt-1 text-xl font-black text-stone-950">Latest activity</h2></div><Link href="/Shelter/campaigns/create" className="rounded-xl bg-[var(--color-orange)] px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-orange-200/60 transition hover:-translate-y-0.5">+ Create</Link></div>
          <ShelterRecentCampaignCarousel campaigns={recentCampaigns} />
        </article>
      </section>

    </div>
  );
}
