import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveShelter, ShelterAccessError } from "@/lib/active-shelter";

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

    if (proofFiles.some((file) => !isAllowedProofType(file.type))) {
      return NextResponse.json(
        { message: "Proof files must be images or PDFs." },
        { status: 400 },
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
      .select("id, campaign_status")
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

    const { data: milestone, error: milestoneError } = await supabase
      .from("campaign_milestones")
      .select("id, status")
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

    if (milestone.status === "approved") {
      return NextResponse.json(
        { message: "Approved milestones cannot be changed." },
        { status: 403 },
      );
    }

    const { data: updatedMilestone, error: updateError } = await supabase
      .from("campaign_milestones")
      .update({
        proof_url: JSON.stringify(proofFiles),
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

