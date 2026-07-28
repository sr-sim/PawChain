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
      .select("id, shelter_id, title, description, location, goal_amount, current_amount, urgency_level, campaign_status, duration_days, image_url, contract_address, goal_wei, chain_id, factory_address, deployment_tx_hash, on_chain_campaign_key, eth_myr_rate, blockchain_deadline, created_at, updated_at, rejection_reason, campaign_milestones(id, campaign_id, title, description, requirement, percentage, status, proof_url, rejection_reason, on_chain_index, proof_cid, proof_tx_hash, review_tx_hash, release_tx_hash, created_at, updated_at)")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const shelterIds = [...new Set((campaigns ?? []).map((item) => item.shelter_id))];
    const { data: profiles } = shelterIds.length
      ? await supabase.from("profiles").select("id, full_name, wallet_address").in("id", shelterIds)
      : { data: [] };
    const profileMap = new Map((profiles ?? []).map((item) => [item.id, item.full_name]));
    const walletMap = new Map((profiles ?? []).map((item) => [item.id, item.wallet_address]));
    return NextResponse.json({ campaigns: (campaigns ?? []).map((item) => ({ ...item, shelter_name: profileMap.get(item.shelter_id) ?? null, shelter_wallet: walletMap.get(item.shelter_id) ?? null })) });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error && error.message === "ADMIN_DENIED" ? "Access denied." : error instanceof Error ? error.message : "Unable to load campaigns." },
      { status: error instanceof Error && error.message === "ADMIN_DENIED" ? 403 : 500 },
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
      .from("campaigns").select("id, shelter_id, campaign_status, deployment_tx_hash, contract_address").eq("id", campaignId).single();
    if (lookupError) throw lookupError;

    if (action === "cancel" || action === "finalize_expired") {
      if (campaign.campaign_status === "closed") {
        return NextResponse.json({ status: "closed", idempotent: true });
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

      const { error: cancelError } = await supabase
        .from("campaigns")
        .update({
          campaign_status: "closed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId);
      if (cancelError) throw cancelError;
      return NextResponse.json({ status: "closed" });
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
      .select("id")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: true });
    if (milestoneError) throw milestoneError;

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

    await Promise.all(
      (milestones ?? []).map((milestone, index) =>
        supabase
          .from("campaign_milestones")
          .update({ on_chain_index: index })
          .eq("id", milestone.id),
      ),
    );

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
