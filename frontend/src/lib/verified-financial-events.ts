import {
  decodeEventLog,
  getAddress,
  type Address,
  type Hash,
  type Log,
} from "viem";
import {
  getCampaignFactoryAddress,
  getPawChainId,
  getPawChainPublicClient,
} from "@/lib/campaign-blockchain";
import { campaignContractAbi } from "@/lib/campaign-contract-abi";
import type {
  FinancialTransaction,
  FinancialTransactionType,
} from "@/lib/financial-transactions";
import { createAdminClient } from "@/lib/supabase/admin";

const validHash = (value: unknown): value is Hash =>
  typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value);

const validAddress = (value: unknown): value is Address =>
  typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value);

type Candidate = {
  id: string;
  txHash: Hash;
  transactionType: FinancialTransactionType;
  campaignId: string;
  campaignTitle: string;
  contractAddress: Address;
  milestoneId: string | null;
  milestoneTitle: string | null;
  milestoneIndex: number | null;
};

type DecodedFinancialEvent = {
  walletAddress: Address;
  amountWei: bigint;
  logIndex: number;
};

function decodeFinancialEvent(
  logs: readonly Log[],
  candidate: Candidate,
): DecodedFinancialEvent | null {
  const expectedEvent = {
    donation: "DonationReceived",
    refund: "RefundClaimed",
    fund_release: "FundsReleased",
  }[candidate.transactionType];

  for (const log of logs) {
    if (
      getAddress(log.address) !== getAddress(candidate.contractAddress) ||
      log.logIndex === null
    ) {
      continue;
    }

    try {
      const decoded = decodeEventLog({
        abi: campaignContractAbi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName !== expectedEvent) continue;

      if (
        decoded.eventName === "FundsReleased" &&
        candidate.milestoneIndex !== null &&
        decoded.args.milestoneIndex !== BigInt(candidate.milestoneIndex)
      ) {
        continue;
      }

      if (decoded.eventName === "DonationReceived") {
        return {
          walletAddress: decoded.args.donor,
          amountWei: decoded.args.amount,
          logIndex: log.logIndex,
        };
      }
      if (decoded.eventName === "RefundClaimed") {
        return {
          walletAddress: decoded.args.donor,
          amountWei: decoded.args.amount,
          logIndex: log.logIndex,
        };
      }
      if (decoded.eventName === "FundsReleased") {
        return {
          walletAddress: decoded.args.shelter,
          amountWei: decoded.args.amount,
          logIndex: log.logIndex,
        };
      }
    } catch {
      // A receipt can contain unrelated logs; only the expected campaign event counts.
    }
  }

  return null;
}

export async function getVerifiedFinancialEvents(): Promise<
  FinancialTransaction[]
> {
  const currentFactory = getCampaignFactoryAddress();
  const currentChainId = getPawChainId();
  const publicClient = getPawChainPublicClient();
  const supabase = createAdminClient();

  const { data: campaigns, error: campaignError } = await supabase
    .from("campaigns")
    .select("id, title, contract_address, factory_address, chain_id")
    .ilike("factory_address", currentFactory)
    .eq("chain_id", currentChainId);
  if (campaignError) throw campaignError;

  const verifiedCampaigns = (campaigns ?? []).filter((campaign) =>
    validAddress(campaign.contract_address),
  );
  const campaignIds = verifiedCampaigns.map((campaign) => campaign.id);
  if (!campaignIds.length) return [];

  const campaignMap = new Map(
    verifiedCampaigns.map((campaign) => [campaign.id, campaign]),
  );
  const [
    { data: donations, error: donationError },
    { data: milestones, error: milestoneError },
  ] = await Promise.all([
    supabase
      .from("donations")
      .select("id, campaign_id, tx_hash, refund_tx_hash")
      .in("campaign_id", campaignIds),
    supabase
      .from("campaign_milestones")
      .select("id, campaign_id, title, on_chain_index, release_tx_hash")
      .in("campaign_id", campaignIds)
      .not("release_tx_hash", "is", null),
  ]);
  if (donationError) throw donationError;
  if (milestoneError) throw milestoneError;

  const candidates: Candidate[] = [];
  for (const donation of donations ?? []) {
    const campaign = campaignMap.get(donation.campaign_id);
    if (!campaign || !validAddress(campaign.contract_address)) continue;

    if (validHash(donation.tx_hash)) {
      candidates.push({
        id: `donation-${donation.id}`,
        txHash: donation.tx_hash,
        transactionType: "donation",
        campaignId: campaign.id,
        campaignTitle: campaign.title,
        contractAddress: campaign.contract_address,
        milestoneId: null,
        milestoneTitle: null,
        milestoneIndex: null,
      });
    }
    if (validHash(donation.refund_tx_hash)) {
      candidates.push({
        id: `refund-${donation.id}`,
        txHash: donation.refund_tx_hash,
        transactionType: "refund",
        campaignId: campaign.id,
        campaignTitle: campaign.title,
        contractAddress: campaign.contract_address,
        milestoneId: null,
        milestoneTitle: null,
        milestoneIndex: null,
      });
    }
  }

  for (const milestone of milestones ?? []) {
    const campaign = campaignMap.get(milestone.campaign_id);
    if (
      !campaign ||
      !validAddress(campaign.contract_address) ||
      !validHash(milestone.release_tx_hash)
    ) {
      continue;
    }
    candidates.push({
      id: `release-${milestone.id}`,
      txHash: milestone.release_tx_hash,
      transactionType: "fund_release",
      campaignId: campaign.id,
      campaignTitle: campaign.title,
      contractAddress: campaign.contract_address,
      milestoneId: milestone.id,
      milestoneTitle: milestone.title,
      milestoneIndex: Number(milestone.on_chain_index),
    });
  }

  const blockTimes = new Map<bigint, Promise<string>>();
  const getBlockTime = (blockNumber: bigint) => {
    let request = blockTimes.get(blockNumber);
    if (!request) {
      request = publicClient
        .getBlock({ blockNumber })
        .then((block) => new Date(Number(block.timestamp) * 1000).toISOString());
      blockTimes.set(blockNumber, request);
    }
    return request;
  };

  const results = await Promise.allSettled(
    candidates.map(async (candidate): Promise<FinancialTransaction | null> => {
      const receipt = await publicClient.getTransactionReceipt({
        hash: candidate.txHash,
      });
      if (receipt.status !== "success") return null;

      const event = decodeFinancialEvent(receipt.logs, candidate);
      if (!event) return null;

      return {
        id: `${candidate.id}-${event.logIndex}`,
        txHash: candidate.txHash,
        transactionType: candidate.transactionType,
        campaignId: candidate.campaignId,
        campaignTitle: candidate.campaignTitle,
        milestoneId: candidate.milestoneId,
        milestoneTitle: candidate.milestoneTitle,
        walletAddress: event.walletAddress,
        amountWei: event.amountWei.toString(),
        amountMyr: null,
        chainId: currentChainId,
        blockNumber: Number(receipt.blockNumber),
        logIndex: event.logIndex,
        occurredAt: await getBlockTime(receipt.blockNumber),
        status: "confirmed",
        verifiedOnChain: true,
      };
    }),
  );

  const verified = results.flatMap((result) =>
    result.status === "fulfilled" && result.value ? [result.value] : [],
  );
  if (
    candidates.length > 0 &&
    verified.length === 0 &&
    results.every((result) => result.status === "rejected")
  ) {
    throw new Error(
      "Unable to verify financial transactions with the configured blockchain RPC.",
    );
  }
  return verified;
}
