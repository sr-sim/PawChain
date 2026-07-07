import { NextRequest, NextResponse } from "next/server";
import { isAdminWallet } from "@/lib/admin-wallets";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRoleNFTStatus, mintRoleNFT, revokeRoleNFT } from "@/lib/role-nft";

async function requireAdmin(walletAddress: string) {
  if (!(await isAdminWallet(walletAddress))) {
    throw new Response("Access denied.", { status: 403 });
  }
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .ilike("wallet_address", walletAddress)
    .maybeSingle();
  if (!profile) {
    throw new Response("The admin wallet needs a profiles row for audit logging.", { status: 409 });
  }
  return { supabase, adminId: profile.id };
}

function responseError(error: unknown) {
  if (error instanceof Response) {
    return NextResponse.json(
      { message: error.statusText || "Request failed." },
      { status: error.status },
    );
  }
  return NextResponse.json(
    { message: error instanceof Error ? error.message : "Request failed." },
    { status: 500 },
  );
}

export async function GET(request: NextRequest) {
  try {
    const adminWallet = request.nextUrl.searchParams.get("walletAddress") ?? "";
    const { supabase } = await requireAdmin(adminWallet);
    const { data: applications, error: applicationError } = await supabase
      .from("shelter_applications")
      .select("user_id, shelter_name, registration_id, contact_phone, website_url, shelter_address, organization_description, status, reviewed_at")
      .eq("status", "approved")
      .order("reviewed_at", { ascending: false });
    if (applicationError) throw applicationError;

    const userIds = (applications ?? []).map((item) => item.user_id);
    if (!userIds.length) return NextResponse.json({ shelters: [] });
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email, wallet_address, account_status, deactivation_reason, deactivated_at, deactivated_by, created_at, updated_at")
      .in("id", userIds);
    if (profileError) throw profileError;

    const applicationMap = new Map((applications ?? []).map((item) => [item.user_id, item]));
    const shelters = await Promise.all(
      (profiles ?? []).map(async (profile) => {
        const application = applicationMap.get(profile.id);
        let roleNFTActive = false;
        try {
          const status = profile.wallet_address
            ? await getRoleNFTStatus(profile.wallet_address)
            : null;
          roleNFTActive = Boolean(status?.hasNFT && status.dbRole === "shelter");
        } catch {
          roleNFTActive = false;
        }
        return { ...profile, ...application, profile_id: profile.id, role_nft_active: roleNFTActive };
      }),
    );
    return NextResponse.json({ shelters });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  let txHash: string | null = null;
  let blockchainConfirmed = false;
  try {
    const body = await request.json();
    const adminWallet = String(body.walletAddress ?? "").trim();
    const profileId = String(body.profileId ?? "").trim();
    const action = String(body.action ?? "");
    const reason = String(body.reason ?? "").trim();
    if (!profileId || !["deactivate", "reactivate"].includes(action)) {
      return NextResponse.json({ message: "Invalid account action." }, { status: 400 });
    }
    if (action === "deactivate" && !reason) {
      return NextResponse.json({ message: "A deactivation reason is required." }, { status: 400 });
    }

    const { supabase, adminId } = await requireAdmin(adminWallet);
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, role, wallet_address, account_status")
      .eq("id", profileId)
      .single();
    if (error) throw error;
    if (profile.role !== "shelter") return NextResponse.json({ message: "Profile is not a shelter." }, { status: 400 });
    if (!profile.wallet_address) return NextResponse.json({ message: "Shelter wallet address is missing." }, { status: 400 });

    const { data: application } = await supabase
      .from("shelter_applications")
      .select("status")
      .eq("user_id", profile.id)
      .maybeSingle();
    if (application?.status !== "approved") return NextResponse.json({ message: "Only approved shelters can be managed." }, { status: 409 });

    const nftStatus = await getRoleNFTStatus(profile.wallet_address);
    if (action === "deactivate") {
      if (profile.account_status === "deactivated" && !nftStatus.hasNFT) {
        return NextResponse.json({ message: "Shelter is already deactivated." }, { status: 409 });
      }
      if (nftStatus.hasNFT) {
        const result = await revokeRoleNFT(profile.wallet_address);
        txHash = result.txHash;
      }
      blockchainConfirmed = true;
      const now = new Date().toISOString();
      const { error: updateError } = await supabase.from("profiles").update({
        account_status: "deactivated",
        deactivation_reason: reason,
        deactivated_at: now,
        deactivated_by: adminId,
        updated_at: now,
      }).eq("id", profile.id);
      if (updateError) throw updateError;
      return NextResponse.json({ status: "deactivated", txHash, blockchainConfirmed });
    }

    if (profile.account_status === "active" && nftStatus.hasNFT) {
      return NextResponse.json({ message: "Shelter is already active." }, { status: 409 });
    }
    if (!nftStatus.hasNFT) {
      const result = await mintRoleNFT(profile.wallet_address, "shelter");
      txHash = result.txHash;
    } else if (nftStatus.dbRole !== "shelter") {
      return NextResponse.json({ message: "Wallet owns a different RoleNFT." }, { status: 409 });
    }
    blockchainConfirmed = true;
    const { error: updateError } = await supabase.from("profiles").update({
      account_status: "active",
      deactivation_reason: null,
      deactivated_at: null,
      deactivated_by: null,
      updated_at: new Date().toISOString(),
    }).eq("id", profile.id);
    if (updateError) throw updateError;
    return NextResponse.json({ status: "active", txHash, blockchainConfirmed });
  } catch (error) {
    if (blockchainConfirmed) {
      return NextResponse.json({
        message: "Blockchain transaction confirmed, but the database update failed. Retry this action to reconcile.",
        blockchainConfirmed: true,
        txHash,
      }, { status: 500 });
    }
    return responseError(error);
  }
}
