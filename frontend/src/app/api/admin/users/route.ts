import { NextRequest, NextResponse } from "next/server";
import { isAdminWallet } from "@/lib/admin-wallets";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.nextUrl.searchParams.get("walletAddress") ?? "";
    if (!(await isAdminWallet(walletAddress))) {
      return NextResponse.json({ message: "Access denied." }, { status: 403 });
    }

    const supabase = createAdminClient();
    const [profileResult, applicationResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, role, full_name, email, wallet_address, account_status, deactivation_reason, deactivated_at, deactivated_by, created_at, updated_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("shelter_applications")
        .select("user_id, shelter_name, registration_id, shelter_address, contact_phone, website_url, status, updated_at")
        .order("updated_at", { ascending: false }),
    ]);

    if (profileResult.error) throw profileResult.error;
    if (applicationResult.error) throw applicationResult.error;

    const applications = new Map<string, NonNullable<typeof applicationResult.data>[number]>();
    for (const application of applicationResult.data ?? []) {
      if (!applications.has(application.user_id)) {
        applications.set(application.user_id, application);
      }
    }

    return NextResponse.json({
      users: (profileResult.data ?? []).map((profile) => ({
        ...profile,
        shelter_application: applications.get(profile.id) ?? null,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to load users." },
      { status: 500 },
    );
  }
}
