import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveShelter, ShelterAccessError } from "@/lib/active-shelter";

type UrgencyLevel = "medium" | "high" | "critical";
type MilestonePayload = {
  title?: unknown;
  description?: unknown;
  requirement?: unknown;
  percentage?: unknown;
};

const urgencyLevels: UrgencyLevel[] = ["medium", "high", "critical"];
const durationOptions = [30, 60, 90];
const minimumGoalAmount = 1000;

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
  if (milestones.length < 2 || milestones.length > 5) {
    return { message: "Add between 2 and 5 milestones." };
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
        "id, shelter_id, title, description, location, goal_amount, current_amount, urgency_level, campaign_status, duration_days, image_url, contract_address, rejection_reason, created_at, updated_at",
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
        "id, campaign_id, title, description, requirement, percentage, status, proof_url, rejection_reason",
      )
      .eq("campaign_id", campaign.id)
      .order("percentage", { ascending: true });

    if (milestoneError) {
      throw milestoneError;
    }

    return NextResponse.json({ campaign, milestones: milestones ?? [] });
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
    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const location = String(body.location ?? "").trim();
    const imageUrl = String(body.imageUrl ?? "").trim();
    const goalAmount = Number(body.goalAmount);
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

    if (!title || !description || !location) {
      return NextResponse.json(
        { message: "Campaign title, description, and location are required." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(goalAmount) || goalAmount < minimumGoalAmount) {
      return NextResponse.json(
        { message: "Goal amount must be at least RM 1,000." },
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

    if (campaign.campaign_status !== "rejected") {
      return NextResponse.json(
        { message: "Only rejected campaigns can be edited." },
        { status: 403 },
      );
    }

    const { data: updatedCampaign, error: updateError } = await supabase
      .from("campaigns")
      .update({
        title,
        description,
        location,
        goal_amount: goalAmount,
        urgency_level: urgencyLevel,
        duration_days: durationDays,
        image_url: imageUrl || null,
        campaign_status: "pending_approval",
        rejection_reason: null,
      })
      .eq("id", campaign.id)
      .select(
        "id, shelter_id, title, description, location, goal_amount, current_amount, urgency_level, campaign_status, duration_days, image_url, contract_address, rejection_reason, created_at, updated_at",
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
        milestoneValidation.milestones.map((milestone) => ({
          campaign_id: campaign.id,
          title: milestone.title,
          description: milestone.description,
          requirement: milestone.requirement,
          percentage: milestone.percentage,
          status: "pending",
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
