import { DashboardTopBar } from "@/app/components/DashboardTopBar";
import { RoleNFTBadge } from "@/app/components/RoleNFTBadge";
import { getDashboardProfile } from "@/lib/dashboard-access";

type DashboardProps = {
  searchParams?: Promise<{
    walletAddress?: string;
  }>;
};

export default async function DonorDashboard({ searchParams }: DashboardProps) {
  const params = await searchParams;
  const { userId, profile, accessMode, roleNFT } = await getDashboardProfile(
    "donor",
    params?.walletAddress,
  );

  return (
    <>
      <DashboardTopBar role="Donor" />
      <main className="min-h-screen bg-[var(--color-cream)] px-4 pb-8 pt-28 text-stone-950 sm:px-8">
        <h1 className="text-3xl font-black">Donor Dashboard</h1>
        <p className="mt-4 text-lg font-bold">
          This is dashboard for current logged in user details.
        </p>
        <div className="mt-6 space-y-2 rounded-2xl border border-orange-100 bg-white p-5 text-sm font-bold shadow-sm">
          <p>User ID: {userId ?? "Not logged in"}</p>
          <p>Access: {accessMode === "wallet" ? "RoleNFT wallet" : accessMode}</p>
          <p>Name: {profile?.full_name ?? "-"}</p>
          <p>Email: {profile?.email ?? "-"}</p>
          <p>Role: {profile?.role ?? "-"}</p>
          <p>Wallet: {profile?.wallet_address ?? "-"}</p>
          <RoleNFTBadge role="Donor" roleNFT={roleNFT} />
        </div>
      </main>
    </>
  );
}
