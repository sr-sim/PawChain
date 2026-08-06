import { NextRequest, NextResponse } from "next/server";
import { requireWalletSession } from "@/lib/wallet-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveShelter, ShelterAccessError } from "@/lib/active-shelter";
import { withLiveCampaignStatus } from "@/lib/shelter-campaign-status";
import { parseEther } from "viem";

type UrgencyLevel = "medium" | "high" | "critical";
type MilestonePayload = {
  title?: unknown;
  description?: unknown;
  requirement?: unknown;
  percentage?: unknown;
};

const urgencyLevels: UrgencyLevel[] = ["medium", "high", "critical"];
const durationOptions = [30, 60, 90];
const emergencyMilestonePercentage = 5;

function isUrgencyLevel(value: string): value is UrgencyLevel {
  return urgencyLevels.includes(value as UrgencyLevel);
}

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

function validateMilestones(milestones: MilestonePayload[]) {
  if (milestones.length < 3 || milestones.length > 5) {
    return { message: "Add at least 3 milestones. Campaigns must have between 3 and 5 milestones." };
  }

  const parsedMilestones = milestones.map((milestone) => ({
    title: String(milestone.title ?? "").trim(),
    description: String(milestone.description ?? "").trim(),
    requirement: String(milestone.requirement ?? "").trim(),
    percentage: Number(milestone.percentage),
  }));

  const invalidMilestone = parsedMilestones.some(
    (milestone) =>
      !milestone.title ||
      !milestone.description ||
      !milestone.requirement ||
      !Number.isFinite(milestone.percentage) ||
      milestone.percentage <= 0,
  );

  if (invalidMilestone) {
    return { message: "All milestone fields are required." };
  }

  if (parsedMilestones[0].percentage !== emergencyMilestonePercentage) {
    return { message: "Milestone 1 must be the fixed 5% emergency release." };
  }

  const totalPercentage = parsedMilestones.reduce(
    (sum, milestone) => sum + milestone.percentage,
    0,
  );

  if (totalPercentage !== 100) {
    return { message: "Milestone percentages must total exactly 100%." };
  }

  return { milestones: parsedMilestones };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const walletAddress = request.nextUrl.searchParams.get("walletAddress");
    requireWalletSession(request, walletAddress);
    const { id } = await context.params;

    if (!walletAddress) {
      return NextResponse.json(
        { message: "Wallet address is required." },
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
    const { data: campaign, error } = await supabase
      .from("campaigns")
      .select(
        "id, shelter_id, title, description, goal_amount, current_amount, urgency_level, campaign_status, duration_days, image_url, contract_address, goal_wei, chain_id, factory_address, deployment_tx_hash, on_chain_campaign_key, eth_myr_rate, blockchain_deadline, rejection_reason, created_at, updated_at",
      )
      .eq("id", id)
      .eq("shelter_id", profile.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!campaign) {
      return NextResponse.json(
        { message: "Campaign not found." },
        { status: 404 },
      );
    }

    const { data: milestones, error: milestoneError } = await supabase
      .from("campaign_milestones")
      .select(
        "id, campaign_id, title, description, requirement, percentage, status, proof_url, rejection_reason, on_chain_index, proof_cid, proof_tx_hash, review_tx_hash, release_tx_hash",
      )
      .eq("campaign_id", campaign.id)
      .order("on_chain_index", { ascending: true });

    if (milestoneError) {
      throw milestoneError;
    }

    const liveCampaign = await withLiveCampaignStatus(campaign);

    return NextResponse.json({
      campaign: liveCampaign,
      milestones: milestones ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to load campaign details.",
      },
      { status: error instanceof ShelterAccessError ? error.status : 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const body = await request.json();
    const { id } = await context.params;
    const walletAddress = String(body.walletAddress ?? "").trim();
    requireWalletSession(request, walletAddress);
    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const imageUrl = String(body.imageUrl ?? "").trim();
    const goalEth = String(body.goalEth ?? "").trim();
    const ethMyrRate = Number(body.ethMyrRate);
    const validGoalEth = /^\d+(?:\.\d{1,18})?$/.test(goalEth) && parseEther(goalEth) > BigInt(0);
    const goalAmount = Number(goalEth) * ethMyrRate;
    const durationDays = Number(body.durationDays);
    const urgencyLevel = String(body.urgencyLevel ?? "medium");
    const milestones: MilestonePayload[] = Array.isArray(body.milestones)
      ? body.milestones
      : [];

    if (!walletAddress) {
      return NextResponse.json(
        { message: "Wallet address is required." },
        { status: 400 },
      );
    }

    if (!title || !description) {
      return NextResponse.json(
        { message: "Campaign title and description are required." },
        { status: 400 },
      );
    }

    if (!validGoalEth || !Number.isFinite(ethMyrRate) || ethMyrRate <= 0 || !Number.isFinite(goalAmount)) {
      return NextResponse.json(
        { message: "Enter a valid ETH goal and conversion rate." },
        { status: 400 },
      );
    }

    if (!durationOptions.includes(durationDays)) {
      return NextResponse.json(
        { message: "Duration must be 30, 60, or 90 days." },
        { status: 400 },
      );
    }

    if (!isUrgencyLevel(urgencyLevel)) {
      return NextResponse.json(
        { message: "Invalid urgency level." },
        { status: 400 },
      );
    }

    const milestoneValidation = validateMilestones(milestones);

    if ("message" in milestoneValidation) {
      return NextResponse.json(
        { message: milestoneValidation.message },
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

    if (!["pending_approval", "rejected"].includes(campaign.campaign_status)) {
      return NextResponse.json(
        { message: "Only pending or rejected campaigns can be edited before approval." },
        { status: 403 },
      );
    }

    const { data: updatedCampaign, error: updateError } = await supabase
      .from("campaigns")
      .update({
        title,
        description,
        goal_amount: goalAmount,
        goal_wei: parseEther(goalEth).toString(),
        eth_myr_rate: ethMyrRate,
        urgency_level: urgencyLevel,
        duration_days: durationDays,
        image_url: imageUrl || null,
        campaign_status: "pending_approval",
        rejection_reason: null,
      })
      .eq("id", campaign.id)
      .select(
        "id, shelter_id, title, description, goal_amount, current_amount, urgency_level, campaign_status, duration_days, image_url, contract_address, goal_wei, chain_id, factory_address, deployment_tx_hash, on_chain_campaign_key, eth_myr_rate, blockchain_deadline, rejection_reason, created_at, updated_at",
      )
      .single();

    if (updateError) {
      throw updateError;
    }

    const { error: deleteError } = await supabase
      .from("campaign_milestones")
      .delete()
      .eq("campaign_id", campaign.id);

    if (deleteError) {
      throw deleteError;
    }

    const { error: insertError } = await supabase
      .from("campaign_milestones")
      .insert(
        milestoneValidation.milestones.map((milestone, index) => ({
          campaign_id: campaign.id,
          title: milestone.title,
          description: milestone.description,
          requirement: milestone.requirement,
          percentage: milestone.percentage,
          status: "pending",
          on_chain_index: index,
        })),
      );

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({ campaign: updatedCampaign });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to update campaign.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const body = await request.json();
    const walletAddress = String(body.walletAddress ?? "").trim();
    requireWalletSession(request, walletAddress);
    const { id } = await context.params;

    if (!walletAddress) {
      return NextResponse.json({ message: "Wallet address is required." }, { status: 400 });
    }

    const profile = await requireActiveShelter(walletAddress);
    const supabase = createAdminClient();
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, campaign_status, contract_address, deployment_tx_hash")
      .eq("id", id)
      .eq("shelter_id", profile.id)
      .maybeSingle();

    if (campaignError) throw campaignError;
    if (!campaign) return NextResponse.json({ message: "Campaign not found." }, { status: 404 });

    const canDelete = ["pending_approval", "rejected"].includes(campaign.campaign_status) &&
      !campaign.contract_address && !campaign.deployment_tx_hash;
    if (!canDelete) {
      return NextResponse.json(
        { message: "Only campaigns that have not been approved or deployed can be deleted." },
        { status: 403 },
      );
    }

    const { error: milestoneError } = await supabase
      .from("campaign_milestones")
      .delete()
      .eq("campaign_id", campaign.id);
    if (milestoneError) throw milestoneError;

    const { data: deletedCampaign, error: deleteError } = await supabase
      .from("campaigns")
      .delete()
      .eq("id", campaign.id)
      .eq("shelter_id", profile.id)
      .in("campaign_status", ["pending_approval", "rejected"])
      .is("contract_address", null)
      .select("id")
      .maybeSingle();
    if (deleteError) throw deleteError;
    if (!deletedCampaign) {
      return NextResponse.json({ message: "Campaign status changed and it was not deleted." }, { status: 409 });
    }

    return NextResponse.json({ deleted: true, campaignId: campaign.id });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to delete campaign." },
      { status: error instanceof ShelterAccessError ? error.status : 500 },
    );
  }
}
