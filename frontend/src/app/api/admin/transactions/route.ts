import { NextRequest, NextResponse } from "next/server";
import { isAdminWallet } from "@/lib/admin-wallets";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FinancialTransaction } from "@/lib/financial-transactions";

const validHash = (value: unknown): value is string =>
  typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value);

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const walletAddress = params.get("walletAddress") ?? "";
    if (!(await isAdminWallet(walletAddress))) {
      return NextResponse.json({ message: "Access denied." }, { status: 403 });
    }

    const supabase = createAdminClient();
    const [
      { data: donations, error: donationError },
      { data: milestones, error: milestoneError },
      { data: campaigns, error: campaignError },
      { data: profiles, error: profileError },
    ] = await Promise.all([
      supabase
        .from("donations")
        .select(
          "id, donor_id, campaign_id, amount, amount_wei, tx_hash, refund_tx_hash, refunded_at, status, created_at, updated_at",
        ),
      supabase
        .from("campaign_milestones")
        .select(
          "id, campaign_id, title, percentage, release_tx_hash, updated_at",
        )
        .not("release_tx_hash", "is", null),
      supabase
        .from("campaigns")
        .select(
          "id, shelter_id, title, goal_amount, goal_wei, chain_id, eth_myr_rate",
        ),
      supabase.from("profiles").select("id, wallet_address"),
    ]);
    if (donationError) throw donationError;
    if (milestoneError) throw milestoneError;
    if (campaignError) throw campaignError;
    if (profileError) throw profileError;

    const campaignMap = new Map(
      (campaigns ?? []).map((campaign) => [campaign.id, campaign]),
    );
    const walletMap = new Map(
      (profiles ?? []).map((profile) => [
        profile.id,
        profile.wallet_address ?? "",
      ]),
    );
    const all: FinancialTransaction[] = [];

    for (const donation of donations ?? []) {
      const campaign = campaignMap.get(donation.campaign_id);
      if (validHash(donation.tx_hash)) {
        all.push({
          id: `donation-${donation.id}`,
          txHash: donation.tx_hash,
          transactionType: "donation",
          campaignId: donation.campaign_id,
          campaignTitle: campaign?.title ?? "Unknown campaign",
          milestoneId: null,
          milestoneTitle: null,
          walletAddress: walletMap.get(donation.donor_id) || "Unknown wallet",
          amountWei: String(donation.amount_wei ?? "0"),
          amountMyr: Number(donation.amount ?? 0),
          chainId: Number(campaign?.chain_id ?? 11155111),
          blockNumber: 0,
          occurredAt: donation.created_at,
          status:
            donation.status === "failed"
              ? "failed"
              : donation.status === "pending"
                ? "pending"
                : "confirmed",
        });
      }
      if (validHash(donation.refund_tx_hash)) {
        all.push({
          id: `refund-${donation.id}`,
          txHash: donation.refund_tx_hash,
          transactionType: "refund",
          campaignId: donation.campaign_id,
          campaignTitle: campaign?.title ?? "Unknown campaign",
          milestoneId: null,
          milestoneTitle: null,
          walletAddress: walletMap.get(donation.donor_id) || "Unknown wallet",
          amountWei: String(donation.amount_wei ?? "0"),
          amountMyr: Number(donation.amount ?? 0),
          chainId: Number(campaign?.chain_id ?? 11155111),
          blockNumber: 0,
          occurredAt: donation.refunded_at ?? donation.updated_at,
          status: "confirmed",
        });
      }
    }

    for (const milestone of milestones ?? []) {
      if (!validHash(milestone.release_tx_hash)) continue;
      const campaign = campaignMap.get(milestone.campaign_id);
      const percentage = Number(milestone.percentage ?? 0) / 100;
      const goalWei = BigInt(String(campaign?.goal_wei ?? "0"));
      all.push({
        id: `release-${milestone.id}`,
        txHash: milestone.release_tx_hash,
        transactionType: "fund_release",
        campaignId: milestone.campaign_id,
        campaignTitle: campaign?.title ?? "Unknown campaign",
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        walletAddress:
          walletMap.get(campaign?.shelter_id ?? "") || "Unknown wallet",
        amountWei: (
          (goalWei * BigInt(Math.round(percentage * 10_000))) /
          BigInt(10_000)
        ).toString(),
        amountMyr: Number(campaign?.goal_amount ?? 0) * percentage,
        chainId: Number(campaign?.chain_id ?? 11155111),
        blockNumber: 0,
        occurredAt: milestone.updated_at,
        status: "confirmed",
      });
    }

    const type = params.get("type") ?? "all";
    const status = params.get("status") ?? "all";
    const search = (params.get("search") ?? "").trim().toLowerCase();
    const dateFrom = params.get("dateFrom");
    const dateTo = params.get("dateTo");
    const since = params.get("since");
    const filtered = all
      .filter((item) => type === "all" || item.transactionType === type)
      .filter((item) => status === "all" || item.status === status)
      .filter(
        (item) =>
          !search ||
          item.txHash.toLowerCase().includes(search) ||
          item.walletAddress.toLowerCase().includes(search) ||
          item.campaignTitle.toLowerCase().includes(search),
      )
      .filter(
        (item) => !dateFrom || new Date(item.occurredAt) >= new Date(dateFrom),
      )
      .filter(
        (item) => !dateTo || new Date(item.occurredAt) <= new Date(dateTo),
      )
      .filter((item) => !since || item.occurredAt > since)
      .sort(
        (a, b) =>
          new Date(b.occurredAt).getTime() -
          new Date(a.occurredAt).getTime(),
      );

    const summary = all.reduce(
      (result, item) => {
        const amount = item.amountMyr ?? 0;
        const amountWei = BigInt(item.amountWei || "0");
        result.transactionCount++;
        if (item.transactionType === "donation") {
          result.donationMyr += amount;
          result.donationWei += amountWei;
        }
        if (item.transactionType === "refund") {
          result.refundMyr += amount;
          result.refundWei += amountWei;
        }
        if (item.transactionType === "fund_release") {
          result.fundReleaseMyr += amount;
          result.fundReleaseWei += amountWei;
        }
        return result;
      },
      {
        donationMyr: 0,
        refundMyr: 0,
        fundReleaseMyr: 0,
        donationWei: BigInt(0),
        refundWei: BigInt(0),
        fundReleaseWei: BigInt(0),
        transactionCount: 0,
      },
    );
    const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
    const pageSize = Math.min(
      100,
      Math.max(10, Number(params.get("pageSize") ?? 25) || 25),
    );
    const transactions = since
      ? filtered.slice(0, 100)
      : filtered.slice((page - 1) * pageSize, page * pageSize);

    return NextResponse.json({
      transactions,
      summary: {
        ...summary,
        donationWei: summary.donationWei.toString(),
        refundWei: summary.refundWei.toString(),
        fundReleaseWei: summary.fundReleaseWei.toString(),
      },
      pagination: {
        page,
        pageSize,
        total: filtered.length,
        totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
      },
      latestCursor:
        transactions.reduce(
          (latest, item) =>
            item.occurredAt > latest ? item.occurredAt : latest,
          since ?? "",
        ) || new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "Unable to load transactions.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
