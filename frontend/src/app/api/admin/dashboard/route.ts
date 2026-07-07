import { NextRequest, NextResponse } from "next/server";
import { isAdminWallet } from "@/lib/admin-wallets";
import { createAdminClient } from "@/lib/supabase/admin";

const DEMO_DONATIONS = 28750;
const DEMO_RELEASED_FUNDS = 11400;

export async function GET(request: NextRequest) {
  const walletAddress = request.nextUrl.searchParams.get("walletAddress");

  try {
    if (!(await isAdminWallet(walletAddress))) {
      return NextResponse.json(
        { message: "Access denied. This wallet is not an admin." },
        { status: 403 },
      );
    }

    const supabase = createAdminClient();
    const [campaignResult, milestoneResult, applicationResult] =
      await Promise.all([
        supabase
          .from("campaigns")
          .select(
            "id, title, campaign_status, urgency_level, current_amount, goal_amount, created_at",
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("campaign_milestones")
          .select("id, campaign_id, title, status, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("shelter_applications")
          .select("id, shelter_name, status, created_at")
          .order("created_at", { ascending: false }),
      ]);

    if (campaignResult.error) {
      throw campaignResult.error;
    }

    const campaigns = campaignResult.data ?? [];
    const milestones = milestoneResult.error ? [] : milestoneResult.data ?? [];
    const applications = applicationResult.error
      ? []
      : applicationResult.data ?? [];

    const statusOrder = [
      "pending_approval",
      "active",
      "rejected",
      "completed",
      "closed",
    ];
    const campaignStatusDistribution = statusOrder.map((status) => ({
      status,
      count: campaigns.filter((campaign) => campaign.campaign_status === status)
        .length,
    }));

    const pendingCampaigns = campaigns.filter(
      (campaign) => campaign.campaign_status === "pending_approval",
    );
    const submittedMilestones = milestones.filter(
      (milestone) => milestone.status === "submitted",
    );
    const pendingShelters = applications.filter(
      (application) => application.status === "pending",
    );

    return NextResponse.json({
      summary: {
        totalCampaigns: campaigns.length,
        pendingCampaigns: pendingCampaigns.length,
        activeCampaigns: campaigns.filter(
          (campaign) => campaign.campaign_status === "active",
        ).length,
        rejectedCampaigns: campaigns.filter(
          (campaign) => campaign.campaign_status === "rejected",
        ).length,
        pendingMilestones: submittedMilestones.length,
        totalDonations: DEMO_DONATIONS,
        totalFundsReleased: DEMO_RELEASED_FUNDS,
      },
      campaignStatusDistribution,
      recentCampaigns: campaigns.slice(0, 5),
      reviewQueue: {
        pendingShelterCount: pendingShelters.length,
        pendingCampaigns: pendingCampaigns.slice(0, 3),
        submittedMilestones: submittedMilestones.slice(0, 3),
        pendingShelters: pendingShelters.slice(0, 3),
      },
      dataSources: {
        campaigns: "live",
        milestones: milestoneResult.error ? "unavailable" : "live",
        shelterApplications: applicationResult.error ? "unavailable" : "live",
        donations: "demo",
        releasedFunds: "demo",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to load admin analytics.",
      },
      { status: 500 },
    );
  }
}
