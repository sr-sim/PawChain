import { NextRequest, NextResponse } from "next/server";
import { isAdminWallet } from "@/lib/admin-wallets";
import { getRoleNFTStatus, mintRoleNFT } from "@/lib/role-nft";
import { createAdminClient } from "@/lib/supabase/admin";

function readAdminWallet(request: NextRequest) {
  return request.nextUrl.searchParams.get("walletAddress");
}

export async function GET(request: NextRequest) {
  const adminWallet = readAdminWallet(request);

  if (!(await isAdminWallet(adminWallet))) {
    return NextResponse.json(
      { message: "Access denied. This wallet is not an admin." },
      { status: 403 },
    );
  }

  const supabase = createAdminClient();
  const { data: applications, error } = await supabase
    .from("shelter_applications")
    .select(
      "id, user_id, shelter_name, registration_id, contact_phone, website_url, shelter_address, organization_description, proof_document_path, status, reviewed_by, reviewed_at, rejection_reason, created_at, updated_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ applications: applications ?? [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const adminWallet = String(body.walletAddress ?? "");
  const applicationId = String(body.applicationId ?? "");
  const action = String(body.action ?? "");
  const rejectionReason = String(body.rejectionReason ?? "").trim();

  if (!(await isAdminWallet(adminWallet))) {
    return NextResponse.json(
      { message: "Access denied. This wallet is not an admin." },
      { status: 403 },
    );
  }

  if (!applicationId || (action !== "approve" && action !== "reject")) {
    return NextResponse.json(
      { message: "Invalid admin action." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("wallet_address", adminWallet.toLowerCase())
    .maybeSingle();

  const { data: currentApplication, error: currentApplicationError } =
    await supabase
      .from("shelter_applications")
      .select("id, user_id, status")
      .eq("id", applicationId)
      .single();

  if (currentApplicationError) {
    return NextResponse.json(
      { message: currentApplicationError.message },
      { status: 500 },
    );
  }

  if (currentApplication.status !== "pending") {
    return NextResponse.json(
      { message: "Only pending applications can be reviewed." },
      { status: 409 },
    );
  }

  if (action === "approve") {
    const { data: shelterProfile, error: profileError } = await supabase
      .from("profiles")
      .select("wallet_address")
      .eq("id", currentApplication.user_id)
      .eq("role", "shelter")
      .single();

    if (profileError) {
      return NextResponse.json({ message: profileError.message }, { status: 500 });
    }

    if (!shelterProfile?.wallet_address) {
      return NextResponse.json(
        { message: "Shelter wallet address is missing." },
        { status: 400 },
      );
    }

    const roleStatus = await getRoleNFTStatus(shelterProfile.wallet_address);

    if (!roleStatus.hasNFT) {
      await mintRoleNFT(shelterProfile.wallet_address, "shelter");
    } else if (roleStatus.dbRole !== "shelter") {
      return NextResponse.json(
        { message: "This wallet already has a different RoleNFT." },
        { status: 409 },
      );
    }

    const { error } = await supabase
      .from("shelter_applications")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminProfile?.id ?? null,
        rejection_reason: null,
      })
      .eq("id", applicationId);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: "approved" });
  }

  if (!rejectionReason) {
    return NextResponse.json(
      { message: "A rejection reason is required." },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("shelter_applications")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminProfile?.id ?? null,
      rejection_reason: rejectionReason,
    })
    .eq("id", applicationId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "rejected" });
}
