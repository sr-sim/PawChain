import { NextRequest, NextResponse } from "next/server";
import { getWalletSession, WALLET_SESSION_COOKIE, walletCookieOptions } from "@/lib/wallet-session";

export async function GET(request: NextRequest) {
  const session = getWalletSession(request);
  return session ? NextResponse.json({ address: session.address }) : NextResponse.json({ message: "No wallet session." }, { status: 401 });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(WALLET_SESSION_COOKIE, "", { ...walletCookieOptions, maxAge: 0 });
  return response;
}
