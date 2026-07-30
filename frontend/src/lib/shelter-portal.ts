import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { withLiveCampaignStatuses } from "@/lib/shelter-campaign-status";

export type ShelterCampaignRecord = {
  id: string;
  title: string;
  goal_amount: number | string;
  current_amount: number | string | null;
  campaign_status: string;
  contract_address: string | null;
  eth_myr_rate: number | string | null;
  created_at: string;
};

export type ShelterMilestoneRecord = {
  id: string;
  campaign_id: string;
  title: string;
  percentage: number | string;
  status: string;
  proof_tx_hash: string | null;
  release_tx_hash: string | null;
  on_chain_index: number | null;
  created_at: string;
};

export type ShelterDonationRecord = {
  id: string;
  campaign_id: string;
  donor_id: string;
  amount: number | string;
  amount_wei: string | null;
  currency: string;
  tx_hash: string;
  refund_tx_hash: string | null;
  refunded_at: string | null;
  status: string;
  created_at: string;
  donor_name: string | null;
};

export async function getShelterPortalData(userId?: string | null) {
  const empty = {
    campaigns: [] as ShelterCampaignRecord[],
    milestones: [] as ShelterMilestoneRecord[],
    donations: [] as ShelterDonationRecord[],
  };

  if (!userId) return empty;

  const supabase = createAdminClient();
  const { data: campaignRows, error: campaignError } = await supabase
    .from("campaigns")
    .select("id, title, goal_amount, current_amount, campaign_status, contract_address, eth_myr_rate, created_at")
    .eq("shelter_id", userId)
    .order("created_at", { ascending: false });

  if (campaignError || !campaignRows?.length) return empty;

  const campaigns = await withLiveCampaignStatuses(
    campaignRows as ShelterCampaignRecord[],
  );
  const campaignIds = campaigns.map((campaign) => campaign.id);
  const [{ data: milestoneRows }, { data: donationRows }] = await Promise.all([
    supabase
      .from("campaign_milestones")
      .select("id, campaign_id, title, percentage, status, proof_tx_hash, release_tx_hash, on_chain_index, created_at")
      .in("campaign_id", campaignIds)
      .order("on_chain_index", { ascending: true }),
    supabase
      .from("donations")
      .select("id, campaign_id, donor_id, amount, amount_wei, currency, tx_hash, refund_tx_hash, refunded_at, status, created_at")
      .in("campaign_id", campaignIds)
      .order("created_at", { ascending: false }),
  ]);

  const rawDonations = (donationRows ?? []) as Omit<ShelterDonationRecord, "donor_name">[];
  const donorIds = [...new Set(rawDonations.map((donation) => donation.donor_id).filter(Boolean))];
  const { data: donorProfiles } = donorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", donorIds)
    : { data: [] };
  const donorNames = new Map(
    (donorProfiles ?? []).map((profile) => [
      String(profile.id),
      typeof profile.full_name === "string" ? profile.full_name : null,
    ]),
  );

  return {
    campaigns,
    milestones: (milestoneRows ?? []) as ShelterMilestoneRecord[],
    donations: rawDonations.map((donation) => ({
      ...donation,
      donor_name: donorNames.get(donation.donor_id) ?? null,
    })),
  };
}

export function shortAddress(value?: string | null) {
  if (!value) return "Not connected";
  return value.length > 14 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;
}

export function formatMYR(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return `MYR ${new Intl.NumberFormat("en-MY", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0)}`;
}

export function sepoliaTxUrl(hash?: string | null) {
  return hash ? `https://sepolia.etherscan.io/tx/${hash}` : null;
}
