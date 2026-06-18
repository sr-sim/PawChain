import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Role = "donor" | "shelter" | "admin";

function isRole(value: string): value is Role {
  return value === "donor" || value === "shelter" || value === "admin";
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  const role = String(body.role ?? "");
  const connectedWalletAddress = String(body.walletAddress ?? "").toLowerCase();

  try {
    if (!isRole(role)) {
      return NextResponse.json(
        { message: "Invalid role selected." },
        { status: 400 },
      );
    }

    if (!connectedWalletAddress) {
      return NextResponse.json(
        { message: "Wallet is not connected." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(body.email ?? ""),
      password: String(body.password ?? ""),
    });

    if (error) throw error;
    if (!data.user) throw new Error("Unable to sign in.");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, wallet_address")
      .eq("id", data.user.id)
      .single();

    if (profileError) throw profileError;

    if (profile.role !== role) {
      return NextResponse.json(
        { message: `This account is registered as ${profile.role}.` },
        { status: 403 },
      );
    }

    if (String(profile.wallet_address ?? "").toLowerCase() !== connectedWalletAddress) {
      return NextResponse.json(
        {
          message:
            "This account is linked to another wallet. Please connect the correct wallet for this account.",
        },
        { status: 403 },
      );
    }

    if (role === "shelter") {
      const { data: application, error: applicationError } = await supabase
        .from("shelter_applications")
        .select(
          "status, shelter_name, registration_id, contact_phone, website_url, shelter_address, organization_description, proof_document_path, created_at, reviewed_at, rejection_reason",
        )
        .eq("user_id", data.user.id)
        .single();

      if (applicationError) throw applicationError;

      if (application.status === "pending") {
        return NextResponse.json({
          status: "pending",
          message: "Shelter application is still pending admin verification.",
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
          },
        });
      }

      if (application.status === "rejected") {
        return NextResponse.json({
          status: "rejected",
          message:
            application.rejection_reason ||
            "Your shelter application was rejected.",
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
    }

    return NextResponse.json({
      status: "success",
      message: "Signed in successfully.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to sign in.",
      },
      { status: 500 },
    );
  }
}
