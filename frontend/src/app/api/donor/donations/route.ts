import { NextRequest, NextResponse } from "next/server";
import { requireWalletSession } from "@/lib/wallet-session";
import { getDonorDonations } from "@/lib/donor-donations";
import { createAdminClient } from "@/lib/supabase/admin";
import { campaignContractAbi } from "@/lib/campaign-contract-abi";
import {
  campaignKeyFromId,
  demoEthMyrRate,
  getPawChainPublicClient,
} from "@/lib/campaign-blockchain";
import { createDonorNotification } from "@/lib/donor-notifications";
import { getLatestEthMyrRate } from "@/lib/currency";
import {
  decodeEventLog,
  formatEther,
  isAddress,
  type Hash,
} from "viem";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.nextUrl.searchParams.get("walletAddress") ?? "";
    requireWalletSession(request, walletAddress);

    if (!walletAddress) {
      return NextResponse.json(
        { donations: [], message: "Wallet address is required." },
        { status: 400 },
      );
    }

    const result = await getDonorDonations(walletAddress);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        donations: [],
        message:
          error instanceof Error
            ? error.message
            : "Unable to load donor donations.",
      },
      { status: 500 },
    );
  }
}

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
        { message: "Wallet, campaign, and transaction hash are required." },
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
    if (!donor || donor.role !== "donor") {
      return NextResponse.json(
        { message: "A registered donor wallet is required." },
        { status: 403 },
      );
    }

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, title, campaign_status, contract_address, eth_myr_rate")
      .eq("id", campaignId)
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
        { message: "The donation transaction does not match this campaign." },
        { status: 409 },
      );
    }

    const expectedCampaignKey = campaignKeyFromId(campaignId);
    let donationAmount: bigint | null = null;
    let totalRaised: bigint | null = null;

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
          decoded.eventName === "DonationReceived" &&
          decoded.args.campaignKey === expectedCampaignKey &&
          decoded.args.donor.toLowerCase() === walletAddress.toLowerCase()
        ) {
          donationAmount = decoded.args.amount;
          totalRaised = decoded.args.totalRaised;
          break;
        }
      } catch {
        // Ignore unrelated campaign logs.
      }
    }

    if (donationAmount === null || totalRaised === null) {
      return NextResponse.json(
        { message: "DonationReceived event was not found." },
        { status: 409 },
      );
    }

    const latestRate = await getLatestEthMyrRate();
    const rate = Number.isFinite(latestRate.rate)
      ? latestRate.rate
      : Number(campaign.eth_myr_rate ?? demoEthMyrRate);
    const donationEth = Number(formatEther(donationAmount));
    const amountMyr = donationEth * rate;
    const raisedMyr = Number(formatEther(totalRaised)) * rate;
    const { data: donation, error: insertError } = await supabase
      .from("donations")
      .upsert({
        donor_id: donor.id,
        campaign_id: campaignId,
        amount: amountMyr,
        amount_wei: donationAmount.toString(),
        currency: "MYR",
        tx_hash: txHash,
        contract_address: campaign.contract_address,
        status: "confirmed",
      }, { onConflict: "tx_hash" })
      .select("id, tx_hash, status")
      .single();
    if (insertError) throw insertError;

    const { error: updateError } = await supabase
      .from("campaigns")
      .update({
        current_amount: raisedMyr,
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);
    if (updateError) throw updateError;

    await createDonorNotification({
      donorId: donor.id,
      campaignId,
      title: "Donation confirmed",
      message: `Your ${donationEth.toFixed(6)} ETH donation to ${campaign.title} was confirmed. Approx. MYR ${amountMyr.toLocaleString("en-MY", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}.`,
      status: "success",
    });

    return NextResponse.json({ donation }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to confirm donation.",
      },
      { status: 500 },
    );
  }
}
