"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type DonorProfile = {
  id: string;
  role: string;
  fullName: string;
  email: string;
  walletAddress: string;
  accountStatus: string;
  createdAt: string;
  updatedAt: string;
  donorSince: string;
};

const readinessItems = [
  { label: "Donor account created", status: "Complete" },
  { label: "Wallet connected", status: "Complete" },
  { label: "RoleNFT credential", status: "Verified" },
  { label: "Profile details", status: "Connected" },
];

const communicationPrefs = [
  "Milestone proof submitted",
  "Funds released",
  "Campaign status changes",
  "Support request replies",
];

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function StatusPill({ status }: { status: string }) {
  const isDone = status === "Complete" || status === "Verified" || status === "Connected";

  return (
    <span
      className={[
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
        isDone
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-amber-200 bg-amber-50 text-amber-700",
      ].join(" ")}
    >
      {status}
    </span>
  );
}

function SettingsPanel({
  children,
  defaultOpen = false,
  description,
  title,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
  description: string;
  title: string;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-2xl border border-orange-100 bg-white shadow-sm"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
        <span>
          <span className="block text-sm font-black text-stone-950">{title}</span>
          <span className="mt-1 block text-sm leading-6 text-stone-500">
            {description}
          </span>
        </span>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-orange-100 bg-orange-50 text-[var(--color-orange)] transition group-open:rotate-180">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </summary>
      <div className="border-t border-orange-100 px-5 py-4">{children}</div>
    </details>
  );
}

export default function DonorSettingsPage() {
  const searchParams = useSearchParams();
  const walletAddress = searchParams.get("walletAddress") ?? "";
  const [profile, setProfile] = useState<DonorProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [actionToast, setActionToast] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setIsLoading(true);
      setErrorMessage("");
      setStatusMessage("");

      if (!walletAddress) {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/donor/profile?walletAddress=${encodeURIComponent(walletAddress)}`,
          { cache: "no-store" },
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message ?? "Unable to load donor profile.");
        }

        if (!isMounted) {
          return;
        }

        setProfile(result.profile);
        setFullName(result.profile.fullName ?? "");
        setEmail(result.profile.email ?? "");
      } catch (error) {
        if (isMounted) {
          setProfile(null);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load donor profile.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [walletAddress]);

  useEffect(() => {
    if (!actionToast) return;
    const timer = window.setTimeout(() => setActionToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [actionToast]);

  async function saveProfile() {
    setIsSaving(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const response = await fetch("/api/donor/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
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

      setProfile(result.profile);
      setFullName(result.profile.fullName ?? "");
      setEmail(result.profile.email ?? "");
      setStatusMessage(result.message ?? "Donor profile updated.");
      setActionToast("Profile changes saved.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to save donor profile.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
          Settings
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-stone-950 sm:text-3xl">
          Donor settings
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          Manage the donor profile linked to your connected wallet.
        </p>
      </section>

      {isLoading ? (
        <section className="rounded-2xl border border-orange-100 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-orange-100 border-t-[var(--color-orange)]" />
          <p className="mt-3 text-sm font-semibold text-stone-600">
            Loading donor profile...
          </p>
        </section>
      ) : null}

      {!isLoading && !walletAddress ? (
        <section className="rounded-2xl border border-orange-100 bg-white p-6 text-center shadow-sm">
          <h2 className="text-lg font-black text-stone-950">
            Connect wallet to edit settings
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
            Your donor profile is matched by wallet address.
          </p>
        </section>
      ) : null}

      {!isLoading && walletAddress ? (
        <section className="grid gap-4 xl:grid-cols-2">
          <SettingsPanel
            defaultOpen
            title="Personal profile"
            description="Update your donor details."
          >
            <div className="grid gap-3 sm:grid-cols-2">
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
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                  Wallet address
                </span>
                <div className="mt-2 break-all rounded-xl border border-orange-100 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-stone-700">
                  {profile?.walletAddress ?? walletAddress}
                </div>
              </label>
            </div>
            <button
              type="button"
              onClick={saveProfile}
              disabled={isSaving || !fullName.trim() || !email.trim()}
              className="mt-4 rounded-xl bg-[var(--color-orange)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-200"
            >
              {isSaving ? "Saving..." : "Save profile changes"}
            </button>
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
          </SettingsPanel>

          <SettingsPanel
            defaultOpen
            title="Account record"
            description="Read-only donor account values linked to your wallet."
          >
            <div className="divide-y divide-orange-100 overflow-hidden rounded-xl border border-orange-100">
              {[
                ["Role", profile?.role ?? "donor"],
                ["Account status", profile?.accountStatus ?? "-"],
                ["Donor since", formatDate(profile?.donorSince)],
                ["Last updated", formatDate(profile?.updatedAt)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 bg-orange-50/20 px-3 py-3"
                >
                  <p className="text-sm font-semibold text-stone-500">{label}</p>
                  <p className="text-right text-sm font-black text-stone-950">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </SettingsPanel>

          <SettingsPanel
            title="Account readiness"
            description="Check registration, wallet, and donor credential setup."
          >
            <div className="divide-y divide-orange-100 overflow-hidden rounded-xl border border-orange-100">
              {readinessItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-3 bg-orange-50/20 px-3 py-3"
                >
                  <p className="text-sm font-semibold text-stone-800">
                    {item.label}
                  </p>
                  <StatusPill status={item.status} />
                </div>
              ))}
            </div>
          </SettingsPanel>

          <SettingsPanel
            title="Notification preferences"
            description="Choose how PawChain should contact you."
          >
            <div className="space-y-2">
              {communicationPrefs.map((pref) => (
                <div
                  key={pref}
                  className="flex items-center justify-between rounded-xl border border-orange-100 bg-orange-50/20 px-3 py-2.5"
                >
                  <p className="text-sm font-semibold text-stone-800">{pref}</p>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    Preview
                  </span>
                </div>
              ))}
            </div>
          </SettingsPanel>
        </section>
      ) : null}
      {actionToast ? (
        <div className="fixed bottom-6 right-6 z-[130] max-w-sm rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm font-black text-stone-950 shadow-[0_20px_60px_rgba(28,25,23,0.18)]">
          <p>{actionToast}</p>
        </div>
      ) : null}
    </div>
  );
}
