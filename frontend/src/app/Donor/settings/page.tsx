"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  defaultDonorPreferences,
  loadDonorPreferences,
  saveDonorPreferences,
  type DonorPreferenceKey,
  type DonorPreferenceState,
} from "@/lib/donor-preferences";

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

const communicationPrefs: Array<{
  description: string;
  key: DonorPreferenceKey;
  label: string;
}> = [
  {
    key: "milestoneUpdates",
    label: "Milestone updates",
    description: "Highlight proof, review, and release updates.",
  },
  {
    key: "refundUpdates",
    label: "Refund updates",
    description: "Highlight claimable or received campaign refunds.",
  },
  {
    key: "supportReplies",
    label: "Support replies",
    description: "Highlight admin replies for reports and help requests.",
  },
];

const privacyPrefs: Array<{
  description: string;
  key: DonorPreferenceKey;
  label: string;
}> = [
  {
    key: "shortWallet",
    label: "Short wallet display",
    description: "Prefer shortened wallet addresses on donor pages.",
  },
  {
    key: "privateReports",
    label: "Private report view",
    description: "Keep report details limited to donor and admin screens.",
  },
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

function PreferenceToggle({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex w-full flex-col gap-3 rounded-xl border border-orange-100 bg-orange-50/20 px-3 py-3 text-left transition hover:border-orange-200 hover:bg-orange-50/45 sm:flex-row sm:items-center sm:justify-between"
    >
      <span>
        <span className="block text-sm font-black text-stone-950">{label}</span>
        <span className="mt-1 block text-sm leading-5 text-stone-500">
          {description}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <span
          className={[
            "text-xs font-black uppercase tracking-[0.12em]",
            checked ? "text-emerald-700" : "text-stone-400",
          ].join(" ")}
        >
          {checked ? "On" : "Off"}
        </span>
        <span
          className={[
            "relative h-7 w-12 rounded-full border transition",
            checked
              ? "border-emerald-200 bg-emerald-100"
              : "border-stone-200 bg-stone-100",
          ].join(" ")}
        >
          <span
            className={[
              "absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition",
              checked ? "left-6" : "left-1",
            ].join(" ")}
          />
        </span>
      </span>
    </button>
  );
}

function shortWallet(wallet: string) {
  if (!wallet || wallet === "-") return "-";
  return `${wallet.slice(0, 8)}...${wallet.slice(-6)}`;
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
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [preferences, setPreferences] =
    useState<DonorPreferenceState>(defaultDonorPreferences);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setIsLoading(true);
      setErrorMessage("");

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
    setPreferences(loadDonorPreferences(walletAddress));
  }, [walletAddress]);

  function updatePreference(key: DonorPreferenceKey) {
    setPreferences((current) => {
      const next = {
        ...current,
        [key]: !current[key],
      };
      saveDonorPreferences(walletAddress, next);
      return next;
    });
  }

  const displayedWallet = preferences.shortWallet
    ? shortWallet(profile?.walletAddress ?? walletAddress)
    : (profile?.walletAddress ?? walletAddress);

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
          Manage account information, notification preferences, privacy, and
          display options. Name and email changes are handled in Profile.
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
        <section className="grid items-start gap-4 xl:grid-cols-2">
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
                ["Wallet", displayedWallet],
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
            defaultOpen
            title="Notification preferences"
            description="Choose which donor updates should be highlighted."
          >
            <div className="space-y-2">
              {communicationPrefs.map((pref) => (
                <PreferenceToggle
                  key={pref.key}
                  checked={preferences[pref.key]}
                  description={pref.description}
                  label={pref.label}
                  onChange={() => updatePreference(pref.key)}
                />
              ))}
            </div>
          </SettingsPanel>

          <SettingsPanel
            defaultOpen
            title="Privacy and reports"
            description="Control wallet display and report visibility."
          >
            <div className="space-y-2">
              {privacyPrefs.map((pref) => (
                <PreferenceToggle
                  key={pref.key}
                  checked={preferences[pref.key]}
                  description={pref.description}
                  label={pref.label}
                  onChange={() => updatePreference(pref.key)}
                />
              ))}
            </div>
          </SettingsPanel>

          {errorMessage ? (
            <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 xl:col-span-2">
              {errorMessage}
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
