import { createAdminClient } from "@/lib/supabase/admin";
import { ensureCampaignCompletedNotification } from "@/lib/donor-notifications";
import { campaignContractAbi } from "@/lib/campaign-contract-abi";
import { getPawChainPublicClient } from "@/lib/campaign-blockchain";
import { formatEther, isAddress, type Address } from "viem";

type DonationRow = {
  id: string;
  donor_id: string;
  campaign_id: string;
  amount: number | string;
  amount_wei?: string | null;
  currency: string;
  tx_hash: string;
  contract_address?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type CampaignRow = {
  id: string;
  shelter_id: string;
  title: string;
  location: string;
  goal_amount: number | string;
  current_amount: number | string;
  campaign_status: string;
  contract_address?: string | null;
};

type OnChainCampaignSnapshot = {
  progress: number;
  status: string;
};

type ShelterRow = {
  user_id: string;
  shelter_name: string;
};

export type DonorDonation = {
  id: string;
  campaignId: string;
  campaignTitle: string;
  shelterId: string | null;
  shelterName: string;
  location: string;
  amount: number;
  amountEth: number;
  amountWei: string | null;
  currency: string;
  txHash: string;
  contractAddress: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  campaignProgress: number;
  campaignStatus: string;
};

export type DonorDonationSummary = {
  totalAmount: number;
  totalEth: number;
  currency: string;
  donationCount: number;
  confirmedCount: number;
  latestDonation: DonorDonation | null;
};

function toNumber(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeStatus(status: string) {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getOnChainStatusLabel(status: number) {
  if (status === 0) return "Active";
  if (status === 1) return "Completed";
  if (status === 2) return "Refunding";
  if (status === 3) return "Closed";
  return "On-chain";
}

function getCampaignProgress(campaign?: CampaignRow) {
  if (!campaign) {
    return 0;
  }

  if (campaign.campaign_status === "completed") {
    return 100;
  }

  const goal = toNumber(campaign.goal_amount);
  const current = toNumber(campaign.current_amount);

  if (goal <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((current / goal) * 100));
}

async function getOnChainCampaignSnapshots(campaigns: CampaignRow[]) {
  const contractCampaigns = campaigns.filter(
    (campaign) =>
      campaign.contract_address && isAddress(campaign.contract_address),
  );

  if (contractCampaigns.length === 0) {
    return new Map<string, OnChainCampaignSnapshot>();
  }

  const publicClient = getPawChainPublicClient();
  const entries = await Promise.all(
    contractCampaigns.map(async (campaign) => {
      try {
        const address = campaign.contract_address as Address;
        const [totalRaisedWei, goalWei, campaignStatus] = await Promise.all([
          publicClient.readContract({
            address,
            abi: campaignContractAbi,
            functionName: "totalRaised",
          }),
          publicClient.readContract({
            address,
            abi: campaignContractAbi,
            functionName: "goal",
          }),
          publicClient.readContract({
            address,
            abi: campaignContractAbi,
            functionName: "campaignStatus",
          }),
        ]);
        const totalRaisedEth = Number(formatEther(totalRaisedWei));
        const goalEth = Number(formatEther(goalWei));
        const status = getOnChainStatusLabel(Number(campaignStatus));
        const progress =
          status === "Completed"
            ? 100
            : goalEth > 0
              ? Math.min(100, Math.round((totalRaisedEth / goalEth) * 100))
              : 0;

        return [campaign.id, { progress, status }] as const;
      } catch {
        return null;
      }
    }),
  );

  return new Map(entries.filter(Boolean) as [string, OnChainCampaignSnapshot][]);
}

export async function getDonorDonations(walletAddress?: string) {
  const empty = {
    donations: [] as DonorDonation[],
    summary: {
      totalAmount: 0,
      totalEth: 0,
      currency: "MYR",
      donationCount: 0,
      confirmedCount: 0,
      latestDonation: null,
    } satisfies DonorDonationSummary,
  };

  if (!walletAddress) {
    return empty;
  }

  const supabase = createAdminClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .ilike("wallet_address", walletAddress)
    .eq("role", "donor")
    .maybeSingle();

  if (profileError || !profile) {
    return empty;
  }

  const { data: donationRows, error: donationError } = await supabase
    .from("donations")
    .select(
      "id, donor_id, campaign_id, amount, amount_wei, currency, tx_hash, contract_address, status, created_at, updated_at",
    )
    .eq("donor_id", profile.id)
    .order("created_at", { ascending: false });

  if (donationError || !donationRows?.length) {
    return empty;
  }

  const donationsData = donationRows as DonationRow[];
  const campaignIds = [...new Set(donationsData.map((item) => item.campaign_id))];
  const { data: campaignRows } = await supabase
    .from("campaigns")
    .select(
      "id, shelter_id, title, location, goal_amount, current_amount, campaign_status, contract_address",
    )
    .in("id", campaignIds);

  const campaigns = ((campaignRows ?? []) as CampaignRow[]).reduce(
    (map, campaign) => map.set(campaign.id, campaign),
    new Map<string, CampaignRow>(),
  );
  const shelterIds = [
    ...new Set(
      [...campaigns.values()]
        .map((campaign) => campaign.shelter_id)
        .filter(Boolean),
    ),
  ];
  const { data: shelterRows } = shelterIds.length
    ? await supabase
        .from("shelter_applications")
        .select("user_id, shelter_name")
        .in("user_id", shelterIds)
    : { data: [] };
  const shelters = ((shelterRows ?? []) as ShelterRow[]).reduce(
    (map, shelter) => map.set(shelter.user_id, shelter.shelter_name),
    new Map<string, string>(),
  );
  const onChainSnapshots = await getOnChainCampaignSnapshots([
    ...campaigns.values(),
  ]);

  const donations = donationsData.map((donation) => {
    const campaign = campaigns.get(donation.campaign_id);
    const onChainSnapshot = campaign
      ? onChainSnapshots.get(campaign.id)
      : undefined;
    const amount = toNumber(donation.amount);
    const amountEth = donation.amount_wei
      ? Number(formatEther(BigInt(donation.amount_wei)))
      : 0;

    return {
      id: donation.id,
      campaignId: donation.campaign_id,
      campaignTitle: campaign?.title ?? "Campaign unavailable",
      shelterId: campaign?.shelter_id ?? null,
      shelterName: campaign?.shelter_id
        ? shelters.get(campaign.shelter_id) ?? "Verified shelter"
        : "Verified shelter",
      location: campaign?.location ?? "-",
      amount,
      amountEth,
      amountWei: donation.amount_wei ?? null,
      currency: donation.currency ?? "MYR",
      txHash: donation.tx_hash,
      contractAddress: donation.contract_address ?? null,
      status: normalizeStatus(donation.status),
      createdAt: donation.created_at,
      updatedAt: donation.updated_at,
      campaignProgress: onChainSnapshot?.progress ?? getCampaignProgress(campaign),
      campaignStatus:
        onChainSnapshot?.status ??
        (campaign ? normalizeStatus(campaign.campaign_status) : "Unavailable"),
    };
  });

  await Promise.all(
    donations
      .filter(
        (donation) =>
          donation.campaignStatus === "Completed" &&
          !["Failed", "Refunded"].includes(donation.status),
      )
      .map((donation) =>
        ensureCampaignCompletedNotification({
          donorId: profile.id,
          campaignId: donation.campaignId,
          campaignTitle: donation.campaignTitle,
        }),
      ),
  );

  const confirmedDonations = donations.filter(
    (donation) => !["Failed", "Refunded"].includes(donation.status),
  );
  const totalAmount = confirmedDonations.reduce(
    (total, donation) => total + donation.amount,
    0,
  );
  const totalEth = confirmedDonations.reduce(
    (total, donation) => total + donation.amountEth,
    0,
  );

  return {
    donations,
    summary: {
      totalAmount,
      totalEth,
      currency: donations[0]?.currency ?? "MYR",
      donationCount: donations.length,
      confirmedCount: confirmedDonations.length,
      latestDonation: donations[0] ?? null,
    },
  };
}

export async function getDonorDonationById(
  donationId: string,
  walletAddress?: string,
) {
  if (!donationId || !walletAddress) {
    return null;
  }

  const { donations } = await getDonorDonations(walletAddress);

  return donations.find((donation) => donation.id === donationId) ?? null;
}
