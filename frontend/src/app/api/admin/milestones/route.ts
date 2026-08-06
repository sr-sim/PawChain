import { NextRequest, NextResponse } from "next/server";
import { isAdminWallet } from "@/lib/admin-wallets";
import { createAdminClient } from "@/lib/supabase/admin";
import { walletSessionMatches } from "@/lib/wallet-session";
import { campaignContractAbi } from "@/lib/campaign-contract-abi";
import { getPawChainPublicClient } from "@/lib/campaign-blockchain";
import { decodeFunctionData, isAddress, type Address, type Hash } from "viem";

async function adminClient(request: NextRequest, wallet: string) {
  if (!walletSessionMatches(request, wallet)) throw new Error("WALLET_SESSION_REQUIRED");
  if (!(await isAdminWallet(wallet))) throw new Error("ADMIN_DENIED");
  return createAdminClient();
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await adminClient(request, request.nextUrl.searchParams.get("walletAddress") ?? "");
    const { data, error } = await supabase
      .from("campaign_milestones")
      .select("id, campaign_id, title, description, requirement, percentage, status, proof_url, rejection_reason, on_chain_index, proof_cid, proof_tx_hash, review_tx_hash, release_tx_hash, created_at, updated_at, campaigns!inner(id, shelter_id, title, campaign_status, goal_amount, current_amount, contract_address, created_at, updated_at)")
      .eq("campaigns.campaign_status", "active")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const shelterIds = [...new Set((data ?? []).map((item) => {
      const campaign = Array.isArray(item.campaigns) ? item.campaigns[0] : item.campaigns;
      return campaign?.shelter_id;
    }).filter(Boolean))];
    const { data: profiles } = shelterIds.length ? await supabase.from("profiles").select("id, full_name").in("id", shelterIds) : { data: [] };
    const names = new Map((profiles ?? []).map((item) => [item.id, item.full_name]));
    const milestones = (data ?? []).map((item) => {
      const campaign = Array.isArray(item.campaigns) ? item.campaigns[0] : item.campaigns;
      return { ...item, campaign: campaign ? { ...campaign, shelter_name: names.get(campaign.shelter_id) ?? null } : null, campaigns: undefined };
    });
    return NextResponse.json({ milestones });
  } catch (error) {
    const denied = error instanceof Error && error.message === "ADMIN_DENIED";
    return NextResponse.json({ message: denied ? "Access denied." : error instanceof Error ? error.message : "Unable to load milestones." }, { status: denied ? 403 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = await adminClient(request, String(body.walletAddress ?? ""));
    const milestoneId = String(body.milestoneId ?? "");
    const action = String(body.action ?? "");
    const reason = String(body.rejectionReason ?? "").trim();
    const txHash = String(body.txHash ?? "").trim();
    if (!milestoneId || !["approve", "reject"].includes(action)) return NextResponse.json({ message: "Invalid milestone action." }, { status: 400 });
    if (action === "reject" && !reason) return NextResponse.json({ message: "A rejection reason is required." }, { status: 400 });
    if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) return NextResponse.json({ message: "A valid milestone transaction hash is required." }, { status: 400 });

    const { data: milestone, error: lookupError } = await supabase.from("campaign_milestones").select("id, status, proof_url, campaign_id, on_chain_index").eq("id", milestoneId).single();
    if (lookupError) throw lookupError;
    const reviewable = Boolean(milestone.proof_url) && ["pending", "submitted"].includes(milestone.status);
    if (!reviewable) return NextResponse.json({ message: "This milestone has no proof awaiting review." }, { status: 409 });
    const { data: campaign } = await supabase.from("campaigns").select("campaign_status, contract_address").eq("id", milestone.campaign_id).single();
    if (!campaign || !["active", "approved"].includes(campaign.campaign_status)) return NextResponse.json({ message: "The related campaign is not active." }, { status: 409 });
    if (!campaign.contract_address || !isAddress(campaign.contract_address) || milestone.on_chain_index === null) {
      return NextResponse.json({ message: "The milestone is not linked to a campaign contract." }, { status: 409 });
    }

    const publicClient = getPawChainPublicClient();
    const [receipt, transaction] = await Promise.all([
      publicClient.getTransactionReceipt({ hash: txHash as Hash }),
      publicClient.getTransaction({ hash: txHash as Hash }),
    ]);
    if (
      receipt.status !== "success" ||
      receipt.from.toLowerCase() !== String(body.walletAddress ?? "").toLowerCase() ||
      receipt.to?.toLowerCase() !== campaign.contract_address.toLowerCase() ||
      transaction.to?.toLowerCase() !== campaign.contract_address.toLowerCase()
    ) {
      return NextResponse.json({ message: "The milestone review transaction does not match this campaign." }, { status: 409 });
    }

    try {
      const decoded = decodeFunctionData({
        abi: campaignContractAbi,
        data: transaction.input,
      });
      const [reviewedIndex] = decoded.args as readonly [bigint];
      const expectedFunction = action === "approve"
        ? "approveMilestone"
        : "rejectMilestone";
      if (
        decoded.functionName !== expectedFunction ||
        reviewedIndex !== BigInt(milestone.on_chain_index)
      ) {
        return NextResponse.json(
          { message: "The transaction did not review this milestone." },
          { status: 409 },
        );
      }
    } catch {
      return NextResponse.json(
        { message: "Unable to verify the milestone review transaction." },
        { status: 409 },
      );
    }

    const onChainMilestone = await publicClient.readContract({
      address: campaign.contract_address as Address,
      abi: campaignContractAbi,
      functionName: "getMilestone",
      args: [BigInt(milestone.on_chain_index)],
    });
    const onChainStatus = Number(onChainMilestone.status);
    let isSequentialFlow = false;
    try {
      const flowVersion = await publicClient.readContract({
        address: campaign.contract_address as Address,
        abi: campaignContractAbi,
        functionName: "FLOW_VERSION",
      });
      isSequentialFlow = flowVersion >= BigInt(2);
    } catch {
      // Contracts deployed before flow version 2 do not expose FLOW_VERSION.
    }
    const expectedStatus = action === "reject"
      ? onChainStatus === 3
      : isSequentialFlow
        ? onChainStatus === 7
        : milestone.on_chain_index === 0
          ? onChainStatus === 7
          : onChainStatus === 4 || onChainStatus === 5;
    if (!expectedStatus) {
      return NextResponse.json({ message: "The on-chain milestone status does not match this review." }, { status: 409 });
    }

    const updatedAt = new Date().toISOString();
    const { error } = await supabase.from("campaign_milestones").update({ status: action === "approve" ? "approved" : "rejected", rejection_reason: action === "approve" ? null : reason, review_tx_hash: txHash, updated_at: updatedAt }).eq("id", milestoneId);
    if (error) throw error;

    let campaignCompleted = false;
    if (action === "approve") {
      const onChainCampaignStatus = Number(
        await publicClient.readContract({
          address: campaign.contract_address as Address,
          abi: campaignContractAbi,
          functionName: "campaignStatus",
        }),
      );

      // CampaignStatus.Completed is enum value 1. The contract is the source
      // of truth, so Supabase is marked completed only after the confirmed
      // final approval transaction has completed the campaign on-chain.
      if (onChainCampaignStatus === 1) {
        const { error: campaignUpdateError } = await supabase
          .from("campaigns")
          .update({ campaign_status: "completed", updated_at: updatedAt })
          .eq("id", milestone.campaign_id)
          .eq("contract_address", campaign.contract_address);
        if (campaignUpdateError) throw campaignUpdateError;
        campaignCompleted = true;
      }
    }

    return NextResponse.json({
      status: action === "approve" ? "approved" : "rejected",
      onChainStatus,
      campaignCompleted,
    });
  } catch (error) {
    const denied = error instanceof Error && error.message === "ADMIN_DENIED";
    return NextResponse.json({ message: denied ? "Access denied." : error instanceof Error ? error.message : "Unable to review milestone." }, { status: denied ? 403 : 500 });
  }
}
