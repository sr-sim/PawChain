import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { isAddress } from "viem";

export const WALLET_SESSION_COOKIE = "pawchain_wallet_session";
export const WALLET_CHALLENGE_COOKIE = "pawchain_wallet_challenge";
const SESSION_TTL_SECONDS = 60 * 60 * 24;
const CHALLENGE_TTL_SECONDS = 60 * 5;

type WalletToken = { address: string; exp: number; nonce?: string };

function secret() {
  const value = process.env.WALLET_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value || value.length < 32) throw new Error("WALLET_SESSION_SECRET is not configured securely.");
  return value;
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function signToken(token: WalletToken) {
  const payload = encode(JSON.stringify(token));
  return `${payload}.${signature(payload)}`;
}

function readToken(value?: string): WalletToken | null {
  if (!value) return null;
  const [payload, suppliedSignature] = value.split(".");
  if (!payload || !suppliedSignature) return null;
  const expected = Buffer.from(signature(payload));
  const supplied = Buffer.from(suppliedSignature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    const token = JSON.parse(decode(payload)) as WalletToken;
    if (!isAddress(token.address) || token.exp <= Date.now()) return null;
    return { ...token, address: token.address.toLowerCase() };
  } catch {
    return null;
  }
}

export function createWalletChallenge(address: string) {
  if (!isAddress(address)) throw new Error("A valid wallet address is required.");
  const token: WalletToken = {
    address: address.toLowerCase(),
    nonce: randomBytes(24).toString("hex"),
    exp: Date.now() + CHALLENGE_TTL_SECONDS * 1000,
  };
  return { token: signToken(token), message: walletChallengeMessage(token), maxAge: CHALLENGE_TTL_SECONDS };
}

export function walletChallengeMessage(token: WalletToken) {
  return [
    "PawChain wallet authentication",
    "",
    `Wallet: ${token.address}`,
    `Nonce: ${token.nonce}`,
    `Expires: ${new Date(token.exp).toISOString()}`,
    "",
    "Sign this message to prove wallet ownership. This does not create a blockchain transaction or cost gas.",
  ].join("\n");
}

export function readWalletChallenge(request: NextRequest) {
  const token = readToken(request.cookies.get(WALLET_CHALLENGE_COOKIE)?.value);
  return token?.nonce ? token : null;
}

export function createWalletSession(address: string) {
  return {
    token: signToken({ address: address.toLowerCase(), exp: Date.now() + SESSION_TTL_SECONDS * 1000 }),
    maxAge: SESSION_TTL_SECONDS,
  };
}

export function getWalletSession(request: NextRequest) {
  return readToken(request.cookies.get(WALLET_SESSION_COOKIE)?.value);
}

export function walletSessionMatches(request: NextRequest, claimedAddress?: string | null) {
  const session = getWalletSession(request);
  return Boolean(session && claimedAddress && session.address === claimedAddress.toLowerCase());
}

export function requireWalletSession(request: NextRequest, claimedAddress?: string | null) {
  const session = getWalletSession(request);
  if (!session) throw new Error("WALLET_SESSION_REQUIRED");
  if (claimedAddress && session.address !== claimedAddress.toLowerCase()) {
    throw new Error("WALLET_SESSION_MISMATCH");
  }
  return session;
}

export const walletCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};
