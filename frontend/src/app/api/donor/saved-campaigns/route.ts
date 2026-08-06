import { NextRequest, NextResponse } from "next/server";
import { requireWalletSession } from "@/lib/wallet-session";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function getDonorProfile(walletAddress: string) {
  const supabase = createAdminClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, wallet_address")
    .ilike("wallet_address", walletAddress)
    .eq("role", "donor")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return { supabase, profile };
}

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.nextUrl.searchParams.get("walletAddress") ?? "";
    requireWalletSession(request, walletAddress);

    if (!walletAddress) {
      return NextResponse.json(
        { campaignIds: [], message: "Wallet address is required." },
        { status: 400 },
      );
    }

    const donor = await getDonorProfile(walletAddress);

    if (!donor.profile) {
      return NextResponse.json(
        { campaignIds: [], message: "No donor account found." },
        { status: 404 },
      );
    }

    const { data, error } = await donor.supabase
      .from("donor_saved_campaigns")
      .select("campaign_id")
      .eq("donor_id", donor.profile.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      campaignIds: (data ?? []).map((item) => item.campaign_id),
    });
  } catch (error) {
    return NextResponse.json(
      {
        campaignIds: [],
        message:
          error instanceof Error
            ? error.message
            : "Unable to load saved campaigns.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const walletAddress = String(body.walletAddress ?? "").trim();
    requireWalletSession(request, walletAddress);
    const campaignId = String(body.campaignId ?? "").trim();

    if (!walletAddress || !campaignId) {
      return NextResponse.json(
        { message: "Wallet address and campaign ID are required." },
        { status: 400 },
      );
    }

    const donor = await getDonorProfile(walletAddress);

    if (!donor.profile) {
      return NextResponse.json(
        { message: "No donor account found." },
        { status: 404 },
      );
    }

    const { error } = await donor.supabase.from("donor_saved_campaigns").upsert(
      {
        donor_id: donor.profile.id,
        campaign_id: campaignId,
      },
      { onConflict: "donor_id,campaign_id" },
    );

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: "Campaign saved." });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to save campaign.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const walletAddress = String(body.walletAddress ?? "").trim();
    requireWalletSession(request, walletAddress);
    const campaignId = String(body.campaignId ?? "").trim();

    if (!walletAddress || !campaignId) {
      return NextResponse.json(
        { message: "Wallet address and campaign ID are required." },
        { status: 400 },
      );
    }

    const donor = await getDonorProfile(walletAddress);

    if (!donor.profile) {
      return NextResponse.json(
        { message: "No donor account found." },
        { status: 404 },
      );
    }

    const { error } = await donor.supabase
      .from("donor_saved_campaigns")
      .delete()
      .eq("donor_id", donor.profile.id)
      .eq("campaign_id", campaignId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: "Campaign removed from saved list." });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to remove saved campaign.",
      },
      { status: 500 },
    );
  }
}
