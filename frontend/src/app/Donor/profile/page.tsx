import Link from "next/link";
import { DonorRoleNFTCard } from "@/app/components/DonorRoleNFTCard";
import { getDashboardProfile } from "@/lib/dashboard-access";

type ProfileProps = {
  searchParams?: Promise<{
    walletAddress?: string;
  }>;
};

function shortWallet(wallet: string) {
  if (!wallet || wallet === "-") return "-";
  return `${wallet.slice(0, 8)}...${wallet.slice(-6)}`;
}

export default async function DonorProfilePage({ searchParams }: ProfileProps) {
  const params = await searchParams;
  const { userId, profile, accessMode, roleNFT } = await getDashboardProfile(
    "donor",
    params?.walletAddress,
  );
  const displayName = profile?.full_name ?? "Anwen";
  const email = profile?.email ?? "anwen@example.com";
  const walletAddress = profile?.wallet_address ?? params?.walletAddress ?? "-";

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
              Account & Profile
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-stone-950 sm:text-3xl">
              Donor profile
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              A clean overview of your donor identity and wallet credential.
              Detailed controls live in Settings.
            </p>
          </div>

          <Link
            href="/Donor/settings"
            className="inline-flex w-fit items-center justify-center rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-950 transition hover:border-[var(--color-orange)] hover:bg-orange-50"
          >
            Open settings
          </Link>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-orange-50 text-2xl font-black text-[var(--color-orange)] ring-1 ring-orange-100">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xl font-black text-stone-950">{displayName}</p>
              <p className="mt-1 truncate text-sm font-medium text-stone-500">
                {email}
              </p>
            </div>
          </div>

          <div className="mt-5 divide-y divide-orange-100 overflow-hidden rounded-xl border border-orange-100">
            <div className="flex items-center justify-between gap-4 bg-orange-50/20 px-3 py-3">
              <span className="text-sm font-medium text-stone-500">Role</span>
              <span className="text-sm font-semibold text-stone-950">Donor</span>
            </div>
            <div className="flex items-center justify-between gap-4 bg-orange-50/20 px-3 py-3">
              <span className="text-sm font-medium text-stone-500">Wallet</span>
              <span className="text-sm font-semibold text-stone-950">
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
            <Link
              href="/Donor/settings"
              className="rounded-xl border border-orange-100 bg-orange-50 px-4 py-2.5 text-sm font-semibold text-stone-950 transition hover:border-[var(--color-orange)] hover:bg-white"
            >
              Manage settings
            </Link>
            <Link
              href="/Donor/help"
              className="text-sm font-semibold text-[var(--color-orange)] transition hover:text-stone-950"
            >
              Need help?
            </Link>
          </div>
        </div>

        <DonorRoleNFTCard
          accessMode={accessMode}
          roleNFT={roleNFT}
          userId={userId}
          walletAddress={walletAddress}
        />
      </section>
    </div>
  );
}
