import "server-only";

import { campaignContractAbi } from "@/lib/campaign-contract-abi";
import { getPawChainPublicClient } from "@/lib/campaign-blockchain";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAddress, type Address } from "viem";

type CampaignWithStatus = {
  id: string;
  campaign_status: string;
  contract_address: string | null;
};

function toDatabaseStatus(onChainStatus: number) {
  if (onChainStatus === 0) return "active";
  if (onChainStatus === 1) return "completed";
  if (onChainStatus === 2 || onChainStatus === 3) return "closed";
  return null;
}

/**
 * Uses each deployed campaign contract as the lifecycle source of truth.
 * Confirmed differences are reconciled to Supabase. For campaigns without a
 * contract, or during a temporary RPC failure, the stored status is retained.
 */
export async function withLiveCampaignStatuses<T extends CampaignWithStatus>(
  campaigns: T[],
): Promise<T[]> {
  const publicClient = getPawChainPublicClient();
  const supabase = createAdminClient();

  return Promise.all(
    campaigns.map(async (campaign) => {
      if (
        !campaign.contract_address ||
        !isAddress(campaign.contract_address)
      ) {
        return campaign;
      }

      try {
        const onChainStatus = await publicClient.readContract({
          address: campaign.contract_address as Address,
          abi: campaignContractAbi,
          functionName: "campaignStatus",
        });
        const campaignStatus = toDatabaseStatus(Number(onChainStatus));

        if (!campaignStatus) return campaign;

        if (campaignStatus !== campaign.campaign_status) {
          const { error } = await supabase
            .from("campaigns")
            .update({
              campaign_status: campaignStatus,
              updated_at: new Date().toISOString(),
            })
            .eq("id", campaign.id);

          if (error) {
            console.error(
              `Unable to synchronize campaign ${campaign.id} status:`,
              error.message,
            );
          }
        }

        return { ...campaign, campaign_status: campaignStatus };
      } catch {
        return campaign;
      }
    }),
  );
}

export async function withLiveCampaignStatus<T extends CampaignWithStatus>(
  campaign: T,
): Promise<T> {
  const [resolvedCampaign] = await withLiveCampaignStatuses([campaign]);
  return resolvedCampaign;
}
