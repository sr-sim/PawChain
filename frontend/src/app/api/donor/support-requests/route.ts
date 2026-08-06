import { NextRequest, NextResponse } from "next/server";
import { requireWalletSession } from "@/lib/wallet-session";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function getRequestType(target: string, concernType: string) {
  const normalizedTarget = target.toLowerCase();
  const normalizedConcern = concernType.toLowerCase();

  if (normalizedConcern.includes("misuse")) {
    return "misuse_of_funds";
  }

  if (normalizedConcern.includes("milestone")) {
    return "milestone_concern";
  }

  if (normalizedConcern.includes("donation")) {
    return "donation_issue";
  }

  if (normalizedTarget === "shelter") {
    return "shelter_report";
  }

  if (normalizedTarget === "campaign") {
    return "campaign_report";
  }

  return "general_question";
}

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
    const walletAddress = request.nextUrl.searchParams.get("walletAddress");
    requireWalletSession(request, walletAddress);
    const requestId = request.nextUrl.searchParams.get("id");

    if (!walletAddress) {
      return NextResponse.json(
        { requests: [], message: "Wallet address is required." },
        { status: 400 },
      );
    }

    const donor = await getDonorProfile(walletAddress);

    if (!donor.profile) {
      return NextResponse.json(
        { requests: [], message: "No donor account found for this wallet." },
        { status: 404 },
      );
    }

    let query = donor.supabase
      .from("donor_support_requests")
      .select(
        "id, donor_id, campaign_id, shelter_id, request_type, subject, message, status, admin_response, created_at, updated_at",
      )
      .eq("donor_id", donor.profile.id)
      .order("created_at", { ascending: false });

    if (requestId) {
      query = query.eq("id", requestId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      requests: data ?? [],
      request: requestId ? (data ?? [])[0] ?? null : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        requests: [],
        message:
          error instanceof Error
            ? error.message
            : "Unable to load donor support requests.",
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
    const target = String(body.target ?? "").trim();
    const concernType = String(body.concernType ?? "").trim();
    const campaignId = String(body.campaignId ?? "").trim();
    const shelterId = String(body.shelterId ?? "").trim();
    const message = String(body.message ?? "").trim();
    const txHash = String(body.txHash ?? "").trim();

    if (!walletAddress) {
      return NextResponse.json(
        { message: "Wallet address is required." },
        { status: 400 },
      );
    }

    if (!target || !concernType || !message) {
      return NextResponse.json(
        { message: "Report target, concern type, and details are required." },
        { status: 400 },
      );
    }

    const donor = await getDonorProfile(walletAddress);

    if (!donor.profile) {
      return NextResponse.json(
        { message: "No donor account found for this wallet." },
        { status: 404 },
      );
    }

    const requestType = getRequestType(target, concernType);
    const fullMessage = txHash
      ? `${message}\n\nTransaction hash: ${txHash}`
      : message;
    const { data, error } = await donor.supabase
      .from("donor_support_requests")
      .insert({
        donor_id: donor.profile.id,
        campaign_id: campaignId || null,
        shelter_id: shelterId || null,
        request_type: requestType,
        subject: concernType,
        message: fullMessage,
        status: "pending",
      })
      .select(
        "id, donor_id, campaign_id, shelter_id, request_type, subject, message, status, admin_response, created_at, updated_at",
      )
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      request: data,
      message: "Report submitted to admin review.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to submit donor support request.",
      },
      { status: 500 },
    );
  }
}
