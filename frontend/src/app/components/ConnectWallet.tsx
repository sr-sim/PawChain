"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useAppKit,
  useAppKitAccount,
  useDisconnect,
} from "@reown/appkit/react";
import { supabase } from "@/lib/supabase-client";

type ConnectWalletProps = {
  variant?: "dark" | "outline";
};

function formatAddress(address?: string) {
  if (!address) {
    return "Connect Wallet";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function ConnectWallet({ variant = "dark" }: ConnectWalletProps) {
  const router = useRouter();
  const { open } = useAppKit();
  const { disconnect } = useDisconnect();
  const { address, isConnected } = useAppKitAccount();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (!isConnected) {
      setIsMenuOpen(false);
    }
  }, [isConnected]);

  const className =
    variant === "outline"
      ? "rounded-full border border-orange-200 bg-white/75 px-6 py-3 text-center text-sm font-black text-stone-900 shadow-lg shadow-orange-100 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-orange)] hover:shadow-xl hover:shadow-orange-200/70"
      : "rounded-full bg-stone-950 px-3 py-2 text-xs font-black text-white shadow-lg shadow-orange-200/70 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-orange)] hover:shadow-xl hover:shadow-orange-300/70 sm:px-4 sm:py-2.5 sm:text-sm";

  const handleClick = () => {
    if (isConnected) {
      setIsMenuOpen((current) => !current);
      return;
    }

    open();
  };

  const handleDisconnect = async () => {
    setIsMenuOpen(false);
    setIsDisconnecting(true);

    try {
      await supabase.auth.signOut();
      await disconnect();
      router.replace("/");
    } finally {
      setTimeout(() => {
        setIsDisconnecting(false);
      }, 700);
    }
  };

  return (
    <>
      <div ref={menuRef} className="relative inline-flex">
        <button
          type="button"
          className={className}
          onClick={handleClick}
          disabled={isDisconnecting}
        >
          {isConnected ? formatAddress(address) : "Connect Wallet"}
        </button>

        {isConnected && isMenuOpen && (
          <div className="absolute right-0 top-full z-[120] mt-2 w-48 rounded-2xl border border-orange-100 bg-white/95 p-2 shadow-[0_18px_50px_rgba(120,72,16,0.18)] backdrop-blur-xl">
            <p className="px-3 py-2 text-xs font-bold text-stone-500">
              {formatAddress(address)}
            </p>
            <button
              type="button"
              onClick={handleDisconnect}
              className="w-full rounded-xl px-3 py-2 text-left text-sm font-black text-red-600 transition hover:bg-red-50"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {isDisconnecting && (
        <div className="fixed inset-0 z-[200] grid place-items-center bg-[var(--color-cream)]/95 px-6 text-center text-stone-950 backdrop-blur-xl">
          <div>
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-orange-100 border-t-[var(--color-orange)]" />
            <p className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-[var(--color-orange)]">
              Disconnecting wallet
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              Returning to PawChain
            </h1>
          </div>
        </div>
      )}
    </>
  );
}
