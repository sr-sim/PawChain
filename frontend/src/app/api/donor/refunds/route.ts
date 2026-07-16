import { NextRequest, NextResponse } from "next/server";
import { isAddress, type Address, type Hash } from "viem";
import { campaignContractAbi } from "@/lib/campaign-contract-abi";
import { getPawChainPublicClient } from "@/lib/campaign-blockchain";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const walletAddress = String(body.walletAddress ?? "").trim();
    const campaignId = String(body.campaignId ?? "").trim();
    const txHash = String(body.txHash ?? "").trim();

    if (
      !isAddress(walletAddress) ||
      !campaignId ||
      !/^0x[0-9a-fA-F]{64}$/.test(txHash)
    ) {
      return NextResponse.json(
        { message: "Wallet, campaign, and refund transaction are required." },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const { data: donor, error: donorError } = await supabase
      .from("profiles")
      .select("id, role")
      .ilike("wallet_address", walletAddress)
      .single();
    if (donorError) throw donorError;
    if (donor.role !== "donor") {
      return NextResponse.json(
        { message: "A donor wallet is required." },
        { status: 403 },
      );
    }

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("contract_address, campaign_status")
      .eq("id", campaignId)
      .single();
    if (campaignError) throw campaignError;
    if (
      campaign.campaign_status !== "closed" ||
      !campaign.contract_address ||
      !isAddress(campaign.contract_address)
    ) {
      return NextResponse.json(
        { message: "This campaign is not open for refunds." },
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
        { message: "The refund transaction does not match this campaign." },
        { status: 409 },
      );
    }

    const claimed = await publicClient.readContract({
      address: campaign.contract_address as Address,
      abi: campaignContractAbi,
      functionName: "refundClaimed",
      args: [walletAddress],
    });
    if (!claimed) {
      return NextResponse.json(
        { message: "Refund is not recorded on-chain." },
        { status: 409 },
      );
    }

    const { error: updateError } = await supabase
      .from("donations")
      .update({
        refund_tx_hash: txHash,
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("donor_id", donor.id)
      .eq("campaign_id", campaignId);
    if (updateError) throw updateError;

    return NextResponse.json({ refunded: true });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to confirm refund.",
      },
      { status: 500 },
    );
  }
}
