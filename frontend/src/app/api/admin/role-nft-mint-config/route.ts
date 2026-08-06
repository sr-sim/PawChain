import { NextRequest, NextResponse } from "next/server";
import { isAdminWallet } from "@/lib/admin-wallets";
import { walletSessionMatches } from "@/lib/wallet-session";
import { getRoleNFTConfig } from "@/lib/role-nft";

export async function GET(request: NextRequest) {
  const walletAddress =
    request.nextUrl.searchParams.get("walletAddress") ?? "";

  if (!walletSessionMatches(request, walletAddress)) {
    return NextResponse.json({ message: "Wallet authentication is required." }, { status: 401 });
  }
  if (!(await isAdminWallet(walletAddress))) {
    return NextResponse.json({ message: "Access denied." }, { status: 403 });
  }

  const config = getRoleNFTConfig();
  const metadataCID = process.env.SHELTER_METADATA_CID?.trim();
  if (!metadataCID) {
    return NextResponse.json(
      { message: "SHELTER_METADATA_CID is not configured." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    contractAddress: config.address,
    chainId: config.chain.id,
    metadataCID,
  });
}
