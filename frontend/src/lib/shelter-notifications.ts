import "server-only";

import { formatEther } from "viem";
import { createAdminClient } from "@/lib/supabase/admin";

type NotificationStatus = "info" | "success" | "warning" | "urgent";

type ShelterNotification = {
  shelter_id: string;
  campaign_id: string | null;
  event_key: string;
  title: string;
  message: string;
  status: NotificationStatus;
  created_at?: string;
};

function readableAmount(amountWei: string | null, fallback: number | string) {
  if (amountWei) {
    try {
      return `${Number(formatEther(BigInt(amountWei))).toLocaleString("en-MY", {
        maximumFractionDigits: 8,
      })} ETH`;
    } catch {
      // Use the stored amount when legacy data does not contain valid wei.
    }
  }

  return `${Number(fallback || 0).toLocaleString("en-MY", {
    maximumFractionDigits: 8,
  })} ETH`;
}

export async function syncShelterNotifications(shelterId: string) {
  const supabase = createAdminClient();
  const { data: campaigns, error: campaignError } = await supabase
    .from("campaigns")
    .select("id, title, campaign_status, rejection_reason, created_at, updated_at")
    .eq("shelter_id", shelterId);

  if (campaignError) throw campaignError;
  if (!campaigns?.length) return;

  const campaignIds = campaigns.map((campaign) => campaign.id);
  const campaignTitles = new Map(
    campaigns.map((campaign) => [campaign.id, campaign.title]),
  );
  const [{ data: donations, error: donationError }, { data: milestones, error: milestoneError }] =
    await Promise.all([
      supabase
        .from("donations")
        .select("id, campaign_id, amount, amount_wei, refund_tx_hash, status, created_at, refunded_at")
        .in("campaign_id", campaignIds),
      supabase
        .from("campaign_milestones")
        .select("id, campaign_id, title, status, rejection_reason, release_tx_hash, created_at")
        .in("campaign_id", campaignIds),
    ]);

  if (donationError) throw donationError;
  if (milestoneError) throw milestoneError;

  const notifications: ShelterNotification[] = [];

  campaigns.forEach((campaign) => {
    if (campaign.campaign_status === "active") {
      notifications.push({
        shelter_id: shelterId,
        campaign_id: campaign.id,
        event_key: `campaign:${campaign.id}:active`,
        title: "Campaign approved",
        message: `${campaign.title} is approved and visible to donors. You can now monitor donations and prepare milestone evidence.`,
        status: "success",
        created_at: campaign.updated_at ?? campaign.created_at,
      });
    } else if (campaign.campaign_status === "rejected") {
      notifications.push({
        shelter_id: shelterId,
        campaign_id: campaign.id,
        event_key: `campaign:${campaign.id}:rejected`,
        title: "Campaign needs revision",
        message: campaign.rejection_reason
          ? `${campaign.title} was returned for revision: ${campaign.rejection_reason}`
          : `${campaign.title} was returned for revision. Open the campaign to review and resubmit it.`,
        status: "warning",
        created_at: campaign.updated_at ?? campaign.created_at,
      });
    } else if (["closed", "cancelled", "expired"].includes(campaign.campaign_status)) {
      notifications.push({
        shelter_id: shelterId,
        campaign_id: campaign.id,
        event_key: `campaign:${campaign.id}:${campaign.campaign_status}`,
        title: "Campaign closed",
        message: `${campaign.title} is now ${campaign.campaign_status}. Any eligible locked funds are reserved for donor refunds.`,
        status: "urgent",
        created_at: campaign.updated_at ?? campaign.created_at,
      });
    }
  });

  (donations ?? []).forEach((donation) => {
    const campaignTitle = campaignTitles.get(donation.campaign_id) ?? "your campaign";
    const amount = readableAmount(donation.amount_wei, donation.amount);

    if (donation.refund_tx_hash || donation.status.toLowerCase().includes("refund")) {
      notifications.push({
        shelter_id: shelterId,
        campaign_id: donation.campaign_id,
        event_key: `donation:${donation.id}:refunded`,
        title: "Donor refund completed",
        message: `${amount} was returned to a donor from ${campaignTitle}. The transaction is available in your refund ledger.`,
        status: "info",
        created_at: donation.refunded_at ?? donation.created_at,
      });
    } else if (["confirmed", "completed", "success"].includes(donation.status.toLowerCase())) {
      notifications.push({
        shelter_id: shelterId,
        campaign_id: donation.campaign_id,
        event_key: `donation:${donation.id}:received`,
        title: "New donation received",
        message: `${campaignTitle} received ${amount}. The confirmed transaction is now included in your donation ledger.`,
        status: "success",
        created_at: donation.created_at,
      });
    }
  });

  (milestones ?? []).forEach((milestone) => {
    const campaignTitle = campaignTitles.get(milestone.campaign_id) ?? "your campaign";
    const normalizedStatus = milestone.status.toLowerCase();

    if (milestone.release_tx_hash) {
      notifications.push({
        shelter_id: shelterId,
        campaign_id: milestone.campaign_id,
        event_key: `milestone:${milestone.id}:released`,
        title: "Milestone funds released",
        message: `${milestone.title} for ${campaignTitle} has been released on-chain.`,
        status: "success",
        created_at: milestone.created_at,
      });
    } else if (normalizedStatus === "approved") {
      notifications.push({
        shelter_id: shelterId,
        campaign_id: milestone.campaign_id,
        event_key: `milestone:${milestone.id}:approved`,
        title: "Milestone approved",
        message: `${milestone.title} for ${campaignTitle} was approved. Check the campaign for the next available action.`,
        status: "success",
        created_at: milestone.created_at,
      });
    } else if (normalizedStatus === "rejected") {
      notifications.push({
        shelter_id: shelterId,
        campaign_id: milestone.campaign_id,
        event_key: `milestone:${milestone.id}:rejected`,
        title: "Milestone evidence needs revision",
        message: milestone.rejection_reason
          ? `${milestone.title} for ${campaignTitle} needs revision: ${milestone.rejection_reason}`
          : `${milestone.title} for ${campaignTitle} needs revised evidence.`,
        status: "warning",
        created_at: milestone.created_at,
      });
    }
  });

  if (!notifications.length) return;

  const { error } = await supabase
    .from("shelter_notifications")
    .upsert(notifications, {
      onConflict: "shelter_id,event_key",
      ignoreDuplicates: true,
    });

  if (error) throw error;
}

