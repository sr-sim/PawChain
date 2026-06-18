import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function readText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const formData = await request.formData();
  const walletAddress = readText(formData, "walletAddress");

  if (!walletAddress) {
    return NextResponse.json(
      { message: "Wallet is not connected." },
      { status: 400 },
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
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

  const proofDocument = formData.get("proofDocument");
  const proofDocumentPath =
    proofDocument instanceof File && proofDocument.name
      ? proofDocument.name
      : readText(formData, "existingProofDocumentPath") || null;

  const { data: application, error } = await supabase
    .from("shelter_applications")
    .update({
      shelter_name: readText(formData, "shelterName"),
      registration_id: readText(formData, "registrationId"),
      contact_phone: readText(formData, "contactPhone"),
      website_url: readText(formData, "websiteUrl") || null,
      shelter_address: readText(formData, "shelterAddress"),
      organization_description: readText(formData, "organizationDescription"),
      proof_document_path: proofDocumentPath,
      status: "pending",
      reviewed_at: null,
      rejection_reason: null,
    })
    .eq("user_id", profile.id)
    .eq("status", "rejected")
    .select(
      "status, shelter_name, registration_id, contact_phone, website_url, shelter_address, organization_description, proof_document_path, created_at",
    )
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    status: "pending",
    message: "Shelter application resubmitted for admin review.",
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
