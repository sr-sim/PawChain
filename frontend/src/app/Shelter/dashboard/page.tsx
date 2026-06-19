import { DashboardTopBar } from "@/app/components/DashboardTopBar";
import { createClient } from "@/lib/supabase/server";

export default async function ShelterDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("full_name, email, role, wallet_address")
        .eq("id", user.id)
        .single()
    : { data: null };

  return (
    <>
      <DashboardTopBar role="Shelter" />
      <main className="min-h-screen bg-[var(--color-cream)] px-4 pb-8 pt-28 text-stone-950 sm:px-8">
        <h1 className="text-3xl font-black">Shelter Dashboard</h1>
        <p className="mt-4 text-lg font-bold">
          This is dashboard for current logged in user details.
        </p>
        <div className="mt-6 space-y-2 rounded-2xl border border-orange-100 bg-white p-5 text-sm font-bold shadow-sm">
          <p>User ID: {user?.id ?? "Not logged in"}</p>
          <p>Name: {profile?.full_name ?? "-"}</p>
          <p>Email: {profile?.email ?? user?.email ?? "-"}</p>
          <p>Role: {profile?.role ?? "-"}</p>
          <p>Wallet: {profile?.wallet_address ?? "-"}</p>
        </div>
      </main>
    </>
  );
}
