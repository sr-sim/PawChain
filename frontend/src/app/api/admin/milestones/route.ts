import { NextRequest, NextResponse } from "next/server";
import { isAdminWallet } from "@/lib/admin-wallets";
import { createAdminClient } from "@/lib/supabase/admin";

async function adminClient(wallet: string) {
  if (!(await isAdminWallet(wallet))) throw new Error("ADMIN_DENIED");
  return createAdminClient();
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await adminClient(request.nextUrl.searchParams.get("walletAddress") ?? "");
    const { data, error } = await supabase
      .from("campaign_milestones")
      .select("id, campaign_id, title, description, requirement, percentage, status, proof_url, rejection_reason, created_at, updated_at, campaigns!inner(id, shelter_id, title, campaign_status, goal_amount, current_amount, contract_address, created_at, updated_at)")
      .eq("campaigns.campaign_status", "active")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const shelterIds = [...new Set((data ?? []).map((item) => {
      const campaign = Array.isArray(item.campaigns) ? item.campaigns[0] : item.campaigns;
      return campaign?.shelter_id;
    }).filter(Boolean))];
    const { data: profiles } = shelterIds.length ? await supabase.from("profiles").select("id, full_name").in("id", shelterIds) : { data: [] };
    const names = new Map((profiles ?? []).map((item) => [item.id, item.full_name]));
    const milestones = (data ?? []).map((item) => {
      const campaign = Array.isArray(item.campaigns) ? item.campaigns[0] : item.campaigns;
      return { ...item, campaign: campaign ? { ...campaign, shelter_name: names.get(campaign.shelter_id) ?? null } : null, campaigns: undefined };
    });
    return NextResponse.json({ milestones });
  } catch (error) {
    const denied = error instanceof Error && error.message === "ADMIN_DENIED";
    return NextResponse.json({ message: denied ? "Access denied." : error instanceof Error ? error.message : "Unable to load milestones." }, { status: denied ? 403 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = await adminClient(String(body.walletAddress ?? ""));
    const milestoneId = String(body.milestoneId ?? "");
    const action = String(body.action ?? "");
    const reason = String(body.rejectionReason ?? "").trim();
    if (!milestoneId || !["approve", "reject"].includes(action)) return NextResponse.json({ message: "Invalid milestone action." }, { status: 400 });
    if (action === "reject" && !reason) return NextResponse.json({ message: "A rejection reason is required." }, { status: 400 });
    const { data: milestone, error: lookupError } = await supabase.from("campaign_milestones").select("id, status, proof_url, campaign_id").eq("id", milestoneId).single();
    if (lookupError) throw lookupError;
    const reviewable = Boolean(milestone.proof_url) && ["pending", "submitted"].includes(milestone.status);
    if (!reviewable) return NextResponse.json({ message: "This milestone has no proof awaiting review." }, { status: 409 });
    const { data: campaign } = await supabase.from("campaigns").select("campaign_status").eq("id", milestone.campaign_id).single();
    if (!campaign || !["active", "approved"].includes(campaign.campaign_status)) return NextResponse.json({ message: "The related campaign is not active." }, { status: 409 });

    // Fund release is currently off-chain only. Add the campaign-contract call here
    // before this database update when a release ABI/address workflow is available.
    const { error } = await supabase.from("campaign_milestones").update({ status: action === "approve" ? "approved" : "rejected", rejection_reason: action === "approve" ? null : reason, updated_at: new Date().toISOString() }).eq("id", milestoneId);
    if (error) throw error;
    return NextResponse.json({ status: action === "approve" ? "approved" : "rejected", fundRelease: "not_configured" });
  } catch (error) {
    const denied = error instanceof Error && error.message === "ADMIN_DENIED";
    return NextResponse.json({ message: denied ? "Access denied." : error instanceof Error ? error.message : "Unable to review milestone." }, { status: denied ? 403 : 500 });
  }
}
