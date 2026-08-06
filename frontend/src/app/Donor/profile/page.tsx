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

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
          Account & Profile
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-stone-950 sm:text-3xl">
          Donor profile
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          Manage your donor identity, contact email, wallet style, and verified
          credential from one place.
        </p>
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
