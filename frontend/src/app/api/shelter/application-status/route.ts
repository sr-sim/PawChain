import { NextRequest, NextResponse } from "next/server";
import { requireWalletSession } from "@/lib/wallet-session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const supabase = createAdminClient();
  const walletAddress = request.nextUrl.searchParams.get("walletAddress");
  requireWalletSession(request, walletAddress);

  if (!walletAddress) {
    return NextResponse.json(
      { message: "Wallet address is required." },
      { status: 400 },
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, account_status, deactivation_reason")
    .ilike("wallet_address", walletAddress)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ message: profileError.message }, { status: 500 });
  }

  if (!profile || profile.role !== "shelter") {
    return NextResponse.json(
      { message: "No shelter account found for this wallet." },
      { status: 404 },
    );
  }

  const { data: application, error } = await supabase
    .from("shelter_applications")
    .select(
      "status, shelter_name, registration_id, contact_phone, website_url, shelter_address, organization_description, proof_document_path, created_at, reviewed_at, rejection_reason",
    )
    .eq("user_id", profile.id)
    .single();

  if (error) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    status: application.status,
    accountStatus: profile.account_status,
    deactivationReason: profile.deactivation_reason,
    application: {
      status: application.status,
      shelterName: application.shelter_name,
      registrationId: application.registration_id,
      contactPhone: application.contact_phone,
      websiteUrl: application.website_url,
      shelterAddress: application.shelter_address,
      organizationDescription: application.organization_description,
      proofDocumentPath: application.proof_document_path,
      submittedAt: application.created_at,
      reviewedAt: application.reviewed_at,
      rejectionReason: application.rejection_reason,
    },
  });
}
