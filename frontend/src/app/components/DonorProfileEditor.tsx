"use client";

import Link from "next/link";
import { useState } from "react";

type DonorProfileEditorProps = {
  initialEmail: string;
  initialFullName: string;
  walletAddress: string;
};

function shortWallet(wallet: string) {
  if (!wallet || wallet === "-") return "-";
  return `${wallet.slice(0, 8)}...${wallet.slice(-6)}`;
}

export function DonorProfileEditor({
  initialEmail,
  initialFullName,
  walletAddress,
}: DonorProfileEditorProps) {
  const [fullName, setFullName] = useState(initialFullName);
  const [email, setEmail] = useState(initialEmail);
  const [savedFullName, setSavedFullName] = useState(initialFullName);
  const [savedEmail, setSavedEmail] = useState(initialEmail);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const hasChanges =
    fullName.trim() !== savedFullName || email.trim() !== savedEmail;
  const canSave =
    hasChanges && Boolean(fullName.trim()) && Boolean(email.trim()) && !isSaving;

  async function saveProfile() {
    setIsSaving(true);
    setStatusMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/donor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          fullName,
          email,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Unable to save donor profile.");
      }

      setFullName(result.profile.fullName ?? "");
      setEmail(result.profile.email ?? "");
      setSavedFullName(result.profile.fullName ?? "");
      setSavedEmail(result.profile.email ?? "");
      setStatusMessage(result.message ?? "Donor profile updated.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to save donor profile.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-orange-50 text-2xl font-black text-[var(--color-orange)] ring-1 ring-orange-100">
          {(savedFullName || "D").slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xl font-black text-stone-950">
            {savedFullName || "Donor"}
          </p>
          <p className="mt-1 truncate text-sm font-medium text-stone-500">
            {savedEmail || "No email saved"}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
            Full name
          </span>
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-orange-100 bg-white px-3 text-sm font-semibold text-stone-950 outline-none transition focus:border-[var(--color-orange)] focus:ring-2 focus:ring-orange-100"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
            Email
          </span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            className="mt-2 h-11 w-full rounded-xl border border-orange-100 bg-white px-3 text-sm font-semibold text-stone-950 outline-none transition focus:border-[var(--color-orange)] focus:ring-2 focus:ring-orange-100"
          />
        </label>
      </div>

      <div className="mt-4 divide-y divide-orange-100 overflow-hidden rounded-xl border border-orange-100">
        <div className="flex items-center justify-between gap-4 bg-orange-50/20 px-3 py-3">
          <span className="text-sm font-medium text-stone-500">Role</span>
          <span className="text-sm font-semibold text-stone-950">Donor</span>
        </div>
        <div className="flex items-center justify-between gap-4 bg-orange-50/20 px-3 py-3">
          <span className="text-sm font-medium text-stone-500">Wallet</span>
          <span className="font-mono text-sm font-semibold text-stone-950">
            {shortWallet(walletAddress)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 bg-orange-50/20 px-3 py-3">
          <span className="text-sm font-medium text-stone-500">
            Profile status
          </span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            Verified
          </span>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void saveProfile()}
          disabled={!canSave}
          className="rounded-xl bg-[var(--color-orange)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-200"
        >
          {isSaving ? "Saving..." : "Save profile changes"}
        </button>
        <Link
          href="/Donor/help"
          className="text-sm font-semibold text-[var(--color-orange)] transition hover:text-stone-950"
        >
          Need help?
        </Link>
      </div>

      {statusMessage ? (
        <p className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
          {statusMessage}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
