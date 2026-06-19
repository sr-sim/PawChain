import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { message: "Please login first." },
      { status: 401 },
    );
  }

  const { data: application, error } = await supabase
    .from("shelter_applications")
    .select(
      "status, shelter_name, registration_id, contact_phone, website_url, shelter_address, organization_description, proof_document_path, created_at, reviewed_at, rejection_reason",
    )
    .eq("user_id", user.id)
    .single();

  if (error) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    status: application.status,
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
