"use client";

import { useState } from "react";

type DonorProfile = {
  id?: string;
  full_name?: string;
  email?: string;
  role?: string;
  wallet_address?: string;
};

export function DonorProfileMenu({ profile }: { profile?: DonorProfile }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-black text-stone-900 shadow-sm transition hover:border-[var(--color-orange)] hover:bg-orange-50"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-orange-100 text-[var(--color-orange)]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M4 21v-2a4 4 0 0 1 3-3.87" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </span>
        <span className="hidden sm:inline">Profile</span>
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-3 w-80 overflow-hidden rounded-3xl border border-orange-100 bg-white p-5 shadow-2xl ring-1 ring-orange-100">
          <div className="mb-4 border-b border-orange-100 pb-3">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--color-orange)]">
              Donor profile
            </p>
            <p className="mt-2 text-base font-bold text-stone-950">
              {profile?.full_name ?? "Guest donor"}
            </p>
          </div>

          <div className="space-y-3 text-sm text-stone-700">
            <div className="rounded-3xl bg-[var(--color-cream)] p-3">
              <p className="font-black">User ID</p>
              <p className="mt-1 break-all text-[0.92rem]">{profile?.id ?? "-"}</p>
            </div>
            <div className="rounded-3xl bg-[var(--color-cream)] p-3">
              <p className="font-black">Email</p>
              <p className="mt-1 break-all text-[0.92rem]">{profile?.email ?? "-"}</p>
            </div>
            <div className="rounded-3xl bg-[var(--color-cream)] p-3">
              <p className="font-black">Wallet</p>
              <p className="mt-1 break-all text-[0.92rem]">{profile?.wallet_address ?? "-"}</p>
            </div>
            <div className="rounded-3xl bg-[var(--color-cream)] p-3">
              <p className="font-black">Role</p>
              <p className="mt-1 text-[0.92rem] uppercase">
                {profile?.role ?? "-"}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
