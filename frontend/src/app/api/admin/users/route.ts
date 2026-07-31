import { NextRequest, NextResponse } from "next/server";
import { isAdminWallet } from "@/lib/admin-wallets";
import { getRoleBadgeSummary } from "@/lib/role-nft";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.nextUrl.searchParams.get("walletAddress") ?? "";
    if (!(await isAdminWallet(walletAddress))) {
      return NextResponse.json({ message: "Access denied." }, { status: 403 });
    }

    const supabase = createAdminClient();
    const profileResult = await supabase
      .from("profiles")
      .select("id, role, full_name, email, wallet_address, account_status, deactivation_reason, deactivated_at, deactivated_by, created_at, updated_at")
      .eq("role", "donor")
      .order("created_at", { ascending: false });

    if (profileResult.error) throw profileResult.error;

    const users = await Promise.all(
      (profileResult.data ?? []).map(async (profile) => {
        const roleBadge =
          profile.role === "donor" && profile.wallet_address
            ? await getRoleBadgeSummary(profile.wallet_address).catch(() => null)
            : null;

        return {
          ...profile,
          donor_badge_level: roleBadge?.donorLevel ?? null,
        };
      }),
    );

    return NextResponse.json({
      users,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to load users." },
      { status: 500 },
    );
  }
}
