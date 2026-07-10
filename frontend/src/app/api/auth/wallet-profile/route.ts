import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRoleNFTStatus } from "@/lib/role-nft";

async function getShelterApplication(
  supabase: ReturnType<typeof createAdminClient>,
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
  try {
    const supabase = createAdminClient();
    const walletAddress = request.nextUrl.searchParams.get("walletAddress");

    if (!walletAddress) {
      return NextResponse.json(
        { message: "Wallet address is required." },
        { status: 400 },
      );
    }

    let roleStatus: Awaited<ReturnType<typeof getRoleNFTStatus>>;

    try {
      roleStatus = await getRoleNFTStatus(walletAddress);
    } catch (error) {
      return NextResponse.json(
        {
          message:
            error instanceof Error
              ? error.message
              : "Unable to verify RoleNFT for this wallet.",
        },
        { status: 503 },
      );
    }

    const { data: rpcProfile, error: rpcError } = await supabase.rpc(
      "wallet_profile_lookup",
      {
        wallet_address_input: walletAddress.toLowerCase(),
      },
    );

    if (!rpcError && Array.isArray(rpcProfile) && rpcProfile.length > 0) {
      const profile = rpcProfile.find((item) =>
        roleStatus.hasNFT ? item.role === roleStatus.dbRole : true,
      );

      if (!profile) {
        return NextResponse.json({
          profile: null,
          nftVerified: roleStatus.hasNFT,
          contractRole: roleStatus.contractRole,
          needsRegistration: true,
        });
      }

      const { data: profileWithId } = await supabase
        .from("profiles")
        .select("id")
        .ilike("wallet_address", walletAddress)
        .maybeSingle();
      const application =
        profile.role === "shelter" && profileWithId?.id
          ? await getShelterApplication(supabase, profileWithId.id)
          : null;

      const isPendingShelter =
        profile.role === "shelter" &&
        (application?.status === "pending" || application?.status === "rejected");

      return NextResponse.json({
        profile: {
          role: profile.role,
          email: profile.email,
          fullName: profile.full_name,
          application,
          nftVerified: roleStatus.hasNFT,
          directDashboard: !isPendingShelter,
        },
        nftVerified: roleStatus.hasNFT,
        contractRole: roleStatus.contractRole,
        needsRegistration: false,
      });
    }

    const { data: fallbackProfiles } = await supabase
      .from("profiles")
      .select("id, role, email, full_name")
      .ilike("wallet_address", walletAddress)
      .limit(5);
    const profile = (fallbackProfiles ?? []).find((item) =>
      roleStatus.hasNFT ? item.role === roleStatus.dbRole : true,
    );
    const application =
      profile?.role === "shelter"
        ? await getShelterApplication(supabase, profile.id)
        : null;
    const isPendingShelter =
      profile?.role === "shelter" &&
      (application?.status === "pending" || application?.status === "rejected");

    return NextResponse.json(
      {
        profile: profile
          ? {
              role: profile.role,
              email: profile.email,
              fullName: profile.full_name,
              application,
              nftVerified: roleStatus.hasNFT,
              directDashboard: !isPendingShelter,
            }
          : null,
        nftVerified: roleStatus.hasNFT,
        contractRole: roleStatus.contractRole,
        needsRegistration: !profile,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to look up wallet profile.",
      },
      { status: 500 },
    );
  }
}
