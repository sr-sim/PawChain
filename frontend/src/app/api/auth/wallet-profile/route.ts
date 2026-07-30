import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRoleNFTStatus } from "@/lib/role-nft";
import { createShelterDocumentUrl } from "@/lib/shelter-document-storage";

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
        proofDocumentUrl: application.proof_document_path
          ? await createShelterDocumentUrl(
              supabase,
              application.proof_document_path,
            )
          : null,
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
        .select("id, account_status, deactivation_reason")
        .ilike("wallet_address", walletAddress)
        .maybeSingle();
      const application =
        profile.role === "shelter" && profileWithId?.id
          ? await getShelterApplication(supabase, profileWithId.id)
          : null;

      const isPendingShelter =
        profile.role === "shelter" &&
        (application?.status === "pending" || application?.status === "rejected");
      const isDeactivatedShelter =
        profile.role === "shelter" &&
        profileWithId?.account_status === "deactivated";

      if (!roleStatus.hasNFT && !isPendingShelter && !isDeactivatedShelter) {
        return NextResponse.json({
          profile: null,
          nftVerified: false,
          needsRegistration: true,
        });
      }

      return NextResponse.json({
        profile: {
          role: profile.role,
          email: profile.email,
          fullName: profile.full_name,
          application,
          accountStatus: profileWithId?.account_status ?? "active",
          deactivationReason: profileWithId?.deactivation_reason ?? null,
          deactivationPending: isDeactivatedShelter && roleStatus.hasNFT,
          nftVerified: roleStatus.hasNFT,
          directDashboard:
            roleStatus.hasNFT && !isPendingShelter && !isDeactivatedShelter,
        },
        nftVerified: roleStatus.hasNFT,
        contractRole: roleStatus.contractRole,
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, email, full_name, account_status, deactivation_reason")
      .ilike("wallet_address", walletAddress)
      .eq("role", roleStatus.hasNFT ? roleStatus.dbRole : "shelter")
      .maybeSingle();
    const application =
      profile?.role === "shelter"
        ? await getShelterApplication(supabase, profile.id)
        : null;
    const isPendingShelter =
      profile?.role === "shelter" &&
      (application?.status === "pending" || application?.status === "rejected");
    const isDeactivatedShelter =
      profile?.role === "shelter" &&
      profile.account_status === "deactivated";

    if (!roleStatus.hasNFT && !isPendingShelter && !isDeactivatedShelter) {
      return NextResponse.json({
        profile: null,
        nftVerified: false,
        needsRegistration: true,
      });
    }

    return NextResponse.json(
      {
        profile: profile
          ? {
              role: profile.role,
              email: profile.email,
              fullName: profile.full_name,
              application,
              accountStatus: profile.account_status,
              deactivationReason: profile.deactivation_reason,
              deactivationPending: isDeactivatedShelter && roleStatus.hasNFT,
              nftVerified: roleStatus.hasNFT,
              directDashboard:
                roleStatus.hasNFT &&
                !isPendingShelter &&
                !isDeactivatedShelter,
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
