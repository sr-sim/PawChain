import { NextRequest, NextResponse } from "next/server";
import {
  decodeEventLog,
  getAddress,
  type Address,
  type Hash,
  type Log,
} from "viem";
import { isAdminWallet } from "@/lib/admin-wallets";
import { walletSessionMatches } from "@/lib/wallet-session";
import {
  getCampaignFactoryAddress,
  getPawChainId,
  getPawChainPublicClient,
} from "@/lib/campaign-blockchain";
import { campaignContractAbi } from "@/lib/campaign-contract-abi";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  FinancialTransaction,
  FinancialTransactionType,
} from "@/lib/financial-transactions";

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
  milestoneIndex: bigint | null;
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

      if (decoded.eventName === "DonationReceived") {
        return {
          walletAddress: decoded.args.donor,
          amountWei: decoded.args.amount,
          milestoneIndex: null,
          logIndex: log.logIndex,
        };
      }
      if (decoded.eventName === "RefundClaimed") {
        return {
          walletAddress: decoded.args.donor,
          amountWei: decoded.args.amount,
          milestoneIndex: null,
          logIndex: log.logIndex,
        };
      }
      if (decoded.eventName === "FundsReleased") {
        if (
          candidate.milestoneIndex !== null &&
          decoded.args.milestoneIndex !== BigInt(candidate.milestoneIndex)
        ) {
          continue;
        }
        return {
          walletAddress: decoded.args.shelter,
          amountWei: decoded.args.amount,
          milestoneIndex: decoded.args.milestoneIndex,
          logIndex: log.logIndex,
        };
      }
    } catch {
      // Ignore unrelated logs in the same transaction receipt.
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const walletAddress = params.get("walletAddress") ?? "";
    if (!walletSessionMatches(request, walletAddress)) {
      return NextResponse.json({ message: "Wallet authentication is required." }, { status: 401 });
    }
    if (!(await isAdminWallet(walletAddress))) {
      return NextResponse.json({ message: "Access denied." }, { status: 403 });
    }

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
    const campaignMap = new Map(
      verifiedCampaigns.map((campaign) => [campaign.id, campaign]),
    );

    if (!campaignIds.length) {
      return NextResponse.json(emptyResponse(params));
    }

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
        .select(
          "id, campaign_id, title, on_chain_index, release_tx_hash",
        )
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

    const all = results.flatMap((result) =>
      result.status === "fulfilled" && result.value ? [result.value] : [],
    );
    if (candidates.length > 0 && all.length === 0) {
      const rpcFailures = results.filter(
        (result) => result.status === "rejected",
      ).length;
      if (rpcFailures === results.length) {
        throw new Error(
          "Unable to verify financial transactions with the configured blockchain RPC.",
        );
      }
    }

    return NextResponse.json(buildResponse(all, params));
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "Unable to load transactions.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

function emptyResponse(params: URLSearchParams) {
  return buildResponse([], params);
}

function buildResponse(
  all: FinancialTransaction[],
  params: URLSearchParams,
) {
  const type = params.get("type") ?? "all";
  const status = params.get("status") ?? "all";
  const search = (params.get("search") ?? "").trim().toLowerCase();
  const dateFrom = params.get("dateFrom");
  const dateTo = params.get("dateTo");
  const since = params.get("since");
  const filtered = all
    .filter((item) => type === "all" || item.transactionType === type)
    .filter((item) => status === "all" || item.status === status)
    .filter(
      (item) =>
        !search ||
        item.txHash.toLowerCase().includes(search) ||
        item.walletAddress.toLowerCase().includes(search) ||
        item.campaignTitle.toLowerCase().includes(search),
    )
    .filter(
      (item) => !dateFrom || new Date(item.occurredAt) >= new Date(dateFrom),
    )
    .filter(
      (item) => !dateTo || new Date(item.occurredAt) <= new Date(dateTo),
    )
    .filter((item) => !since || item.occurredAt > since)
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() -
        new Date(a.occurredAt).getTime(),
    );

  const summary = all.reduce(
    (result, item) => {
      const amountWei = BigInt(item.amountWei || "0");
      result.transactionCount++;
      if (item.transactionType === "donation") result.donationWei += amountWei;
      if (item.transactionType === "refund") result.refundWei += amountWei;
      if (item.transactionType === "fund_release")
        result.fundReleaseWei += amountWei;
      return result;
    },
    {
      donationMyr: 0,
      refundMyr: 0,
      fundReleaseMyr: 0,
      donationWei: BigInt(0),
      refundWei: BigInt(0),
      fundReleaseWei: BigInt(0),
      transactionCount: 0,
    },
  );
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const pageSize = Math.min(
    100,
    Math.max(10, Number(params.get("pageSize") ?? 25) || 25),
  );
  const transactions = since
    ? filtered.slice(0, 100)
    : filtered.slice((page - 1) * pageSize, page * pageSize);

  return {
    transactions,
    summary: {
      ...summary,
      donationWei: summary.donationWei.toString(),
      refundWei: summary.refundWei.toString(),
      fundReleaseWei: summary.fundReleaseWei.toString(),
    },
    pagination: {
      page,
      pageSize,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
    },
    latestCursor:
      transactions.reduce(
        (latest, item) =>
          item.occurredAt > latest ? item.occurredAt : latest,
        since ?? "",
      ) || new Date().toISOString(),
  };
}
