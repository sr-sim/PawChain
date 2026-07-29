import { NextRequest, NextResponse } from "next/server";
import { formatEther } from "viem";
import { isAdminWallet } from "@/lib/admin-wallets";
import { createAdminClient } from "@/lib/supabase/admin";

const validHash = (value: unknown): value is string =>
  typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value);

const weiToEth = (value: bigint) => Number(formatEther(value));
const safeWei = (value: unknown) => {
  try {
    return BigInt(String(value ?? "0"));
  } catch {
    return BigInt(0);
  }
};

function dateKey(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function percentageChange(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    if (!(await isAdminWallet(params.get("walletAddress") ?? ""))) {
      return NextResponse.json({ message: "Access denied." }, { status: 403 });
    }

    const now = new Date();
    const period = params.get("period") ?? "30";
    const requestedFrom = params.get("dateFrom");
    const requestedTo = params.get("dateTo");
    const days = period === "all" ? 0 : Math.max(1, Number(period) || 30);
    const to = requestedTo ? new Date(`${requestedTo}T23:59:59.999Z`) : now;
    const from = requestedFrom
      ? new Date(`${requestedFrom}T00:00:00.000Z`)
      : days
        ? new Date(to.getTime() - (days - 1) * 86_400_000)
        : new Date(0);
    const duration = Math.max(86_400_000, to.getTime() - from.getTime() + 1);
    const previousFrom = new Date(from.getTime() - duration);
    const campaignFilter = params.get("campaignId") ?? "all";

    const supabase = createAdminClient();
    const [
      { data: donations, error: donationError },
      { data: campaigns, error: campaignError },
      { data: milestones, error: milestoneError },
      { data: applications, error: applicationError },
      { data: profiles, error: profileError },
    ] = await Promise.all([
      supabase
        .from("donations")
        .select(
          "id, donor_id, campaign_id, amount, amount_wei, tx_hash, refund_tx_hash, refunded_at, status, created_at",
        ),
      supabase
        .from("campaigns")
        .select(
          "id, shelter_id, title, goal_amount, current_amount, goal_wei, eth_myr_rate, campaign_status, blockchain_deadline, deployment_tx_hash, cancellation_tx_hash, cancelled_at, created_at",
        ),
      supabase
        .from("campaign_milestones")
        .select(
          "id, campaign_id, title, percentage, status, proof_tx_hash, review_tx_hash, release_tx_hash, created_at, updated_at",
        ),
      supabase
        .from("shelter_applications")
        .select("id, user_id, shelter_name, status, created_at"),
      supabase.from("profiles").select("id, wallet_address, account_status"),
    ]);
    if (donationError) throw donationError;
    if (campaignError) throw campaignError;
    if (milestoneError) throw milestoneError;
    if (applicationError) throw applicationError;
    if (profileError) throw profileError;

    const campaignRows = campaigns ?? [];
    const milestoneRows = milestones ?? [];
    const donationRows = donations ?? [];
    const scopedCampaigns =
      campaignFilter === "all"
        ? campaignRows
        : campaignRows.filter((item) => item.id === campaignFilter);
    const campaignIds = new Set(scopedCampaigns.map((item) => item.id));
    const scopedDonations = donationRows.filter((item) =>
      campaignIds.has(item.campaign_id),
    );
    const scopedMilestones = milestoneRows.filter((item) =>
      campaignIds.has(item.campaign_id),
    );
    const inRange = (value: string | null) => {
      if (!value) return false;
      const time = new Date(value).getTime();
      return time >= from.getTime() && time <= to.getTime();
    };
    const inPreviousRange = (value: string | null) => {
      if (!value) return false;
      const time = new Date(value).getTime();
      return time >= previousFrom.getTime() && time < from.getTime();
    };
    const periodDonations = scopedDonations.filter((item) =>
      inRange(item.created_at),
    );
    const previousDonations = scopedDonations.filter((item) =>
      inPreviousRange(item.created_at),
    );

    const confirmed = periodDonations.filter(
      (item) => item.status !== "failed" && validHash(item.tx_hash),
    );
    const previousConfirmed = previousDonations.filter(
      (item) => item.status !== "failed" && validHash(item.tx_hash),
    );
    const donationWei = confirmed.reduce(
      (sum, item) => sum + safeWei(item.amount_wei),
      BigInt(0),
    );
    const previousDonationWei = previousConfirmed.reduce(
      (sum, item) => sum + safeWei(item.amount_wei),
      BigInt(0),
    );
    const donationMyr = confirmed.reduce(
      (sum, item) => sum + Number(item.amount ?? 0),
      0,
    );

    let releasedWei = BigInt(0);
    let releasedMyr = 0;
    for (const milestone of scopedMilestones) {
      if (!validHash(milestone.release_tx_hash) || !inRange(milestone.updated_at))
        continue;
      const campaign = campaignRows.find(
        (item) => item.id === milestone.campaign_id,
      );
      const basisPoints = BigInt(Math.round(Number(milestone.percentage ?? 0) * 100));
      releasedWei +=
        (safeWei(campaign?.goal_wei) * basisPoints) / BigInt(10_000);
      releasedMyr +=
        Number(campaign?.goal_amount ?? 0) *
        (Number(milestone.percentage ?? 0) / 100);
    }

    const refunded = scopedDonations.filter(
      (item) => validHash(item.refund_tx_hash) && inRange(item.refunded_at),
    );
    const refundWei = refunded.reduce(
      (sum, item) => sum + safeWei(item.amount_wei),
      BigInt(0),
    );
    const refundMyr = refunded.reduce(
      (sum, item) => sum + Number(item.amount ?? 0),
      0,
    );
    const lockedWei =
      donationWei > releasedWei + refundWei
        ? donationWei - releasedWei - refundWei
        : BigInt(0);
    const lockedMyr = Math.max(0, donationMyr - releasedMyr - refundMyr);
    const uniqueDonors = new Set(confirmed.map((item) => item.donor_id)).size;
    const donorCounts = new Map<string, number>();
    for (const item of confirmed) {
      donorCounts.set(item.donor_id, (donorCounts.get(item.donor_id) ?? 0) + 1);
    }
    const returningDonors = [...donorCounts.values()].filter(
      (count) => count > 1,
    ).length;

    const trendMap = new Map<
      string,
      { amountWei: bigint; amountMyr: number; count: number; donors: Set<string> }
    >();
    for (const item of confirmed) {
      const key = dateKey(item.created_at);
      const bucket = trendMap.get(key) ?? {
        amountWei: BigInt(0),
        amountMyr: 0,
        count: 0,
        donors: new Set<string>(),
      };
      bucket.amountWei += safeWei(item.amount_wei);
      bucket.amountMyr += Number(item.amount ?? 0);
      bucket.count++;
      bucket.donors.add(item.donor_id);
      trendMap.set(key, bucket);
    }
    const trend = [...trendMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({
        date,
        amountEth: weiToEth(value.amountWei),
        amountMyr: value.amountMyr,
        count: value.count,
        uniqueDonors: value.donors.size,
      }));

    const campaignPerformance = scopedCampaigns
      .map((campaign) => {
        const campaignDonations = scopedDonations.filter(
          (item) =>
            item.campaign_id === campaign.id &&
            item.status !== "failed" &&
            validHash(item.tx_hash),
        );
        const donors = new Set(campaignDonations.map((item) => item.donor_id));
        const refunds = campaignDonations.filter((item) =>
          validHash(item.refund_tx_hash),
        );
        const raisedWei = campaignDonations.reduce(
          (sum, item) => sum + safeWei(item.amount_wei),
          BigInt(0),
        );
        const goalWei = safeWei(campaign.goal_wei);
        const progress = goalWei
          ? Math.min(100, (weiToEth(raisedWei) / weiToEth(goalWei)) * 100)
          : 0;
        return {
          id: campaign.id,
          title: campaign.title,
          status: campaign.campaign_status,
          raisedEth: weiToEth(raisedWei),
          raisedMyr: campaignDonations.reduce(
            (sum, item) => sum + Number(item.amount ?? 0),
            0,
          ),
          goalEth: weiToEth(goalWei),
          progress,
          donors: donors.size,
          refundRate: campaignDonations.length
            ? (refunds.length / campaignDonations.length) * 100
            : 0,
          deadline: campaign.blockchain_deadline,
        };
      })
      .sort((a, b) => b.raisedEth - a.raisedEth);

    const milestoneStatuses = [
      "pending",
      "submitted",
      "approved",
      "rejected",
      "released",
    ].map((status) => ({
      status,
      count: scopedMilestones.filter((item) =>
        status === "released"
          ? validHash(item.release_tx_hash)
          : item.status === status && !validHash(item.release_tx_hash),
      ).length,
    }));
    const reviewed = scopedMilestones.filter(
      (item) => item.status === "approved" || item.status === "rejected",
    );
    const averageReviewHours = reviewed.length
      ? reviewed.reduce(
          (sum, item) =>
            sum +
            Math.max(
              0,
              new Date(item.updated_at).getTime() -
                new Date(item.created_at).getTime(),
            ),
          0,
        ) /
        reviewed.length /
        3_600_000
      : 0;
    const delayedMilestones = scopedMilestones.filter(
      (item) =>
        (item.status === "submitted" || item.status === "pending") &&
        now.getTime() - new Date(item.updated_at).getTime() > 7 * 86_400_000,
    ).length;

    const approvedApplications = (applications ?? []).filter(
      (item) => item.status === "approved",
    );
    const profileMap = new Map(
      (profiles ?? []).map((item) => [item.id, item]),
    );
    const shelterInsights = approvedApplications
      .map((application) => {
        const shelterCampaigns = campaignRows.filter(
          (item) => item.shelter_id === application.user_id,
        );
        const ids = new Set(shelterCampaigns.map((item) => item.id));
        const shelterDonations = donationRows.filter(
          (item) =>
            ids.has(item.campaign_id) &&
            item.status !== "failed" &&
            validHash(item.tx_hash),
        );
        const shelterMilestones = milestoneRows.filter((item) =>
          ids.has(item.campaign_id),
        );
        const released = shelterMilestones.filter((item) =>
          validHash(item.release_tx_hash),
        );
        const refundedCount = shelterDonations.filter((item) =>
          validHash(item.refund_tx_hash),
        ).length;
        return {
          id: application.user_id,
          name: application.shelter_name,
          active:
            profileMap.get(application.user_id)?.account_status !== "deactivated",
          campaigns: shelterCampaigns.length,
          raisedEth: weiToEth(
            shelterDonations.reduce(
              (sum, item) => sum + safeWei(item.amount_wei),
              BigInt(0),
            ),
          ),
          completionRate: shelterMilestones.length
            ? (released.length / shelterMilestones.length) * 100
            : 0,
          refundRate: shelterDonations.length
            ? (refundedCount / shelterDonations.length) * 100
            : 0,
        };
      })
      .sort((a, b) => b.raisedEth - a.raisedEth);

    const actions = [
      ...scopedDonations.map((item) => ({
        type: "Donation",
        status:
          item.status === "failed"
            ? "failed"
            : validHash(item.tx_hash)
              ? "confirmed"
              : "pending",
      })),
      ...scopedDonations
        .filter((item) => item.refund_tx_hash)
        .map((item) => ({
          type: "Refund",
          status: validHash(item.refund_tx_hash) ? "confirmed" : "failed",
        })),
      ...scopedCampaigns
        .filter((item) => item.deployment_tx_hash)
        .map((item) => ({
          type: "Campaign deployment",
          status: validHash(item.deployment_tx_hash) ? "confirmed" : "failed",
        })),
      ...scopedCampaigns
        .filter((item) => item.cancellation_tx_hash)
        .map((item) => ({
          type: "Campaign cancellation",
          status: validHash(item.cancellation_tx_hash)
            ? "confirmed"
            : "failed",
        })),
      ...scopedMilestones.flatMap((item) => [
        ...(item.proof_tx_hash
          ? [
              {
                type: "Proof submission",
                status: validHash(item.proof_tx_hash) ? "confirmed" : "failed",
              },
            ]
          : []),
        ...(item.review_tx_hash
          ? [
              {
                type: "Milestone review",
                status: validHash(item.review_tx_hash) ? "confirmed" : "failed",
              },
            ]
          : []),
        ...(item.release_tx_hash
          ? [
              {
                type: "Fund release",
                status: validHash(item.release_tx_hash) ? "confirmed" : "failed",
              },
            ]
          : []),
      ]),
    ];
    const actionTypes = [
      "Donation",
      "Campaign deployment",
      "Campaign cancellation",
      "Proof submission",
      "Milestone review",
      "Fund release",
      "Refund",
    ].map((type) => ({
      type,
      count: actions.filter((item) => item.type === type).length,
    }));

    return NextResponse.json({
      range: { from: from.toISOString(), to: to.toISOString(), period },
      campaigns: scopedCampaigns.map(({ id, title }) => ({ id, title })),
      financial: {
        donatedWei: donationWei.toString(),
        donatedMyr: donationMyr,
        releasedWei: releasedWei.toString(),
        releasedMyr,
        lockedWei: lockedWei.toString(),
        lockedMyr,
        refundedWei: refundWei.toString(),
        refundedMyr: refundMyr,
        donationChange: percentageChange(
          weiToEth(donationWei),
          weiToEth(previousDonationWei),
        ),
      },
      donorMetrics: {
        donationCount: confirmed.length,
        uniqueDonors,
        averageDonationEth: confirmed.length
          ? weiToEth(donationWei) / confirmed.length
          : 0,
        returningDonorRate: uniqueDonors
          ? (returningDonors / uniqueDonors) * 100
          : 0,
      },
      trend,
      campaignSummary: {
        active: scopedCampaigns.filter(
          (item) => item.campaign_status === "active",
        ).length,
        completed: scopedCampaigns.filter(
          (item) => item.campaign_status === "completed",
        ).length,
        fullyFunded: campaignPerformance.filter(
          (item) => item.progress >= 100,
        ).length,
        approachingDeadline: campaignPerformance.filter((item) => {
          if (!item.deadline || item.status !== "active") return false;
          const remaining = new Date(item.deadline).getTime() - now.getTime();
          return remaining > 0 && remaining <= 7 * 86_400_000;
        }).length,
        underperforming: campaignPerformance.filter(
          (item) => item.status === "active" && item.progress < 25,
        ).length,
      },
      campaignPerformance: campaignPerformance.slice(0, 10),
      fundDistribution: [
        { label: "Released", amountEth: weiToEth(releasedWei), amountMyr: releasedMyr },
        { label: "Locked", amountEth: weiToEth(lockedWei), amountMyr: lockedMyr },
        { label: "Refunded", amountEth: weiToEth(refundWei), amountMyr: refundMyr },
      ],
      milestoneMetrics: {
        statuses: milestoneStatuses,
        averageReviewHours,
        delayed: delayedMilestones,
        readyForRelease: scopedMilestones.filter(
          (item) =>
            item.status === "approved" && !validHash(item.release_tx_hash),
        ).length,
      },
      shelterMetrics: {
        verified: approvedApplications.length,
        active: shelterInsights.filter((item) => item.active).length,
        shelters: shelterInsights.slice(0, 10),
      },
      blockchainHealth: {
        confirmed: actions.filter((item) => item.status === "confirmed").length,
        pending: actions.filter((item) => item.status === "pending").length,
        failed: actions.filter((item) => item.status === "failed").length,
        actionTypes,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to load platform analytics.",
      },
      { status: 500 },
    );
  }
}
