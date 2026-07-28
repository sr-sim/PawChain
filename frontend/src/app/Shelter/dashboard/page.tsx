import Link from "next/link";
import { formatEther, isAddress, type Address } from "viem";
import { RoleNFTBadge } from "@/app/components/RoleNFTBadge";
import { getPawChainPublicClient } from "@/lib/campaign-blockchain";
import { campaignContractAbi } from "@/lib/campaign-contract-abi";
import { getDashboardProfile } from "@/lib/dashboard-access";
import { formatMYR, getShelterPortalData, shortAddress } from "@/lib/shelter-portal";

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
  const { campaigns, milestones, donations } = await getShelterPortalData(userId);
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
          : campaign.campaign_status,
      chainState,
    };
  });

  const activeCampaigns = displayedCampaigns.filter((campaign) => campaign.campaign_status === "active");
  const pendingReviews = milestones.filter((milestone) => milestone.status === "submitted");
  const releasedMilestones = milestones.filter((milestone) => milestone.release_tx_hash);
  const totalDonations = donations
    .filter((donation) => !["failed", "refunded"].includes(donation.status.toLowerCase()))
    .reduce((sum, donation) => sum + Number(donation.amount || 0), 0);
  const totalReleased = releasedMilestones.reduce((sum, milestone) => {
    const campaign = displayedCampaigns.find((item) => item.id === milestone.campaign_id);
    return sum + Number(campaign?.goal_amount || 0) * Number(milestone.percentage || 0) / 100;
  }, 0);
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

  const stats = [
    ["Total funds released", formatMYR(totalReleased), "Available milestone funds"],
    ["Active campaigns", String(activeCampaigns.length), "Currently fundraising"],
    ["Pending reviews", String(pendingReviews.length), "Awaiting admin review"],
    ["Total donations", formatMYR(totalDonations), `${donations.length} transactions received`],
  ];

  return (
    <div className="space-y-6 py-6">
      <section className="grid gap-5 rounded-3xl border border-[#FFCD80] bg-[linear-gradient(135deg,#FFFFFF,#FFFCC9_140%)] p-5 shadow-[0_18px_45px_rgba(111,69,20,0.08)] lg:grid-cols-[1fr_19rem] lg:items-center sm:p-7">
        <div>
          <p className="text-sm font-black text-stone-600">Welcome back,</p>
          <h1 className="mt-1 text-4xl font-black tracking-tight text-stone-950">{shelterName}! <span aria-hidden="true">🐾</span></h1>
          <p className="mt-2 text-sm font-semibold text-stone-600">Here is what is happening with your shelter today.</p>
        </div>
        <div className="rounded-2xl border border-orange-200 bg-white/90 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3"><p className="text-xs font-black uppercase tracking-wide text-stone-500">Shelter wallet</p><span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-black text-violet-700 ring-1 ring-violet-200">Sepolia</span></div>
          <p className="mt-2 font-mono text-sm font-black text-stone-950" title={walletAddress ?? undefined}>{shortAddress(walletAddress)}</p>
          {walletAddress ? <a href={`https://sepolia.etherscan.io/address/${walletAddress}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs font-black text-[var(--color-orange)] hover:underline">View on Sepolia Etherscan ↗</a> : null}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Shelter summary">
        {stats.map(([label, value, hint]) => (
          <article key={label} className="rounded-2xl border border-orange-100 bg-white p-5 shadow-[0_10px_30px_rgba(111,69,20,0.06)]">
            <p className="text-xs font-black uppercase tracking-wide text-stone-500">{label}</p>
            <p className="mt-3 text-2xl font-black text-stone-950">{value}</p>
            <p className="mt-1 text-xs font-semibold text-stone-500">{hint}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <article className="rounded-3xl border border-orange-100 bg-white p-5 shadow-[0_12px_36px_rgba(111,69,20,0.07)] sm:p-6">
          <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-[var(--color-orange)]">Funding overview</p><h2 className="mt-1 text-xl font-black text-stone-950">Active campaign progress</h2></div><Link href="/Shelter/campaigns" className="text-xs font-black text-[var(--color-orange)] hover:underline">View all campaigns →</Link></div>
          <div className="mt-6 grid gap-7 sm:grid-cols-[9rem_1fr] sm:items-center">
            <ProgressRing value={progress} />
            <div className="space-y-4">
              <div><div className="flex justify-between text-xs font-black"><span>Raised</span><span>{allActiveCampaignsHaveChainState ? formatETH(totalRaised) : formatMYR(totalRaised)}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-orange-100"><div className="h-full rounded-full bg-[var(--color-orange)]" style={{ width: `${Math.min(100, progress)}%` }} /></div></div>
              <div className="flex justify-between border-t border-orange-100 pt-4 text-sm"><span className="font-bold text-stone-500">Combined goal</span><span className="font-black">{allActiveCampaignsHaveChainState ? formatETH(totalGoal) : formatMYR(totalGoal)}</span></div>
              <div className="flex justify-between text-sm"><span className="font-bold text-stone-500">Campaigns running</span><span className="font-black">{activeCampaigns.length}</span></div>
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-orange-100 bg-white p-5 shadow-[0_12px_36px_rgba(111,69,20,0.07)] sm:p-6">
          <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-[var(--color-orange)]">Recent campaigns</p><h2 className="mt-1 text-xl font-black text-stone-950">Latest activity</h2></div><Link href="/Shelter/campaigns/create" className="rounded-xl bg-[var(--color-orange)] px-3 py-2 text-xs font-black text-white">+ Create</Link></div>
          <div className="mt-5 space-y-3">
            {displayedCampaigns.slice(0, 4).map((campaign) => {
              const itemProgress = campaign.chainState?.progress ?? (
                Number(campaign.goal_amount) > 0
                  ? Math.round(Number(campaign.current_amount || 0) / Number(campaign.goal_amount) * 100)
                  : 0
              );
              const raisedAmount = campaign.chainState
                ? formatETH(campaign.chainState.raisedEth)
                : formatMYR(campaign.current_amount);
              return <Link key={campaign.id} href={`/Shelter/campaigns/${campaign.id}`} className="block rounded-2xl border border-orange-100 p-4 transition hover:bg-orange-50/50"><div className="flex items-center justify-between gap-3"><p className="truncate text-sm font-black text-stone-950">{campaign.title}</p><span className="text-xs font-black text-[var(--color-orange)]">{itemProgress}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-orange-100"><div className="h-full bg-[var(--color-orange)]" style={{ width: `${Math.min(100, itemProgress)}%` }} /></div><p className="mt-2 text-xs font-semibold capitalize text-stone-500">{campaign.campaign_status.replaceAll("_", " ")} · {raisedAmount} raised</p></Link>;
            })}
            {!displayedCampaigns.length ? <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/40 p-6 text-center text-sm font-bold text-stone-500">No campaigns yet. Create your first campaign to begin.</div> : null}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <article className="rounded-3xl border border-orange-100 bg-white p-5 shadow-[0_12px_36px_rgba(111,69,20,0.07)] sm:p-6">
          <h2 className="text-xl font-black text-stone-950">Current actions</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Link href="/Shelter/campaigns" className="rounded-2xl border border-orange-100 bg-[#FFFCC9]/35 p-4 text-sm font-black hover:border-[var(--color-orange)]">Manage campaigns <span className="block mt-2 text-xs font-semibold text-stone-500">Review progress and proofs</span></Link>
            <Link href="/Shelter/withdrawals" className="rounded-2xl border border-orange-100 bg-[#FFFCC9]/35 p-4 text-sm font-black hover:border-[var(--color-orange)]">Withdraw funds <span className="block mt-2 text-xs font-semibold text-stone-500">Claim withdrawable milestones</span></Link>
            <Link href="/Shelter/donations" className="rounded-2xl border border-orange-100 bg-[#FFFCC9]/35 p-4 text-sm font-black hover:border-[var(--color-orange)]">View donations <span className="block mt-2 text-xs font-semibold text-stone-500">Inspect confirmed transactions</span></Link>
          </div>
        </article>
        <RoleNFTBadge role="Shelter" roleNFT={roleNFT} />
      </section>
    </div>
  );
}
