import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { createWalletSession, readWalletChallenge, WALLET_CHALLENGE_COOKIE, WALLET_SESSION_COOKIE, walletChallengeMessage, walletCookieOptions } from "@/lib/wallet-session";

export async function POST(request: NextRequest) {
  try {
    const signature = String((await request.json()).signature ?? "").trim();
    const challenge = readWalletChallenge(request);
    if (!challenge || !signature) return NextResponse.json({ message: "Wallet challenge is missing or expired." }, { status: 401 });
    const valid = await verifyMessage({ address: challenge.address as `0x${string}`, message: walletChallengeMessage(challenge), signature: signature as `0x${string}` });
    if (!valid) return NextResponse.json({ message: "Wallet signature is invalid." }, { status: 401 });
    const session = createWalletSession(challenge.address);
    const response = NextResponse.json({ address: challenge.address });
    response.cookies.set(WALLET_SESSION_COOKIE, session.token, { ...walletCookieOptions, maxAge: session.maxAge });
    response.cookies.set(WALLET_CHALLENGE_COOKIE, "", { ...walletCookieOptions, maxAge: 0 });
    return response;
  } catch {
    return NextResponse.json({ message: "Unable to verify wallet signature." }, { status: 401 });
  }
}
