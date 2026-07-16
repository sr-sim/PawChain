import { createAdminClient } from "@/lib/supabase/admin";

type DonationRow = {
  id: string;
  donor_id: string;
  campaign_id: string;
  amount: number | string;
  currency: string;
  tx_hash: string;
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
  currency: string;
  txHash: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  campaignProgress: number;
};

export type DonorDonationSummary = {
  totalAmount: number;
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

function getCampaignProgress(campaign?: CampaignRow) {
  if (!campaign) {
    return 0;
  }

  const goal = toNumber(campaign.goal_amount);
  const current = toNumber(campaign.current_amount);

  if (goal <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((current / goal) * 100));
}

export async function getDonorDonations(walletAddress?: string) {
  const empty = {
    donations: [] as DonorDonation[],
    summary: {
      totalAmount: 0,
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
      "id, donor_id, campaign_id, amount, currency, tx_hash, status, created_at, updated_at",
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
      "id, shelter_id, title, location, goal_amount, current_amount, campaign_status",
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

  const donations = donationsData.map((donation) => {
    const campaign = campaigns.get(donation.campaign_id);
    const amount = toNumber(donation.amount);

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
      currency: donation.currency ?? "MYR",
      txHash: donation.tx_hash,
      status: normalizeStatus(donation.status),
      createdAt: donation.created_at,
      updatedAt: donation.updated_at,
      campaignProgress: getCampaignProgress(campaign),
    };
  });
  const confirmedDonations = donations.filter(
    (donation) => !["Failed", "Refunded"].includes(donation.status),
  );
  const totalAmount = confirmedDonations.reduce(
    (total, donation) => total + donation.amount,
    0,
  );

  return {
    donations,
    summary: {
      totalAmount,
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
