import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveShelter, ShelterAccessError } from "@/lib/active-shelter";
import { campaignContractAbi } from "@/lib/campaign-contract-abi";
import { getPawChainPublicClient } from "@/lib/campaign-blockchain";
import {
  decodeFunctionData,
  isAddress,
  keccak256,
  toBytes,
  type Address,
  type Hash,
} from "viem";

type ProofFile = {
  name?: unknown;
  type?: unknown;
  dataUrl?: unknown;
};

const allowedProofTypes = ["application/pdf"];

async function getShelterProfile(walletAddress: string) {
  const supabase = createAdminClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role")
    .ilike("wallet_address", walletAddress)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!profile || profile.role !== "shelter") {
    return null;
  }

  return profile;
}

function isAllowedProofType(type: string) {
  return type.startsWith("image/") || allowedProofTypes.includes(type);
}

function parseProofFiles(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((file: ProofFile) => ({
      name: String(file.name ?? "").trim(),
      type: String(file.type ?? "").trim(),
      dataUrl: String(file.dataUrl ?? "").trim(),
    }))
    .filter((file) => file.name && file.type && file.dataUrl);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; milestoneId: string }> },
) {
  try {
    const body = await request.json();
    const { id, milestoneId } = await context.params;
    const walletAddress = String(body.walletAddress ?? "").trim();
    const proofFiles = parseProofFiles(body.proofFiles);
    const proofCID = String(body.proofCID ?? "").trim();
    const txHash = String(body.txHash ?? "").trim();

    if (!walletAddress) {
      return NextResponse.json(
        { message: "Wallet address is required." },
        { status: 400 },
      );
    }

    if (proofFiles.length < 1) {
      return NextResponse.json(
        { message: "Upload at least one proof file." },
        { status: 400 },
      );
    }

    if (!proofCID || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
      return NextResponse.json(
        { message: "Confirmed on-chain proof details are required." },
        { status: 400 },
      );
    }

    if (proofFiles.some((file) => !isAllowedProofType(file.type))) {
      return NextResponse.json(
        { message: "Proof files must be images or PDFs." },
        { status: 400 },
      );
    }

    if (keccak256(toBytes(JSON.stringify(proofFiles))) !== proofCID) {
      return NextResponse.json(
        { message: "Proof files do not match the submitted proof hash." },
        { status: 409 },
      );
    }

    const profile = await requireActiveShelter(walletAddress);

    if (!profile) {
      return NextResponse.json(
        { message: "No shelter account found for this wallet." },
        { status: 404 },
      );
    }

    const supabase = createAdminClient();
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, campaign_status, contract_address")
      .eq("id", id)
      .eq("shelter_id", profile.id)
      .maybeSingle();

    if (campaignError) {
      throw campaignError;
    }

    if (!campaign) {
      return NextResponse.json(
        { message: "Campaign not found." },
        { status: 404 },
      );
    }

    if (campaign.campaign_status !== "active") {
      return NextResponse.json(
        { message: "Proof can only be uploaded for active campaigns." },
        { status: 403 },
      );
    }

    if (!campaign.contract_address || !isAddress(campaign.contract_address)) {
      return NextResponse.json(
        { message: "Campaign contract is not configured." },
        { status: 409 },
      );
    }

    const { data: milestone, error: milestoneError } = await supabase
      .from("campaign_milestones")
      .select("id, status, on_chain_index")
      .eq("id", milestoneId)
      .eq("campaign_id", campaign.id)
      .maybeSingle();

    if (milestoneError) {
      throw milestoneError;
    }

    if (!milestone) {
      return NextResponse.json(
        { message: "Milestone not found." },
        { status: 404 },
      );
    }

    if (milestone.on_chain_index === null) {
      return NextResponse.json(
        { message: "Milestone is not linked to the campaign contract." },
        { status: 409 },
      );
    }

    if (milestone.status === "submitted") {
      return NextResponse.json(
        { message: "Proof is already pending admin review." },
        { status: 409 },
      );
    }

    if (milestone.status === "approved") {
      return NextResponse.json(
        { message: "Approved milestones cannot be changed." },
        { status: 403 },
      );
    }

    const publicClient = getPawChainPublicClient();
    const [receipt, transaction] = await Promise.all([
      publicClient.getTransactionReceipt({ hash: txHash as Hash }),
      publicClient.getTransaction({ hash: txHash as Hash }),
    ]);
    if (
      receipt.status !== "success" ||
      receipt.from.toLowerCase() !== walletAddress.toLowerCase() ||
      receipt.to?.toLowerCase() !== campaign.contract_address.toLowerCase() ||
      transaction.to?.toLowerCase() !== campaign.contract_address.toLowerCase()
    ) {
      return NextResponse.json(
        { message: "The proof transaction does not match this campaign." },
        { status: 409 },
      );
    }

    try {
      const decoded = decodeFunctionData({
        abi: campaignContractAbi,
        data: transaction.input,
      });
      const [submittedIndex, submittedProofCID] = decoded.args as readonly [
        bigint,
        string,
      ];
      if (
        decoded.functionName !== "submitMilestoneProof" ||
        submittedIndex !== BigInt(milestone.on_chain_index) ||
        submittedProofCID !== proofCID
      ) {
        return NextResponse.json(
          { message: "The transaction did not submit this milestone proof." },
          { status: 409 },
        );
      }
    } catch {
      return NextResponse.json(
        { message: "Unable to verify the milestone proof transaction." },
        { status: 409 },
      );
    }

    const onChainMilestone = await publicClient.readContract({
      address: campaign.contract_address as Address,
      abi: campaignContractAbi,
      functionName: "getMilestone",
      args: [BigInt(milestone.on_chain_index)],
    });
    if (
      Number(onChainMilestone.status) !== 2 ||
      onChainMilestone.proofCID !== proofCID
    ) {
      return NextResponse.json(
        { message: "On-chain proof does not match the submitted proof." },
        { status: 409 },
      );
    }

    const { data: updatedMilestone, error: updateError } = await supabase
      .from("campaign_milestones")
      .update({
        proof_url: JSON.stringify(proofFiles),
        proof_cid: proofCID,
        proof_tx_hash: txHash,
        status: "submitted",
        rejection_reason: null,
      })
      .eq("id", milestone.id)
      .select(
        "id, campaign_id, title, description, requirement, percentage, status, proof_url, rejection_reason",
      )
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ milestone: updatedMilestone });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to upload milestone proof.",
      },
      { status: error instanceof ShelterAccessError ? error.status : 500 },
    );
  }
}

