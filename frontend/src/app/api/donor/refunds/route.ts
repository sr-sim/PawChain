import { NextRequest, NextResponse } from "next/server";
import { requireWalletSession } from "@/lib/wallet-session";
import { decodeEventLog, formatEther, isAddress, type Address, type Hash } from "viem";
import { campaignContractAbi } from "@/lib/campaign-contract-abi";
import { getPawChainPublicClient } from "@/lib/campaign-blockchain";
import { createDonorNotification } from "@/lib/donor-notifications";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const walletAddress = String(body.walletAddress ?? "").trim();
    requireWalletSession(request, walletAddress);
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
      .maybeSingle();
    if (donorError) throw donorError;
    if (!donor) {
      return NextResponse.json(
        { message: "This wallet is not registered as a donor." },
        { status: 404 },
      );
    }
    if (donor.role !== "donor") {
      return NextResponse.json(
        { message: "A donor wallet is required." },
        { status: 403 },
      );
    }

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("title, contract_address, campaign_status, eth_myr_rate")
      .eq("id", campaignId)
      .single();
    if (campaignError) throw campaignError;
    if (!campaign.contract_address || !isAddress(campaign.contract_address)) {
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

    let refundAmount: bigint | null = null;
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== campaign.contract_address.toLowerCase()) {
        continue;
      }
      try {
        const decoded = decodeEventLog({
          abi: campaignContractAbi,
          data: log.data,
          topics: log.topics,
        });
        if (
          decoded.eventName === "RefundClaimed" &&
          decoded.args.donor.toLowerCase() === walletAddress.toLowerCase()
        ) {
          refundAmount = decoded.args.amount;
          break;
        }
      } catch {
        // Ignore unrelated logs.
      }
    }
    if (refundAmount === null) {
      return NextResponse.json(
        { message: "RefundClaimed event was not found." },
        { status: 409 },
      );
    }

    const { data: existingDonation, error: existingDonationError } =
      await supabase
        .from("donations")
        .select("id, amount, amount_wei, refund_tx_hash")
        .eq("donor_id", donor.id)
        .eq("campaign_id", campaignId)
        .maybeSingle();
    if (existingDonationError) throw existingDonationError;
    if (!existingDonation) {
      return NextResponse.json(
        { message: "Donation record was not found for this donor." },
        { status: 404 },
      );
    }
    if (existingDonation.refund_tx_hash === txHash) {
      return NextResponse.json({ refunded: true, alreadyRecorded: true });
    }

    const { error: updateError } = await supabase
      .from("donations")
      .update({
        refund_tx_hash: txHash,
        refunded_at: new Date().toISOString(),
        status: "refunded",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingDonation.id);
    if (updateError) throw updateError;

    const refundEth = Number(formatEther(refundAmount));
    const donationEth = existingDonation.amount_wei
      ? Number(formatEther(BigInt(existingDonation.amount_wei)))
      : 0;
    const donationMyr = Number(existingDonation.amount ?? 0);
    const refundMyr =
      donationEth > 0 && donationMyr > 0
        ? (donationMyr / donationEth) * refundEth
        : refundEth * Number(campaign.eth_myr_rate ?? 0);

    await createDonorNotification({
      donorId: donor.id,
      campaignId,
      title: "Refund claimed",
      message: `Your ${refundEth.toLocaleString("en-MY", { maximumFractionDigits: 6 })} ETH refund from ${campaign.title} was confirmed. Approx. MYR ${refundMyr.toLocaleString("en-MY", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}.`,
      status: "success",
    });

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
