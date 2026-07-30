"use client";

import { useEffect, useState } from "react";
import {
  getWalletStyle,
  saveWalletStyle,
  WalletStylePicker,
  type WalletStyleId,
} from "@/app/components/wallet/WalletStyle";

export function DonorWalletAppearance({
  walletAddress,
}: {
  walletAddress?: string;
}) {
  const [walletStyle, setWalletStyle] = useState<WalletStyleId>("classic");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setWalletStyle(getWalletStyle(walletAddress));
  }, [walletAddress]);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(() => setMessage(""), 2400);
    return () => window.clearTimeout(timer);
  }, [message]);

  function customizeWallet(style: WalletStyleId) {
    setWalletStyle(style);
    saveWalletStyle(walletAddress, style);
    setMessage("Wallet appearance updated.");
  }

  return (
    <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">
        Wallet appearance
      </p>
      <h2 className="mt-1 text-xl font-black text-stone-950">
        Choose your wallet style
      </h2>
      <p className="mt-2 text-sm font-bold leading-6 text-stone-600">
        Your selection updates wallet buttons across PawChain on this device.
      </p>
      <div className="mt-5">
        <WalletStylePicker
          address={walletAddress}
          value={walletStyle}
          onChange={customizeWallet}
        />
      </div>
      {message ? (
        <p className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {message}
        </p>
      ) : null}
    </section>
  );
}
