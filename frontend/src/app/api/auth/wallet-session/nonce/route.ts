import { NextRequest, NextResponse } from "next/server";
import { createWalletChallenge, WALLET_CHALLENGE_COOKIE, walletCookieOptions } from "@/lib/wallet-session";

export async function POST(request: NextRequest) {
  try {
    const address = String((await request.json()).address ?? "").trim();
    const challenge = createWalletChallenge(address);
    const response = NextResponse.json({ message: challenge.message });
    response.cookies.set(WALLET_CHALLENGE_COOKIE, challenge.token, { ...walletCookieOptions, maxAge: challenge.maxAge });
    return response;
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to create wallet challenge." }, { status: 400 });
  }
}
