import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  removeShelterDocument,
  uploadShelterDocument,
} from "@/lib/shelter-document-storage";
import { normalizeMalaysiaPhone } from "@/lib/malaysia-phone";

function readText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
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

  const existingProofDocumentPath =
    readText(formData, "existingProofDocumentPath") || null;
  const proofDocument = formData.get("proofDocument");
  const hasNewDocument =
    proofDocument instanceof File && proofDocument.name && proofDocument.size > 0;
  const proofDocumentPath = hasNewDocument
    ? await uploadShelterDocument(supabase, profile.id, proofDocument)
    : existingProofDocumentPath;

  if (!proofDocumentPath) {
    return NextResponse.json(
      { message: "A shelter registration document is required." },
      { status: 400 },
    );
  }

  const contactPhone = normalizeMalaysiaPhone(
    readText(formData, "contactPhone"),
  );
  const { data: application, error } = await supabase
    .from("shelter_applications")
    .update({
      shelter_name: readText(formData, "shelterName"),
      registration_id: readText(formData, "registrationId"),
      contact_phone: contactPhone,
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
    if (hasNewDocument) {
      await removeShelterDocument(supabase, proofDocumentPath).catch(() => {});
    }
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  if (
    hasNewDocument &&
    existingProofDocumentPath &&
    existingProofDocumentPath !== proofDocumentPath
  ) {
    await removeShelterDocument(
      supabase,
      existingProofDocumentPath,
    ).catch(() => {});
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
