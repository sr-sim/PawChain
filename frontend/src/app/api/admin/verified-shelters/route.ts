import { NextRequest, NextResponse } from "next/server";
import {
  createPublicClient,
  decodeFunctionData,
  http,
  type Hash,
} from "viem";
import { isAdminWallet } from "@/lib/admin-wallets";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRoleNFTConfig, getRoleNFTStatus } from "@/lib/role-nft";
import { roleNFTAbi } from "@/lib/role-nft-abi";
import { walletSessionMatches } from "@/lib/wallet-session";

class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function requireAdminAccess(request: NextRequest, walletAddress: string) {
  if (!walletSessionMatches(request, walletAddress)) {
    throw new HttpError("Wallet authentication is required.", 401);
  }
  if (!(await isAdminWallet(walletAddress))) {
    throw new HttpError("Access denied.", 403);
  }
  return createAdminClient();
}

async function requireAdminAuditProfile(request: NextRequest, walletAddress: string) {
  const supabase = await requireAdminAccess(request, walletAddress);
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .ilike("wallet_address", walletAddress)
    .maybeSingle();
  return { supabase, adminId: profile?.id ?? null };
}

function responseError(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json(
      { message: error.message },
      { status: error.status },
    );
  }
  return NextResponse.json(
    { message: error instanceof Error ? error.message : "Request failed." },
    { status: 500 },
  );
}

async function verifyRoleNFTTransaction({
  adminWallet,
  shelterWallet,
  txHash,
  functionName,
}: {
  adminWallet: string;
  shelterWallet: string;
  txHash: string;
  functionName: "safeMintShelter" | "revokeRoleNFT";
}) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    throw new HttpError("A valid RoleNFT transaction hash is required.", 400);
  }
  const config = getRoleNFTConfig();
  const publicClient = createPublicClient({
    chain: config.chain,
    transport: http(config.rpcUrl),
  });
  const [receipt, transaction] = await Promise.all([
    publicClient.getTransactionReceipt({ hash: txHash as Hash }),
    publicClient.getTransaction({ hash: txHash as Hash }),
  ]);
  if (
    receipt.status !== "success" ||
    receipt.from.toLowerCase() !== adminWallet.toLowerCase() ||
    receipt.to?.toLowerCase() !== config.address.toLowerCase() ||
    transaction.to?.toLowerCase() !== config.address.toLowerCase()
  ) {
    throw new HttpError(
      "The RoleNFT transaction does not match this account action.",
      409,
    );
  }
  try {
    const decoded = decodeFunctionData({
      abi: roleNFTAbi,
      data: transaction.input,
    });
    if (
      decoded.functionName !== functionName ||
      String(decoded.args[0]).toLowerCase() !== shelterWallet.toLowerCase()
    ) {
      throw new Error("RoleNFT action mismatch.");
    }
  } catch {
    throw new HttpError("Unable to verify the RoleNFT transaction.", 409);
  }
}

export async function GET(request: NextRequest) {
  try {
    const adminWallet = request.nextUrl.searchParams.get("walletAddress") ?? "";
    const supabase = await requireAdminAccess(request, adminWallet);
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
    const { data: activeCampaigns, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, shelter_id, title, contract_address")
      .in("shelter_id", userIds)
      .eq("campaign_status", "active")
      .order("created_at", { ascending: true });
    if (campaignError) throw campaignError;

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
        return {
          ...profile,
          ...application,
          profile_id: profile.id,
          role_nft_active: roleNFTActive,
          active_campaigns: (activeCampaigns ?? []).filter(
            (campaign) => campaign.shelter_id === profile.id,
          ),
        };
      }),
    );
    return NextResponse.json({ shelters });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const adminWallet = String(body.walletAddress ?? "").trim();
    const profileId = String(body.profileId ?? "").trim();
    const action = String(body.action ?? "");
    const reason = String(body.reason ?? "").trim();
    const txHash = String(body.txHash ?? "").trim();
    if (!profileId || !["deactivate", "reactivate"].includes(action)) {
      return NextResponse.json({ message: "Invalid account action." }, { status: 400 });
    }
    const { supabase, adminId } =
      await requireAdminAuditProfile(request, adminWallet);
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
      if (profile.account_status !== "deactivated" && !reason) {
        return NextResponse.json({ message: "A deactivation reason is required." }, { status: 400 });
      }
      const { data: activeCampaigns, error: campaignError } = await supabase
        .from("campaigns")
        .select("id, title, contract_address")
        .eq("shelter_id", profile.id)
        .eq("campaign_status", "active")
        .order("created_at", { ascending: true });
      if (campaignError) throw campaignError;

      const now = new Date().toISOString();
      const { error: pendingCampaignError } = await supabase
        .from("campaigns")
        .update({
          campaign_status: "rejected",
          rejection_reason: "Shelter account deactivated by administrator.",
          updated_at: now,
        })
        .eq("shelter_id", profile.id)
        .eq("campaign_status", "pending_approval");
      if (pendingCampaignError) throw pendingCampaignError;

      if ((activeCampaigns ?? []).length > 0) {
        const { error: blockError } = await supabase
          .from("profiles")
          .update({
            account_status: "deactivated",
            ...(reason ? { deactivation_reason: reason } : {}),
            deactivated_at: now,
            deactivated_by: adminId,
            updated_at: now,
          })
          .eq("id", profile.id);
        if (blockError) throw blockError;

        return NextResponse.json({
          status: "deactivation_pending",
          message:
            "Shelter access is blocked. All active campaigns must now be cancelled.",
          campaigns: activeCampaigns,
        });
      }

      if (nftStatus.hasNFT) {
        if (!txHash) {
          return NextResponse.json({
            status: "role_nft_revocation_required",
            shelterWallet: profile.wallet_address,
          });
        }
        await verifyRoleNFTTransaction({
          adminWallet,
          shelterWallet: profile.wallet_address,
          txHash,
          functionName: "revokeRoleNFT",
        });
        const updatedNftStatus = await getRoleNFTStatus(profile.wallet_address);
        if (updatedNftStatus.hasNFT) {
          throw new HttpError(
            "The Shelter RoleNFT is still active after the submitted transaction.",
            409,
          );
        }
      }
      const { error: updateError } = await supabase.from("profiles").update({
        account_status: "deactivated",
        ...(reason ? { deactivation_reason: reason } : {}),
        deactivated_at: now,
        deactivated_by: adminId,
        updated_at: now,
      }).eq("id", profile.id);
      if (updateError) throw updateError;
      return NextResponse.json({
        status: "deactivated",
        txHash: txHash || null,
        blockchainConfirmed: true,
      });
    }

    if (profile.account_status === "active" && nftStatus.hasNFT) {
      return NextResponse.json({ message: "Shelter is already active." }, { status: 409 });
    }
    if (!nftStatus.hasNFT) {
      if (!txHash) {
        return NextResponse.json({
          status: "role_nft_mint_required",
          shelterWallet: profile.wallet_address,
        });
      }
      await verifyRoleNFTTransaction({
        adminWallet,
        shelterWallet: profile.wallet_address,
        txHash,
        functionName: "safeMintShelter",
      });
      const updatedNftStatus = await getRoleNFTStatus(profile.wallet_address);
      if (!updatedNftStatus.hasNFT || updatedNftStatus.dbRole !== "shelter") {
        throw new HttpError(
          "The submitted transaction did not activate a Shelter RoleNFT.",
          409,
        );
      }
    } else if (nftStatus.dbRole !== "shelter") {
      return NextResponse.json({ message: "Wallet owns a different RoleNFT." }, { status: 409 });
    }
    const { error: updateError } = await supabase.from("profiles").update({
      account_status: "active",
      deactivation_reason: null,
      deactivated_at: null,
      deactivated_by: null,
      updated_at: new Date().toISOString(),
    }).eq("id", profile.id);
    if (updateError) throw updateError;
    return NextResponse.json({
      status: "active",
      txHash: txHash || null,
      blockchainConfirmed: true,
    });
  } catch (error) {
    return responseError(error);
  }
}
