import { NextRequest, NextResponse } from "next/server";
import { requireWalletSession } from "@/lib/wallet-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveShelter, ShelterAccessError } from "@/lib/active-shelter";
import { withLiveCampaignStatuses } from "@/lib/shelter-campaign-status";
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

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.nextUrl.searchParams.get("walletAddress");
    requireWalletSession(request, walletAddress);

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
    const { data: campaigns, error } = await supabase
      .from("campaigns")
      .select(
        "id, title, description, goal_amount, current_amount, urgency_level, campaign_status, duration_days, image_url, contract_address, goal_wei, chain_id, factory_address, deployment_tx_hash, on_chain_campaign_key, eth_myr_rate, blockchain_deadline, rejection_reason, created_at, updated_at",
      )
      .eq("shelter_id", profile.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const liveCampaigns = await withLiveCampaignStatuses(campaigns ?? []);

    return NextResponse.json({ campaigns: liveCampaigns });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to load campaigns.",
      },
      { status: error instanceof ShelterAccessError ? error.status : 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const walletAddress = String(body.walletAddress ?? "").trim();
    requireWalletSession(request, walletAddress);
    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const imageUrl = String(body.imageUrl ?? "").trim();
    const goalEth = String(body.goalEth ?? "").trim();
    const ethMyrRate = Number(body.ethMyrRate);
    const requestedGoalMyr = Number(body.goalAmount);
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

    if (!validGoalEth || !Number.isFinite(ethMyrRate) || ethMyrRate <= 0 || !Number.isFinite(goalAmount) || requestedGoalMyr < 1000 || requestedGoalMyr % 100 !== 0) {
      return NextResponse.json(
        { message: "Enter a goal of at least MYR 1,000 in increments of MYR 100." },
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

    if (milestones.length < 3 || milestones.length > 5) {
      return NextResponse.json(
        { message: "Add at least 3 milestones. Campaigns must have between 3 and 5 milestones." },
        { status: 400 },
      );
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
      return NextResponse.json(
        { message: "All milestone fields are required." },
        { status: 400 },
      );
    }

    if (parsedMilestones[0].percentage !== emergencyMilestonePercentage) {
      return NextResponse.json(
        { message: "Milestone 1 must be the fixed 5% emergency release." },
        { status: 400 },
      );
    }

    const totalPercentage = parsedMilestones.reduce(
      (sum, milestone) => sum + milestone.percentage,
      0,
    );

    if (totalPercentage !== 100) {
      return NextResponse.json(
        { message: "Milestone percentages must total exactly 100%." },
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
      .insert({
        shelter_id: profile.id,
        title,
        description,
        goal_amount: goalAmount,
        goal_wei: parseEther(goalEth).toString(),
        eth_myr_rate: ethMyrRate,
        current_amount: 0,
        urgency_level: urgencyLevel,
        campaign_status: "pending_approval",
        duration_days: durationDays,
        image_url: imageUrl || null,
        contract_address: null,
        rejection_reason: null,
      })
      .select(
        "id, title, description, goal_amount, current_amount, urgency_level, campaign_status, duration_days, image_url, contract_address, goal_wei, chain_id, factory_address, deployment_tx_hash, on_chain_campaign_key, eth_myr_rate, blockchain_deadline, rejection_reason, created_at, updated_at",
      )
      .single();

    if (error) {
      throw error;
    }

    const { error: milestoneError } = await supabase
      .from("campaign_milestones")
      .insert(
        parsedMilestones.map((milestone, index) => ({
          campaign_id: campaign.id,
          title: milestone.title,
          description: milestone.description,
          requirement: milestone.requirement,
          percentage: milestone.percentage,
          status: "pending",
          on_chain_index: index,
        })),
      );

    if (milestoneError) {
      await supabase.from("campaigns").delete().eq("id", campaign.id);
      throw milestoneError;
    }

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to create campaign.",
      },
      { status: 500 },
    );
  }
}
