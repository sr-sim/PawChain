import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getShelterApplication(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data: application } = await supabase
    .from("shelter_applications")
    .select(
      "status, shelter_name, registration_id, contact_phone, website_url, shelter_address, organization_description, proof_document_path, created_at, reviewed_at, rejection_reason",
    )
    .eq("user_id", userId)
    .maybeSingle();

  return application
    ? {
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
      }
    : null;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const walletAddress = request.nextUrl.searchParams.get("walletAddress");

  if (!walletAddress) {
    return NextResponse.json(
      { message: "Wallet address is required." },
      { status: 400 },
    );
  }

  const { data: rpcProfile, error: rpcError } = await supabase.rpc(
    "wallet_profile_lookup",
    {
      wallet_address_input: walletAddress.toLowerCase(),
    },
  );

  if (!rpcError && Array.isArray(rpcProfile) && rpcProfile.length > 0) {
    const profile = rpcProfile[0];
    const { data: profileWithId } = await supabase
      .from("profiles")
      .select("id")
      .ilike("wallet_address", walletAddress)
      .maybeSingle();
    const application =
      profile.role === "shelter" && profileWithId?.id
        ? await getShelterApplication(supabase, profileWithId.id)
        : null;

    return NextResponse.json({
      profile: {
        role: profile.role,
        email: profile.email,
        fullName: profile.full_name,
        application,
      },
    });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, email, full_name")
    .ilike("wallet_address", walletAddress)
    .maybeSingle();
  const application =
    profile?.role === "shelter"
      ? await getShelterApplication(supabase, profile.id)
      : null;

  return NextResponse.json({
    profile: profile
      ? {
          role: profile.role,
          email: profile.email,
          fullName: profile.full_name,
          application,
        }
      : null,
  });
}
