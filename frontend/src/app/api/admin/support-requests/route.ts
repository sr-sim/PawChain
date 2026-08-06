import { NextRequest, NextResponse } from "next/server";
import { isAdminWallet } from "@/lib/admin-wallets";
import { createAdminClient } from "@/lib/supabase/admin";
import { walletSessionMatches } from "@/lib/wallet-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.nextUrl.searchParams.get("walletAddress") ?? "";
    if (!walletSessionMatches(request, walletAddress)) {
      return NextResponse.json({ message: "Wallet authentication is required." }, { status: 401 });
    }
    if (!(await isAdminWallet(walletAddress))) {
      return NextResponse.json({ message: "Access denied." }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { data: requests, error } = await supabase
      .from("donor_support_requests")
      .select("id, donor_id, campaign_id, shelter_id, request_type, subject, message, status, admin_response, created_at, updated_at")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const donorIds = [...new Set((requests ?? []).map((item) => item.donor_id))];
    const shelterIds = [...new Set((requests ?? []).map((item) => item.shelter_id).filter(Boolean))] as string[];
    const profileIds = [...new Set([...donorIds, ...shelterIds])];
    const campaignIds = [...new Set((requests ?? []).map((item) => item.campaign_id).filter(Boolean))] as string[];
    const [{ data: profiles, error: profileError }, { data: campaigns, error: campaignError }] = await Promise.all([
      profileIds.length
        ? supabase.from("profiles").select("id, full_name, email").in("id", profileIds)
        : Promise.resolve({ data: [], error: null }),
      campaignIds.length
        ? supabase.from("campaigns").select("id, title, description, image_url, goal_amount, current_amount, urgency_level, campaign_status").in("id", campaignIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (profileError) throw profileError;
    if (campaignError) throw campaignError;

    const profileMap = new Map((profiles ?? []).map((item) => [item.id, item]));
    const campaignMap = new Map((campaigns ?? []).map((item) => [item.id, item]));

    return NextResponse.json({
      requests: (requests ?? []).map((item) => ({
        ...item,
        donor_name: profileMap.get(item.donor_id)?.full_name ?? null,
        donor_email: profileMap.get(item.donor_id)?.email ?? null,
        shelter_name: item.shelter_id ? profileMap.get(item.shelter_id)?.full_name ?? null : null,
        campaign_title: item.campaign_id ? campaignMap.get(item.campaign_id)?.title ?? null : null,
        campaign: item.campaign_id ? campaignMap.get(item.campaign_id) ?? null : null,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { requests: [], message: error instanceof Error ? error.message : "Unable to load support requests." },
      { status: 500 },
    );
  }
}
