import { NextRequest, NextResponse } from "next/server";
import { formatEther } from "viem";
import { isAdminWallet } from "@/lib/admin-wallets";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVerifiedFinancialEvents } from "@/lib/verified-financial-events";

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
      { data: campaigns, error: campaignError },
      { data: milestones, error: milestoneError },
      { data: applications, error: applicationError },
      { data: profiles, error: profileError },
      verifiedFinancialEvents,
    ] = await Promise.all([
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
      getVerifiedFinancialEvents(),
    ]);
    if (campaignError) throw campaignError;
    if (milestoneError) throw milestoneError;
    if (applicationError) throw applicationError;
    if (profileError) throw profileError;

    const campaignRows = campaigns ?? [];
    const milestoneRows = milestones ?? [];
    const scopedCampaigns =
      campaignFilter === "all"
        ? campaignRows
        : campaignRows.filter((item) => item.id === campaignFilter);
    const campaignIds = new Set(scopedCampaigns.map((item) => item.id));
    const scopedEvents = verifiedFinancialEvents.filter((item) =>
      campaignIds.has(item.campaignId),
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
    const confirmed = scopedEvents.filter(
      (item) =>
        item.transactionType === "donation" && inRange(item.occurredAt),
    );
    const previousConfirmed = scopedEvents.filter(
      (item) =>
        item.transactionType === "donation" &&
        inPreviousRange(item.occurredAt),
    );
    const donationWei = confirmed.reduce(
      (sum, item) => sum + safeWei(item.amountWei),
      BigInt(0),
    );
    const previousDonationWei = previousConfirmed.reduce(
      (sum, item) => sum + safeWei(item.amountWei),
      BigInt(0),
    );
    const released = scopedEvents.filter(
      (item) =>
        item.transactionType === "fund_release" && inRange(item.occurredAt),
    );
    const releasedWei = released.reduce(
      (sum, item) => sum + safeWei(item.amountWei),
      BigInt(0),
    );
    const refunded = scopedEvents.filter(
      (item) => item.transactionType === "refund" && inRange(item.occurredAt),
    );
    const refundWei = refunded.reduce(
      (sum, item) => sum + safeWei(item.amountWei),
      BigInt(0),
    );
    const lockedWei =
      donationWei > releasedWei + refundWei
        ? donationWei - releasedWei - refundWei
        : BigInt(0);
    const uniqueDonors = new Set(
      confirmed.map((item) => item.walletAddress.toLowerCase()),
    ).size;
    const donorCounts = new Map<string, number>();
    for (const item of confirmed) {
      const donor = item.walletAddress.toLowerCase();
      donorCounts.set(donor, (donorCounts.get(donor) ?? 0) + 1);
    }
    const returningDonors = [...donorCounts.values()].filter(
      (count) => count > 1,
    ).length;

    const trendMap = new Map<
      string,
      { amountWei: bigint; amountMyr: number; count: number; donors: Set<string> }
    >();
    for (const item of confirmed) {
      const key = dateKey(item.occurredAt);
      const bucket = trendMap.get(key) ?? {
        amountWei: BigInt(0),
        amountMyr: 0,
        count: 0,
        donors: new Set<string>(),
      };
      bucket.amountWei += safeWei(item.amountWei);
      bucket.count++;
      bucket.donors.add(item.walletAddress.toLowerCase());
      trendMap.set(key, bucket);
    }
    const trendStart =
      period === "all" && confirmed.length
        ? new Date(
            Math.min(...confirmed.map((item) => new Date(item.occurredAt).getTime())),
          )
        : from;
    const trend = confirmed.length
      ? Array.from(
          {
            length:
              Math.floor(
                (Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()) -
                  Date.UTC(
                    trendStart.getUTCFullYear(),
                    trendStart.getUTCMonth(),
                    trendStart.getUTCDate(),
                  )) /
                  86_400_000,
              ) + 1,
          },
          (_, index) => {
            const day = new Date(
              Date.UTC(
                trendStart.getUTCFullYear(),
                trendStart.getUTCMonth(),
                trendStart.getUTCDate() + index,
              ),
            );
            const date = day.toISOString().slice(0, 10);
            const value = trendMap.get(date);
            return {
              date,
              amountEth: value ? weiToEth(value.amountWei) : 0,
              amountMyr: value?.amountMyr ?? 0,
              count: value?.count ?? 0,
              uniqueDonors: value?.donors.size ?? 0,
            };
          },
        )
      : [];

    const campaignPerformance = scopedCampaigns
      .map((campaign) => {
        const campaignDonations = scopedEvents.filter(
          (item) =>
            item.campaignId === campaign.id &&
            item.transactionType === "donation",
        );
        const donors = new Set(
          campaignDonations.map((item) => item.walletAddress.toLowerCase()),
        );
        const refunds = scopedEvents.filter(
          (item) =>
            item.campaignId === campaign.id &&
            item.transactionType === "refund",
        );
        const raisedWei = campaignDonations.reduce(
          (sum, item) => sum + safeWei(item.amountWei),
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
          raisedMyr: 0,
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

    const verifiedReleasedMilestoneIds = new Set(
      scopedEvents
        .filter((item) => item.transactionType === "fund_release")
        .map((item) => item.milestoneId),
    );
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
          ? verifiedReleasedMilestoneIds.has(item.id)
          : item.status === status && !verifiedReleasedMilestoneIds.has(item.id),
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
        const shelterDonations = verifiedFinancialEvents.filter(
          (item) =>
            ids.has(item.campaignId) &&
            item.transactionType === "donation",
        );
        const shelterMilestones = milestoneRows.filter((item) =>
          ids.has(item.campaign_id),
        );
        const released = shelterMilestones.filter((item) =>
          verifiedReleasedMilestoneIds.has(item.id),
        );
        const refundedCount = verifiedFinancialEvents.filter(
          (item) =>
            ids.has(item.campaignId) && item.transactionType === "refund",
        ).length;
        return {
          id: application.user_id,
          name: application.shelter_name,
          active:
            profileMap.get(application.user_id)?.account_status !== "deactivated",
          campaigns: shelterCampaigns.length,
          raisedEth: weiToEth(
            shelterDonations.reduce(
              (sum, item) => sum + safeWei(item.amountWei),
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

    const verifiedTransactions = scopedEvents.filter((item) =>
      inRange(item.occurredAt),
    );
    const transactionLabels = {
      donation: "Donation",
      fund_release: "Fund release",
      refund: "Refund",
    } as const;
    const actionTypes = (
      ["donation", "fund_release", "refund"] as const
    ).map((transactionType) => ({
      type: transactionLabels[transactionType],
      count: verifiedTransactions.filter(
        (item) => item.transactionType === transactionType,
      ).length,
    }));

    return NextResponse.json({
      range: { from: from.toISOString(), to: to.toISOString(), period },
      campaigns: scopedCampaigns.map(({ id, title }) => ({ id, title })),
      financial: {
        donatedWei: donationWei.toString(),
        donatedMyr: 0,
        releasedWei: releasedWei.toString(),
        releasedMyr: 0,
        lockedWei: lockedWei.toString(),
        lockedMyr: 0,
        refundedWei: refundWei.toString(),
        refundedMyr: 0,
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
        { label: "Released", amountEth: weiToEth(releasedWei), amountMyr: 0 },
        { label: "Locked", amountEth: weiToEth(lockedWei), amountMyr: 0 },
        { label: "Refunded", amountEth: weiToEth(refundWei), amountMyr: 0 },
      ],
      milestoneMetrics: {
        statuses: milestoneStatuses,
        averageReviewHours,
        delayed: delayedMilestones,
        readyForRelease: scopedMilestones.filter(
          (item) =>
            item.status === "approved" &&
            !verifiedReleasedMilestoneIds.has(item.id),
        ).length,
      },
      shelterMetrics: {
        verified: approvedApplications.length,
        active: shelterInsights.filter((item) => item.active).length,
        shelters: shelterInsights.slice(0, 10),
      },
      blockchainHealth: {
        confirmed: verifiedTransactions.length,
        pending: 0,
        failed: 0,
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
