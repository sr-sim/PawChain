"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAccount, useSignMessage } from "wagmi";

async function readJsonResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function getApiMessage(response: Response, fallback: string) {
  const data = await readJsonResponse(response);
  const message = data && typeof data.message === "string" ? data.message : "";

  return message || fallback;
}

export function WalletSessionGuard({ children }: { children: ReactNode }) {
  // Signing is performed by Wagmi, so use its account state as the source of
  // truth. AppKit can report a restored session slightly before Wagmi has an
  // active connector, which makes signMessageAsync fail without opening the
  // wallet.
  const { address, status } = useAccount();
  const isConnected = status === "connected";
  const { signMessageAsync } = useSignMessage();
  const router = useRouter();
  const pathname = usePathname();
  const inFlight = useRef<string | null>(null);
  const redirecting = useRef(false);
  const redirectTarget = useRef<string | null>(null);
  const [authenticatedAddress, setAuthenticatedAddress] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<"signing" | "finding">("signing");

  useEffect(() => {
    if (
      redirecting.current &&
      redirectTarget.current &&
      pathname === redirectTarget.current &&
      address
    ) {
      redirecting.current = false;
      redirectTarget.current = null;
      inFlight.current = null;
      setAuthenticatedAddress(address.toLowerCase());
    }
  }, [address, pathname]);

  useEffect(() => {
    if (!isConnected || !address || authenticatedAddress === address.toLowerCase() || inFlight.current === address.toLowerCase()) return;
    inFlight.current = address.toLowerCase();
    setFailed(false);
    setErrorMessage("");
    setPhase("signing");

    const authenticate = async () => {
      try {
        const current = await fetch("/api/auth/wallet-session", { cache: "no-store" });
        if (current.ok) {
          const session = await readJsonResponse(current);
          if (String(session?.address ?? "").toLowerCase() === address.toLowerCase()) {
            setAuthenticatedAddress(address.toLowerCase());
            return;
          }
        }
        const nonceResponse = await fetch("/api/auth/wallet-session/nonce", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address }),
        });
        const nonce = await readJsonResponse(nonceResponse);
        if (!nonceResponse.ok) {
          throw new Error(
            typeof nonce?.message === "string"
              ? nonce.message
              : "Unable to start wallet authentication.",
          );
        }
        if (!nonce || typeof nonce.message !== "string") {
          throw new Error("Unable to start wallet authentication.");
        }
        const signature = await signMessageAsync({ message: nonce.message });
        const verifyResponse = await fetch("/api/auth/wallet-session/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signature }),
        });
        if (!verifyResponse.ok) {
          throw new Error(
            await getApiMessage(verifyResponse, "Wallet authentication failed."),
          );
        }
        setPhase("finding");

        const adminResponse = await fetch(
          `/api/auth/admin-status?walletAddress=${encodeURIComponent(address)}`,
          { cache: "no-store" },
        );
        if (adminResponse.ok) {
          const admin = await readJsonResponse(adminResponse);
          if (admin?.isAdmin) {
            redirecting.current = true;
            redirectTarget.current = "/Admin/dashboard";
            router.replace("/Admin/dashboard");
            return;
          }
        }

        const profileResponse = await fetch(
          `/api/auth/wallet-profile?walletAddress=${encodeURIComponent(address)}`,
          { cache: "no-store" },
        );
        if (profileResponse.ok) {
          const result = await readJsonResponse(profileResponse);
          const profile = result?.profile as
            | { role?: string; directDashboard?: boolean }
            | null;

          if (profile?.directDashboard) {
            const role =
              profile.role === "shelter"
                ? "Shelter"
                : profile.role === "donor"
                  ? "Donor"
                  : null;
            if (role) {
              redirecting.current = true;
              redirectTarget.current = `/${role}/dashboard`;
              router.replace(
                `/${role}/dashboard?walletAddress=${encodeURIComponent(address)}`,
              );
              return;
            }
          }
        }

        setAuthenticatedAddress(address.toLowerCase());
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "The wallet could not start the signature request.";
        setErrorMessage(
          /rejected|denied|cancelled|canceled/i.test(message)
            ? "The signature request was cancelled. Please approve it in your wallet to continue."
            : message,
        );
        setFailed(true);
      } finally {
        if (!redirecting.current) inFlight.current = null;
      }
    };

    void authenticate();
  }, [address, attempt, authenticatedAddress, isConnected, router, signMessageAsync]);

  if (!isConnected || !address || authenticatedAddress === address.toLowerCase()) return children;

  return (
    <div className="fixed inset-0 z-[10000] grid place-items-center bg-[var(--color-cream)] px-4">
      <div className="w-full max-w-md rounded-3xl border border-orange-100 bg-white p-7 text-center shadow-2xl">
        <img src="/images/logo.png" alt="PawChain" className="mx-auto h-16 w-16 object-contain" />
        <h1 className="mt-4 text-2xl font-black text-stone-950">
          {phase === "finding" ? "Finding your account" : "Verify wallet ownership"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          {phase === "finding"
            ? "Checking your PawChain role and preparing your dashboard."
            : "Sign the PawChain login message in your wallet. It is free and does not create a blockchain transaction."}
        </p>
        {failed ? (
          <>
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {errorMessage || "The wallet could not start the signature request."}
            </p>
            <button type="button" onClick={() => { inFlight.current = null; setAttempt((value) => value + 1); }} className="mt-5 rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-white hover:bg-orange-600">Try signing again</button>
          </>
        ) : (
          <div className="mx-auto mt-5 flex w-fit items-center gap-2 text-sm font-bold text-orange-600">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-orange-200 border-t-orange-600" aria-hidden="true" />
            <span>{phase === "finding" ? "Finding account..." : "Waiting for wallet signature..."}</span>
          </div>
        )}
      </div>
    </div>
  );
}
