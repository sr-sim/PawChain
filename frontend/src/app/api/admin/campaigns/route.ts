import { NextRequest, NextResponse } from "next/server";
import { isAdminWallet } from "@/lib/admin-wallets";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  campaignKeyFromId,
  getCampaignFactoryAddress,
  getPawChainId,
  getPawChainPublicClient,
} from "@/lib/campaign-blockchain";
import { campaignFactoryAbi } from "@/lib/campaign-factory-abi";
import { campaignContractAbi } from "@/lib/campaign-contract-abi";
import {
  decodeEventLog,
  isAddress,
  type Address,
  type Hash,
} from "viem";

async function authorize(walletAddress: string) {
  if (!(await isAdminWallet(walletAddress))) {
    throw new Error("ADMIN_DENIED");
  }
  return createAdminClient();
}

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.nextUrl.searchParams.get("walletAddress") ?? "";
    const supabase = await authorize(walletAddress);
    const { data: campaigns, error } = await supabase
      .from("campaigns")
      .select("id, shelter_id, title, description, goal_amount, current_amount, urgency_level, campaign_status, duration_days, image_url, contract_address, goal_wei, chain_id, factory_address, deployment_tx_hash, cancellation_tx_hash, cancelled_at, cancelled_by, on_chain_campaign_key, eth_myr_rate, blockchain_deadline, created_at, updated_at, rejection_reason, campaign_milestones(id, campaign_id, title, description, requirement, percentage, status, proof_url, rejection_reason, on_chain_index, proof_cid, proof_tx_hash, review_tx_hash, release_tx_hash, created_at, updated_at)")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const shelterIds = [...new Set((campaigns ?? []).map((item) => item.shelter_id))];
    const { data: profiles } = shelterIds.length
      ? await supabase.from("profiles").select("id, full_name, wallet_address").in("id", shelterIds)
      : { data: [] };
    const profileMap = new Map((profiles ?? []).map((item) => [item.id, item.full_name]));
    const walletMap = new Map((profiles ?? []).map((item) => [item.id, item.wallet_address]));
    const campaignIds = (campaigns ?? []).map((item) => item.id);
    const { data: donationRows } = campaignIds.length
      ? await supabase
          .from("donations")
          .select("campaign_id, amount, amount_wei, status, tx_hash, refund_tx_hash, refunded_at")
          .in("campaign_id", campaignIds)
      : { data: [] };
    const refundSummary = new Map<
      string,
      {
        donationCount: number;
        refundedCount: number;
        donatedAmount: number;
        refundedDonationAmount: number;
        refundedDonationAmountWei: string;
        latestRefundTxHash: string | null;
        latestRefundedAt: string | null;
      }
    >();

    (donationRows ?? []).forEach((donation) => {
      const existing =
        refundSummary.get(donation.campaign_id) ?? {
          donationCount: 0,
          refundedCount: 0,
          donatedAmount: 0,
          refundedDonationAmount: 0,
          refundedDonationAmountWei: "0",
          latestRefundTxHash: null,
          latestRefundedAt: null,
        };

      existing.donationCount += 1;
      existing.donatedAmount += Number(donation.amount ?? 0);

      if (donation.refund_tx_hash) {
        existing.refundedCount += 1;
        existing.refundedDonationAmount += Number(donation.amount ?? 0);
        existing.refundedDonationAmountWei = (
          BigInt(existing.refundedDonationAmountWei) +
          BigInt(String(donation.amount_wei ?? "0"))
        ).toString();

        if (
          !existing.latestRefundedAt ||
          (donation.refunded_at &&
            new Date(donation.refunded_at).getTime() >
              new Date(existing.latestRefundedAt).getTime())
        ) {
          existing.latestRefundTxHash = donation.refund_tx_hash;
          existing.latestRefundedAt = donation.refunded_at ?? null;
        }
      }

      refundSummary.set(donation.campaign_id, existing);
    });

    const publicClient = getPawChainPublicClient();
    const onChainCampaigns = await Promise.all(
      (campaigns ?? []).map(async (item) => {
        if (!item.contract_address || !isAddress(item.contract_address)) {
          return {
            ...item,
            on_chain_total_raised_wei: null,
            on_chain_goal_wei: null,
            on_chain_status: null,
          };
        }
        try {
          const [totalRaised, goal, campaignStatus] = await Promise.all([
            publicClient.readContract({
              address: item.contract_address as Address,
              abi: campaignContractAbi,
              functionName: "totalRaised",
            }),
            publicClient.readContract({
              address: item.contract_address as Address,
              abi: campaignContractAbi,
              functionName: "goal",
            }),
            publicClient.readContract({
              address: item.contract_address as Address,
              abi: campaignContractAbi,
              functionName: "campaignStatus",
            }),
          ]);
          return {
            ...item,
            on_chain_total_raised_wei: totalRaised.toString(),
            on_chain_goal_wei: goal.toString(),
            on_chain_status: Number(campaignStatus),
          };
        } catch {
          return {
            ...item,
            on_chain_total_raised_wei: null,
            on_chain_goal_wei: null,
            on_chain_status: null,
          };
        }
      }),
    );
    return NextResponse.json({
      campaigns: onChainCampaigns.map((item) => ({
        ...item,
        location: null,
        shelter_name: profileMap.get(item.shelter_id) ?? null,
        shelter_wallet: walletMap.get(item.shelter_id) ?? null,
        refund_summary:
          refundSummary.get(item.id) ?? {
            donationCount: 0,
            refundedCount: 0,
            donatedAmount: 0,
            refundedDonationAmount: 0,
            refundedDonationAmountWei: "0",
            latestRefundTxHash: null,
            latestRefundedAt: null,
          },
      })),
    });
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "Unable to load campaigns.";
    return NextResponse.json(
      { message: message === "ADMIN_DENIED" ? "Access denied." : message },
      { status: message === "ADMIN_DENIED" ? 403 : 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const walletAddress = String(body.walletAddress ?? "");
    const campaignId = String(body.campaignId ?? "");
    const action = String(body.action ?? "");
    const reason = String(body.rejectionReason ?? "").trim();
    const txHash = String(body.txHash ?? "").trim();
    const goalWei = String(body.goalWei ?? "").trim();
    const ethMyrRate = Number(body.ethMyrRate);
    const deadline = Number(body.deadline);
    if (
      !campaignId ||
      !["approve", "reject", "cancel", "finalize_expired"].includes(action)
    ) {
      return NextResponse.json({ message: "Invalid campaign action." }, { status: 400 });
    }
    if (action === "reject" && !reason) {
      return NextResponse.json({ message: "A rejection reason is required." }, { status: 400 });
    }
    const supabase = await authorize(walletAddress);
    const { data: campaign, error: lookupError } = await supabase
      .from("campaigns").select("id, shelter_id, campaign_status, deployment_tx_hash, contract_address, cancellation_tx_hash, cancelled_at, cancelled_by").eq("id", campaignId).single();
    if (lookupError) throw lookupError;

    if (action === "cancel" || action === "finalize_expired") {
      if (campaign.campaign_status === "closed") {
        return NextResponse.json({
          status: "closed",
          cancellationTxHash: campaign.cancellation_tx_hash,
          cancelledAt: campaign.cancelled_at,
          cancelledBy: campaign.cancelled_by,
          idempotent: true,
        });
      }
      if (
        campaign.campaign_status !== "active" ||
        !campaign.contract_address ||
        !isAddress(campaign.contract_address) ||
        !/^0x[0-9a-fA-F]{64}$/.test(txHash)
      ) {
        return NextResponse.json(
          {
            message:
              action === "cancel"
                ? "Only an active on-chain campaign can be cancelled."
                : "Only an active on-chain campaign can be finalized.",
          },
          { status: 409 },
        );
      }

      const publicClient = getPawChainPublicClient();
      const receipt = await publicClient.getTransactionReceipt({
        hash: txHash as Hash,
      });
      if (
        receipt.status !== "success" ||
        receipt.from.toLowerCase() !== walletAddress.toLowerCase() ||
        receipt.to?.toLowerCase() !== campaign.contract_address.toLowerCase()
      ) {
        return NextResponse.json(
          {
            message:
              action === "cancel"
                ? "The cancellation transaction does not match this campaign."
                : "The expiry transaction does not match this campaign.",
          },
          { status: 409 },
        );
      }
      const onChainStatus = await publicClient.readContract({
        address: campaign.contract_address as Address,
        abi: campaignContractAbi,
        functionName: "campaignStatus",
      });
      const expectedStatus = action === "cancel" ? 3 : 2;
      if (Number(onChainStatus) !== expectedStatus) {
        return NextResponse.json(
          {
            message:
              action === "cancel"
                ? "Campaign is not cancelled on-chain."
                : "Campaign is not refunding on-chain.",
          },
          { status: 409 },
        );
      }

      let adminProfileId: string | null = null;
      if (action === "cancel") {
        const { data: adminProfile, error: adminProfileError } = await supabase
          .from("profiles")
          .select("id")
          .ilike("wallet_address", walletAddress)
          .maybeSingle();
        if (adminProfileError) throw adminProfileError;
        adminProfileId = adminProfile?.id ?? null;
      }
      const changedAt = new Date().toISOString();
      const { error: cancelError } = await supabase
        .from("campaigns")
        .update(
          action === "cancel"
            ? {
                campaign_status: "closed",
                cancellation_tx_hash: txHash,
                cancelled_at: changedAt,
                cancelled_by: adminProfileId,
                updated_at: changedAt,
              }
            : {
                campaign_status: "closed",
                updated_at: changedAt,
              },
        )
        .eq("id", campaignId);
      if (cancelError) throw cancelError;
      return NextResponse.json({
        status: "closed",
        cancellationTxHash: action === "cancel" ? txHash : null,
        cancelledAt: action === "cancel" ? changedAt : null,
        cancelledBy: adminProfileId,
      });
    }

    if (
      action === "approve" &&
      campaign.campaign_status === "active" &&
      campaign.deployment_tx_hash?.toLowerCase() === txHash.toLowerCase()
    ) {
      return NextResponse.json({ status: "active", idempotent: true });
    }

    if (campaign.campaign_status !== "pending_approval") {
      return NextResponse.json({ message: "Only pending campaigns can be reviewed." }, { status: 409 });
    }

    if (action === "reject") {
      const { error } = await supabase.from("campaigns").update({
        campaign_status: "rejected",
        rejection_reason: reason,
        updated_at: new Date().toISOString(),
      }).eq("id", campaignId);
      if (error) throw error;
      return NextResponse.json({ status: "rejected" });
    }

    if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
      return NextResponse.json({ message: "A valid deployment transaction hash is required." }, { status: 400 });
    }
    if (!/^\d+$/.test(goalWei) || BigInt(goalWei) <= BigInt(0)) {
      return NextResponse.json({ message: "A valid on-chain goal is required." }, { status: 400 });
    }
    if (!Number.isFinite(ethMyrRate) || ethMyrRate <= 0 || !Number.isInteger(deadline)) {
      return NextResponse.json({ message: "Blockchain conversion data is invalid." }, { status: 400 });
    }

    const { data: shelterProfile, error: shelterError } = await supabase
      .from("profiles")
      .select("wallet_address")
      .eq("id", campaign.shelter_id)
      .single();
    if (shelterError) throw shelterError;
    if (!shelterProfile.wallet_address || !isAddress(shelterProfile.wallet_address)) {
      return NextResponse.json({ message: "The shelter wallet address is invalid." }, { status: 409 });
    }

    const factoryAddress = getCampaignFactoryAddress();
    const publicClient = getPawChainPublicClient();
    let factoryFlowVersion: bigint;
    try {
      factoryFlowVersion = await publicClient.readContract({
        address: factoryAddress,
        abi: campaignFactoryAbi,
        functionName: "FLOW_VERSION",
      });
    } catch {
      return NextResponse.json(
        {
          message:
            "The configured factory is not the sequential flow factory. Deploy it and update NEXT_PUBLIC_CAMPAIGN_FACTORY_ADDRESS first.",
        },
        { status: 409 },
      );
    }
    if (factoryFlowVersion !== BigInt(2)) {
      return NextResponse.json(
        { message: "CampaignFactory flow version 2 is required." },
        { status: 409 },
      );
    }
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash as Hash });
    if (receipt.status !== "success" || receipt.from.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json({ message: "The deployment transaction was not sent successfully by this admin." }, { status: 409 });
    }

    const campaignKey = campaignKeyFromId(campaignId);
    let createdCampaign: Address | null = null;

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== factoryAddress.toLowerCase()) continue;
      try {
        const decoded = decodeEventLog({
          abi: campaignFactoryAbi,
          data: log.data,
          topics: log.topics,
        });
        if (
          decoded.eventName === "CampaignCreated" &&
          decoded.args.campaignKey === campaignKey &&
          decoded.args.shelter.toLowerCase() === shelterProfile.wallet_address.toLowerCase() &&
          decoded.args.admin.toLowerCase() === walletAddress.toLowerCase() &&
          decoded.args.goal === BigInt(goalWei) &&
          decoded.args.deadline === BigInt(deadline)
        ) {
          createdCampaign = decoded.args.campaign;
          break;
        }
      } catch {
        // Ignore unrelated logs from the same transaction.
      }
    }

    if (!createdCampaign) {
      return NextResponse.json({ message: "CampaignCreated event does not match this campaign." }, { status: 409 });
    }

    const { data: milestones, error: milestoneError } = await supabase
      .from("campaign_milestones")
      .select("id, on_chain_index")
      .eq("campaign_id", campaignId)
      .order("on_chain_index", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
    if (milestoneError) throw milestoneError;

    const hasLegacySequence = (milestones ?? []).some(
      (milestone, index) => milestone.on_chain_index !== index,
    );

    const { error: updateError } = await supabase.from("campaigns").update({
      campaign_status: "active",
      rejection_reason: null,
      contract_address: createdCampaign,
      goal_wei: goalWei,
      chain_id: getPawChainId(),
      factory_address: factoryAddress,
      deployment_tx_hash: txHash,
      on_chain_campaign_key: campaignKey,
      eth_myr_rate: ethMyrRate,
      blockchain_deadline: new Date(deadline * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", campaignId);
    if (updateError) throw updateError;

    if (hasLegacySequence) {
      const sequenceUpdates = await Promise.all(
        (milestones ?? []).map((milestone, index) =>
          supabase
            .from("campaign_milestones")
            .update({ on_chain_index: index })
            .eq("id", milestone.id),
        ),
      );
      const sequenceError = sequenceUpdates.find((result) => result.error)?.error;
      if (sequenceError) throw sequenceError;
    }

    return NextResponse.json({
      status: "active",
      contractAddress: createdCampaign,
      campaignKey,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error && error.message === "ADMIN_DENIED" ? "Access denied." : error instanceof Error ? error.message : "Unable to review campaign." },
      { status: error instanceof Error && error.message === "ADMIN_DENIED" ? 403 : 500 },
    );
  }
}
