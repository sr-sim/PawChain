import Link from "next/link";
import { DonorProfileEditor } from "@/app/components/DonorProfileEditor";
import { DonorRoleNFTCard } from "@/app/components/DonorRoleNFTCard";
import { DonorWalletAppearance } from "@/app/components/DonorWalletAppearance";
import { getDashboardProfile } from "@/lib/dashboard-access";

type ProfileProps = {
  searchParams?: Promise<{
    walletAddress?: string;
  }>;
};

export default async function DonorProfilePage({ searchParams }: ProfileProps) {
  const params = await searchParams;
  const { userId, profile, accessMode, roleNFT } = await getDashboardProfile(
    "donor",
    params?.walletAddress,
  );
  const displayName = profile?.full_name ?? "Anwen";
  const email = profile?.email ?? "anwen@example.com";
  const walletAddress = profile?.wallet_address ?? params?.walletAddress ?? "-";
  const settingsHref =
    walletAddress && walletAddress !== "-"
      ? `/Donor/settings?walletAddress=${encodeURIComponent(walletAddress)}`
      : "/Donor/settings";

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
            href={settingsHref}
            className="inline-flex w-fit items-center justify-center rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-950 transition hover:border-[var(--color-orange)] hover:bg-orange-50"
          >
            Open settings
          </Link>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <DonorProfileEditor
          initialEmail={email}
          initialFullName={displayName}
          walletAddress={walletAddress}
        />

        <DonorRoleNFTCard
          accessMode={accessMode}
          roleNFT={roleNFT}
          userId={userId}
          walletAddress={walletAddress}
        />
      </section>

      <DonorWalletAppearance walletAddress={walletAddress} />
    </div>
  );
}
