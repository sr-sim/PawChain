import { NextRequest, NextResponse } from "next/server";
import { isAdminWallet } from "@/lib/admin-wallets";
import { createAdminClient } from "@/lib/supabase/admin";

async function authorize(walletAddress: string) {
  if (!(await isAdminWallet(walletAddress))) {
    throw new Error("ADMIN_DENIED");
  }
  return createAdminClient();
}

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.nextUrl.searchParams.get("walletAddress") ?? "";
    const supabase = await authorize(walletAddress);
    const { data: campaigns, error } = await supabase
      .from("campaigns")
      .select("id, shelter_id, title, description, location, goal_amount, current_amount, urgency_level, campaign_status, duration_days, image_url, contract_address, created_at, updated_at, rejection_reason, campaign_milestones(id, campaign_id, title, description, requirement, percentage, status, proof_url, rejection_reason, created_at, updated_at)")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const shelterIds = [...new Set((campaigns ?? []).map((item) => item.shelter_id))];
    const { data: profiles } = shelterIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", shelterIds)
      : { data: [] };
    const profileMap = new Map((profiles ?? []).map((item) => [item.id, item.full_name]));
    return NextResponse.json({ campaigns: (campaigns ?? []).map((item) => ({ ...item, shelter_name: profileMap.get(item.shelter_id) ?? null })) });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error && error.message === "ADMIN_DENIED" ? "Access denied." : error instanceof Error ? error.message : "Unable to load campaigns." },
      { status: error instanceof Error && error.message === "ADMIN_DENIED" ? 403 : 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const walletAddress = String(body.walletAddress ?? "");
    const campaignId = String(body.campaignId ?? "");
    const action = String(body.action ?? "");
    const reason = String(body.rejectionReason ?? "").trim();
    if (!campaignId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ message: "Invalid campaign action." }, { status: 400 });
    }
    if (action === "reject" && !reason) {
      return NextResponse.json({ message: "A rejection reason is required." }, { status: 400 });
    }
    const supabase = await authorize(walletAddress);
    const { data: campaign, error: lookupError } = await supabase
      .from("campaigns").select("id, campaign_status").eq("id", campaignId).single();
    if (lookupError) throw lookupError;
    if (campaign.campaign_status !== "pending_approval") {
      return NextResponse.json({ message: "Only pending campaigns can be reviewed." }, { status: 409 });
    }
    const { error } = await supabase.from("campaigns").update({
      campaign_status: action === "approve" ? "active" : "rejected",
      rejection_reason: action === "approve" ? null : reason,
      updated_at: new Date().toISOString(),
    }).eq("id", campaignId);
    if (error) throw error;
    return NextResponse.json({ status: action === "approve" ? "active" : "rejected" });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error && error.message === "ADMIN_DENIED" ? "Access denied." : error instanceof Error ? error.message : "Unable to review campaign." },
      { status: error instanceof Error && error.message === "ADMIN_DENIED" ? 403 : 500 },
    );
  }
}
