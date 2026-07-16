import { NextRequest, NextResponse } from "next/server";
import { isAddress, type Address, type Hash } from "viem";
import { requireActiveShelter, ShelterAccessError } from "@/lib/active-shelter";
import { campaignContractAbi } from "@/lib/campaign-contract-abi";
import { getPawChainPublicClient } from "@/lib/campaign-blockchain";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; milestoneId: string }> },
) {
  try {
    const { id, milestoneId } = await context.params;
    const body = await request.json();
    const walletAddress = String(body.walletAddress ?? "").trim();
    const txHash = String(body.txHash ?? "").trim();

    if (!walletAddress || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
      return NextResponse.json(
        { message: "Wallet and release transaction are required." },
        { status: 400 },
      );
    }

    const profile = await requireActiveShelter(walletAddress);
    const supabase = createAdminClient();
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, shelter_id, campaign_status, contract_address")
      .eq("id", id)
      .eq("shelter_id", profile.id)
      .single();
    if (campaignError) throw campaignError;
    if (
      campaign.campaign_status !== "active" ||
      !campaign.contract_address ||
      !isAddress(campaign.contract_address)
    ) {
      return NextResponse.json(
        { message: "Campaign contract is not active." },
        { status: 409 },
      );
    }

    const { data: milestone, error: milestoneError } = await supabase
      .from("campaign_milestones")
      .select("id, on_chain_index, release_tx_hash")
      .eq("id", milestoneId)
      .eq("campaign_id", campaign.id)
      .single();
    if (milestoneError) throw milestoneError;

    if (milestone.release_tx_hash?.toLowerCase() === txHash.toLowerCase()) {
      return NextResponse.json({ released: true, idempotent: true });
    }
    if (milestone.on_chain_index === null) {
      return NextResponse.json(
        { message: "Milestone is not linked on-chain." },
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
        { message: "The release transaction does not match this milestone." },
        { status: 409 },
      );
    }

    const onChainMilestone = await publicClient.readContract({
      address: campaign.contract_address as Address,
      abi: campaignContractAbi,
      functionName: "getMilestone",
      args: [BigInt(milestone.on_chain_index)],
    });
    const expectedStatus =
      milestone.on_chain_index === 0
        ? Number(onChainMilestone.status) === 6
        : Number(onChainMilestone.status) === 7;
    if (!expectedStatus) {
      return NextResponse.json(
        { message: "Milestone funds are not recorded as released on-chain." },
        { status: 409 },
      );
    }

    const { error: updateError } = await supabase
      .from("campaign_milestones")
      .update({
        release_tx_hash: txHash,
        updated_at: new Date().toISOString(),
      })
      .eq("id", milestone.id);
    if (updateError) throw updateError;

    return NextResponse.json({
      released: true,
      onChainStatus: Number(onChainMilestone.status),
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to confirm milestone release.",
      },
      { status: error instanceof ShelterAccessError ? error.status : 500 },
    );
  }
}
