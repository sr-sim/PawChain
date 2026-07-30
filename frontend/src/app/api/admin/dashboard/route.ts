import { NextRequest, NextResponse } from "next/server";
import { isAdminWallet } from "@/lib/admin-wallets";
import { createAdminClient } from "@/lib/supabase/admin";

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
    const [campaignResult, milestoneResult, applicationResult, donationResult] =
      await Promise.all([
        supabase
          .from("campaigns")
          .select(
            "id, title, campaign_status, urgency_level, current_amount, goal_amount, goal_wei, created_at",
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("campaign_milestones")
          .select("id, campaign_id, title, status, percentage, release_tx_hash, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("shelter_applications")
          .select("id, shelter_name, status, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("donations").select("amount_wei, status"),
      ]);

    if (campaignResult.error) {
      throw campaignResult.error;
    }

    const campaigns = campaignResult.data ?? [];
    const milestones = milestoneResult.error ? [] : milestoneResult.data ?? [];
    const applications = applicationResult.error
      ? []
      : applicationResult.data ?? [];
    const donations = donationResult.error ? [] : donationResult.data ?? [];
    const totalDonationsWei = donations
      .filter((donation) => donation.status === "confirmed")
      .reduce(
        (total, donation) =>
          total + BigInt(String(donation.amount_wei ?? "0")),
        BigInt(0),
      );
    const campaignMap = new Map(
      campaigns.map((campaign) => [campaign.id, campaign]),
    );
    const totalFundsReleasedWei = milestones
      .filter((milestone) => Boolean(milestone.release_tx_hash))
      .reduce((total, milestone) => {
        const campaign = campaignMap.get(milestone.campaign_id);
        const goalWei = BigInt(String(campaign?.goal_wei ?? "0"));
        const basisPoints = BigInt(
          Math.round(Number(milestone.percentage ?? 0) * 100),
        );
        return total + (goalWei * basisPoints) / BigInt(10_000);
      }, BigInt(0));

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
        totalDonationsWei: totalDonationsWei.toString(),
        totalFundsReleasedWei: totalFundsReleasedWei.toString(),
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
        donations: donationResult.error ? "unavailable" : "live",
        releasedFunds: milestoneResult.error ? "unavailable" : "live",
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
