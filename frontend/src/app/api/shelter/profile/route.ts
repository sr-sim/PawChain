import { NextRequest, NextResponse } from "next/server";
import { requireWalletSession } from "@/lib/wallet-session";
import { getRoleNFTStatus } from "@/lib/role-nft";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeMalaysiaPhone } from "@/lib/malaysia-phone";

type ShelterApplication = {
  status: string;
  shelter_name: string;
  registration_id: string;
  contact_phone: string;
  website_url: string | null;
  shelter_address: string;
  organization_description: string;
  proof_document_path: string | null;
  created_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
};

type ShelterProfileRow = {
  shelter_image_url: string | null;
};

function isSchemaError(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const details = error as { code?: unknown; message?: unknown };
  const message = String(details.message ?? "").toLowerCase();

  return (
    details.code === "42703" ||
    details.code === "42P01" ||
    message.includes("shelter_profiles") ||
    message.includes("shelter_image_url")
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const details = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };
    const parts = [
      typeof details.message === "string" ? details.message : null,
      typeof details.details === "string" ? details.details : null,
      typeof details.hint === "string" ? details.hint : null,
      typeof details.code === "string" ? `Code: ${details.code}` : null,
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(" ");
    }
  }

  return "Unknown database error.";
}

async function getShelterProfile(walletAddress: string) {
  const supabase = createAdminClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, email, wallet_address")
    .ilike("wallet_address", walletAddress)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!profile || profile.role !== "shelter") {
    return null;
  }

  return { supabase, profile };
}

async function getShelterProfileRow(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("shelter_profiles")
    .select("shelter_image_url")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (isSchemaError(error)) {
      return null;
    }

    throw error;
  }

  return data as ShelterProfileRow | null;
}

function mapApplication(application: ShelterApplication | null) {
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

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.nextUrl.searchParams.get("walletAddress");
    requireWalletSession(request, walletAddress);

    if (!walletAddress) {
      return NextResponse.json(
        { message: "Wallet address is required." },
        { status: 400 },
      );
    }

    const shelter = await getShelterProfile(walletAddress);

    if (!shelter) {
      return NextResponse.json(
        { message: "No shelter account found for this wallet." },
        { status: 404 },
      );
    }

    const { supabase, profile } = shelter;
    const [
      { data: application, error: applicationError },
      shelterProfile,
    ] = await Promise.all([
      supabase
        .from("shelter_applications")
        .select(
          "status, shelter_name, registration_id, contact_phone, website_url, shelter_address, organization_description, proof_document_path, created_at, reviewed_at, rejection_reason",
        )
        .eq("user_id", profile.id)
        .maybeSingle(),
      getShelterProfileRow(supabase, profile.id),
    ]);

    if (applicationError) {
      throw applicationError;
    }

    let roleNFT = null;
    let contractRole = null;
    let nftVerified = false;
    let nftError = null;

    try {
      const roleStatus = await getRoleNFTStatus(walletAddress);
      roleNFT = roleStatus.roleNFT;
      contractRole = roleStatus.contractRole;
      nftVerified = roleStatus.hasNFT;
    } catch (error) {
      nftError =
        error instanceof Error
          ? error.message
          : "Unable to verify RoleNFT for this wallet.";
    }

    return NextResponse.json({
      profile: {
        id: profile.id,
        role: profile.role,
        fullName: profile.full_name,
        email: profile.email,
        walletAddress: profile.wallet_address,
        shelterImageUrl: shelterProfile?.shelter_image_url ?? null,
      },
      application: mapApplication(application),
      roleNFT,
      contractRole,
      nftVerified,
      nftError,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to load shelter profile.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const walletAddress = String(body.walletAddress ?? "").trim();
    requireWalletSession(request, walletAddress);
    const fullName = String(body.fullName ?? "").trim();
    const email = String(body.email ?? "").trim();
    const rawContactPhone = String(body.contactPhone ?? "").trim();
    const websiteUrl = String(body.websiteUrl ?? "").trim();
    const shelterAddress = String(body.shelterAddress ?? "").trim();
    const organizationDescription = String(
      body.organizationDescription ?? "",
    ).trim();
    const shelterImageUrl = String(body.shelterImageUrl ?? "").trim();

    if (!walletAddress) {
      return NextResponse.json(
        { message: "Wallet address is required." },
        { status: 400 },
      );
    }

    if (!fullName || !email || !rawContactPhone || !shelterAddress || !organizationDescription) {
      return NextResponse.json(
        { message: "Complete all required profile fields before saving." },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { message: "Enter a valid email address." },
        { status: 400 },
      );
    }

    const contactPhone = normalizeMalaysiaPhone(rawContactPhone);

    const shelter = await getShelterProfile(walletAddress);

    if (!shelter) {
      return NextResponse.json(
        { message: "No shelter account found for this wallet." },
        { status: 404 },
      );
    }

    const { supabase, profile } = shelter;
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        email,
      })
      .eq("id", profile.id);

    if (profileError) {
      throw profileError;
    }

    const { error: applicationError } = await supabase
      .from("shelter_applications")
      .update({
        contact_phone: contactPhone,
        website_url: websiteUrl || null,
        shelter_address: shelterAddress,
        organization_description: organizationDescription,
      })
      .eq("user_id", profile.id);

    if (applicationError) {
      throw applicationError;
    }

    const now = new Date().toISOString();
    const { data: existingShelterProfile, error: lookupError } = await supabase
      .from("shelter_profiles")
      .select("user_id")
      .eq("user_id", profile.id)
      .maybeSingle();

    if (lookupError) {
      if (isSchemaError(lookupError)) {
        return NextResponse.json(
          {
            message: `Unable to save shelter image in shelter_profiles. Supabase said: ${getErrorMessage(
              lookupError,
            )}`,
          },
          { status: 400 },
        );
      }

      throw lookupError;
    }

    const { error: shelterProfileError } = existingShelterProfile
      ? await supabase
          .from("shelter_profiles")
          .update({
            shelter_image_url: shelterImageUrl || null,
            updated_at: now,
          })
          .eq("user_id", profile.id)
      : await supabase.from("shelter_profiles").insert({
          user_id: profile.id,
          shelter_image_url: shelterImageUrl || null,
          created_at: now,
          updated_at: now,
        });

    if (shelterProfileError) {
      if (isSchemaError(shelterProfileError)) {
        return NextResponse.json(
          {
            message: `Unable to save shelter image in shelter_profiles. Supabase said: ${getErrorMessage(
              shelterProfileError,
            )}`,
          },
          { status: 400 },
        );
      }

      throw shelterProfileError;
    }

    return NextResponse.json({
      profile: {
        id: profile.id,
        role: profile.role,
        fullName,
        email,
        walletAddress: profile.wallet_address,
        shelterImageUrl: shelterImageUrl || null,
      },
      application: {
        contactPhone,
        websiteUrl: websiteUrl || null,
        shelterAddress,
        organizationDescription,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
