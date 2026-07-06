import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function getDonorProfile(walletAddress: string) {
  const supabase = createAdminClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, role, full_name, email, wallet_address, account_status, created_at, updated_at",
    )
    .ilike("wallet_address", walletAddress)
    .eq("role", "donor")
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!profile) {
    return null;
  }

  const { data: donorProfile, error: donorError } = await supabase
    .from("donor_profiles")
    .select("created_at")
    .eq("user_id", profile.id)
    .maybeSingle();

  if (donorError) {
    throw donorError;
  }

  return { supabase, profile, donorProfile };
}

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.nextUrl.searchParams.get("walletAddress");

    if (!walletAddress) {
      return NextResponse.json(
        { message: "Wallet address is required." },
        { status: 400 },
      );
    }

    const donor = await getDonorProfile(walletAddress);

    if (!donor) {
      return NextResponse.json(
        { message: "No donor account found for this wallet." },
        { status: 404 },
      );
    }

    const { profile, donorProfile } = donor;

    return NextResponse.json({
      profile: {
        id: profile.id,
        role: profile.role,
        fullName: profile.full_name,
        email: profile.email,
        walletAddress: profile.wallet_address,
        accountStatus: profile.account_status,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
        donorSince: donorProfile?.created_at ?? profile.created_at,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to load donor profile.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const walletAddress = String(body.walletAddress ?? "").trim();
    const fullName = String(body.fullName ?? "").trim();
    const email = String(body.email ?? "").trim();

    if (!walletAddress) {
      return NextResponse.json(
        { message: "Wallet address is required." },
        { status: 400 },
      );
    }

    if (!fullName || !email) {
      return NextResponse.json(
        { message: "Full name and email are required." },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { message: "Enter a valid email address." },
        { status: 400 },
      );
    }

    const donor = await getDonorProfile(walletAddress);

    if (!donor) {
      return NextResponse.json(
        { message: "No donor account found for this wallet." },
        { status: 404 },
      );
    }

    const now = new Date().toISOString();
    const { supabase, profile } = donor;
    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        email,
        updated_at: now,
      })
      .eq("id", profile.id)
      .select(
        "id, role, full_name, email, wallet_address, account_status, created_at, updated_at",
      )
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      profile: {
        id: updatedProfile.id,
        role: updatedProfile.role,
        fullName: updatedProfile.full_name,
        email: updatedProfile.email,
        walletAddress: updatedProfile.wallet_address,
        accountStatus: updatedProfile.account_status,
        createdAt: updatedProfile.created_at,
        updatedAt: updatedProfile.updated_at,
        donorSince: donor.donorProfile?.created_at ?? updatedProfile.created_at,
      },
      message: "Donor profile updated.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to update donor profile.",
      },
      { status: 500 },
    );
  }
}
