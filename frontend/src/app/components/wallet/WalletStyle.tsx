"use client";

import { useEffect, useState, type CSSProperties } from "react";

export const walletStyles = [
  { id: "classic", name: "Classic Paw", image: "/images/wallet/classic-paw.png", colors: ["#fffaf4", "#ff8a1f", "#4b2410"] },
  { id: "corgi", name: "Corgi", image: "/images/wallet/corgi.png", colors: ["#fff8ef", "#ddb98e", "#4b2410"] },
  { id: "cat", name: "Sunny Cat", image: "/images/wallet/sunny-cat.png", colors: ["#fff3bd", "#ffad24", "#4b2410"] },
  { id: "forest", name: "Forest Paw", image: "/images/wallet/forest-paw.png", colors: ["#eefbdd", "#91c95d", "#27551c"] },
  { id: "lavender", name: "Lavender Paw", image: "/images/wallet/lavender-paw.png", colors: ["#f5edff", "#ba91ff", "#342267"] },
  { id: "bunny", name: "Rose Bunny", image: "/images/wallet/rose-bunny.png", colors: ["#fff0f4", "#ffafc1", "#7d2636"] },
  { id: "hamster", name: "Hamster", image: "/images/wallet/hamster.png", colors: ["#eef7ff", "#83b7e8", "#17477f"] },
] as const;

export type WalletStyleId = (typeof walletStyles)[number]["id"];

const defaultStyle: WalletStyleId = "classic";
const styleEvent = "pawchain-wallet-style-change";

type WalletStyleChangeDetail = {
  address?: string;
  style: WalletStyleId;
};

function storageKey(address?: string) {
  return `pawchain:wallet-style:${address?.toLowerCase() || "default"}`;
}

function isWalletStyle(value: string | null): value is WalletStyleId {
  return walletStyles.some((style) => style.id === value);
}

export function getWalletStyle(address?: string): WalletStyleId {
  if (typeof window === "undefined") return defaultStyle;
  const saved = window.localStorage.getItem(storageKey(address));
  return isWalletStyle(saved) ? saved : defaultStyle;
}

export function saveWalletStyle(address: string | undefined, style: WalletStyleId) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(address), style);
  window.dispatchEvent(new CustomEvent(styleEvent, { detail: { address, style } }));
}

export function useWalletStyle(address?: string) {
  const [style, setStyle] = useState<WalletStyleId>(defaultStyle);

  useEffect(() => {
    setStyle(getWalletStyle(address));
    const syncFromStorage = () => setStyle(getWalletStyle(address));
    const syncFromSelection = (event: Event) => {
      const detail = (event as CustomEvent<WalletStyleChangeDetail>).detail;
      const sameWallet =
        !detail.address ||
        !address ||
        detail.address.toLowerCase() === address.toLowerCase();

      if (sameWallet && isWalletStyle(detail.style)) {
        setStyle(detail.style);
      }
    };
    window.addEventListener(styleEvent, syncFromSelection);
    window.addEventListener("storage", syncFromStorage);
    return () => {
      window.removeEventListener(styleEvent, syncFromSelection);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, [address]);

  return style;
}

function shortAddress(address?: string) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Connect Wallet";
}

export function WalletAvatarImage({ image, name }: { image: string; name: string }) {
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-white/80 bg-white/75 p-1 shadow-[0_3px_10px_rgba(70,40,20,0.16)]">
      <img
        src={image}
        alt={name}
        className="block h-full w-full object-contain object-center"
      />
    </span>
  );
}

export function WalletStyleBadge({
  address,
  styleId,
  showChevron = true,
  className = "",
}: {
  address?: string;
  styleId?: WalletStyleId;
  showChevron?: boolean;
  className?: string;
}) {
  const savedStyle = useWalletStyle(address);
  const selected = walletStyles.find((item) => item.id === (styleId ?? savedStyle)) ?? walletStyles[0];
  const variables = {
    "--wallet-bg": selected.colors[0],
    "--wallet-border": selected.colors[1],
    "--wallet-text": selected.colors[2],
  } as CSSProperties;

  return (
    <span
      style={variables}
      className={`inline-flex min-h-12 items-center gap-3 rounded-full border-2 border-[var(--wallet-border)] bg-[var(--wallet-bg)] px-2.5 py-1.5 pr-4 text-[var(--wallet-text)] shadow-[0_8px_22px_rgba(77,45,20,0.13)] transition hover:-translate-y-0.5 ${className}`}
    >
      <WalletAvatarImage image={selected.image} name={selected.name} />
      <span className="whitespace-nowrap text-sm font-black tracking-tight sm:text-base">
        {shortAddress(address)}
      </span>
      {showChevron ? (
        <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" aria-hidden="true">
          <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </span>
  );
}

export function WalletStylePicker({
  address,
  value,
  onChange,
}: {
  address?: string;
  value: WalletStyleId;
  onChange: (style: WalletStyleId) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {walletStyles.map((style) => {
        const selected = value === style.id;
        return (
          <button
            key={style.id}
            type="button"
            onClick={() => onChange(style.id)}
            suppressHydrationWarning
            className={`rounded-2xl p-3 text-left transition ${selected ? "bg-orange-50 ring-2 ring-[var(--color-orange)]" : "bg-stone-50 ring-1 ring-stone-200 hover:bg-orange-50/60"}`}
            aria-pressed={selected}
          >
            <WalletStyleBadge address={address} styleId={style.id} showChevron={false} className="w-full" />
            <span className="mt-2 block text-center text-xs font-black text-stone-600">{style.name}</span>
          </button>
        );
      })}
    </div>
  );
}
