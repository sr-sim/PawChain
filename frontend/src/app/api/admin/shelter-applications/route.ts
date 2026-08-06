import { NextRequest, NextResponse } from "next/server";
import {
  createPublicClient,
  decodeFunctionData,
  http,
  isAddress,
  type Hash,
} from "viem";
import { isAdminWallet } from "@/lib/admin-wallets";
import { walletSessionMatches } from "@/lib/wallet-session";
import { getRoleNFTConfig, getRoleNFTStatus } from "@/lib/role-nft";
import { roleNFTAbi } from "@/lib/role-nft-abi";
import { createAdminClient } from "@/lib/supabase/admin";
import { createShelterDocumentUrl } from "@/lib/shelter-document-storage";

function readAdminWallet(request: NextRequest) {
  return request.nextUrl.searchParams.get("walletAddress");
}

export async function GET(request: NextRequest) {
  const adminWallet = readAdminWallet(request);

  if (!walletSessionMatches(request, adminWallet)) {
    return NextResponse.json({ message: "Wallet authentication is required." }, { status: 401 });
  }
  if (!(await isAdminWallet(adminWallet))) {
    return NextResponse.json(
      { message: "Access denied. This wallet is not an admin." },
      { status: 403 },
    );
  }

  const supabase = createAdminClient();
  const { data: applications, error } = await supabase
    .from("shelter_applications")
    .select(
      "id, user_id, shelter_name, registration_id, contact_phone, website_url, shelter_address, organization_description, proof_document_path, status, reviewed_by, reviewed_at, rejection_reason, created_at, updated_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const userIds = [...new Set((applications ?? []).map((item) => item.user_id))];
  const { data: profiles, error: profilesError } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email, wallet_address, account_status")
        .in("id", userIds)
    : { data: [], error: null };

  if (profilesError) {
    return NextResponse.json({ message: profilesError.message }, { status: 500 });
  }

  const profilesById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile]),
  );
  const applicationsWithDocumentUrls = await Promise.all(
    (applications ?? []).map(async (application) => {
      const profile = profilesById.get(application.user_id);
      return {
        ...application,
        applicant_name: profile?.full_name ?? null,
        applicant_email: profile?.email ?? null,
        applicant_wallet: profile?.wallet_address ?? null,
        account_status: profile?.account_status ?? null,
        proof_document_url: application.proof_document_path
          ? await createShelterDocumentUrl(
              supabase,
              application.proof_document_path,
            )
          : null,
      };
    }),
  );

  return NextResponse.json({ applications: applicationsWithDocumentUrls });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const adminWallet = String(body.walletAddress ?? "");
  const applicationId = String(body.applicationId ?? "");
  const action = String(body.action ?? "");
  const rejectionReason = String(body.rejectionReason ?? "").trim();
  const txHash = String(body.txHash ?? "").trim();

  if (!walletSessionMatches(request, adminWallet)) {
    return NextResponse.json({ message: "Wallet authentication is required." }, { status: 401 });
  }
  if (!(await isAdminWallet(adminWallet))) {
    return NextResponse.json(
      { message: "Access denied. This wallet is not an admin." },
      { status: 403 },
    );
  }

  if (!applicationId || (action !== "approve" && action !== "reject")) {
    return NextResponse.json(
      { message: "Invalid admin action." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("wallet_address", adminWallet.toLowerCase())
    .maybeSingle();

  const { data: currentApplication, error: currentApplicationError } =
    await supabase
      .from("shelter_applications")
      .select("id, user_id, status")
      .eq("id", applicationId)
      .single();

  if (currentApplicationError) {
    return NextResponse.json(
      { message: currentApplicationError.message },
      { status: 500 },
    );
  }

  if (currentApplication.status !== "pending") {
    return NextResponse.json(
      { message: "Only pending applications can be reviewed." },
      { status: 409 },
    );
  }

  if (action === "approve") {
    const { data: shelterProfile, error: profileError } = await supabase
      .from("profiles")
      .select("wallet_address")
      .eq("id", currentApplication.user_id)
      .eq("role", "shelter")
      .single();

    if (profileError) {
      return NextResponse.json({ message: profileError.message }, { status: 500 });
    }

    if (!shelterProfile?.wallet_address) {
      return NextResponse.json(
        { message: "Shelter wallet address is missing." },
        { status: 400 },
      );
    }

    if (!isAddress(shelterProfile.wallet_address)) {
      return NextResponse.json(
        { message: "Shelter wallet address is invalid." },
        { status: 400 },
      );
    }

    if (txHash) {
      if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
        return NextResponse.json(
          { message: "A valid RoleNFT transaction hash is required." },
          { status: 400 },
        );
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
        return NextResponse.json(
          { message: "The RoleNFT transaction does not match this approval." },
          { status: 409 },
        );
      }
      try {
        const decoded = decodeFunctionData({
          abi: roleNFTAbi,
          data: transaction.input,
        });
        if (
          decoded.functionName !== "safeMintShelter" ||
          String(decoded.args[0]).toLowerCase() !==
            shelterProfile.wallet_address.toLowerCase()
        ) {
          return NextResponse.json(
            { message: "The transaction did not mint this shelter's RoleNFT." },
            { status: 409 },
          );
        }
      } catch {
        return NextResponse.json(
          { message: "Unable to verify the RoleNFT mint transaction." },
          { status: 409 },
        );
      }
    }

    const roleStatus = await getRoleNFTStatus(shelterProfile.wallet_address);
    if (!roleStatus.hasNFT) {
      return NextResponse.json(
        {
          message:
            "Mint the Shelter RoleNFT with the connected admin wallet before approval.",
        },
        { status: 409 },
      );
    }
    if (roleStatus.dbRole !== "shelter") {
      return NextResponse.json(
        { message: "This wallet already has a different RoleNFT." },
        { status: 409 },
      );
    }

    const { error } = await supabase
      .from("shelter_applications")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminProfile?.id ?? null,
        rejection_reason: null,
      })
      .eq("id", applicationId);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({
      status: "approved",
      txHash: txHash || null,
    });
  }

  if (!rejectionReason) {
    return NextResponse.json(
      { message: "A rejection reason is required." },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("shelter_applications")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminProfile?.id ?? null,
      rejection_reason: rejectionReason,
    })
    .eq("id", applicationId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "rejected" });
}
