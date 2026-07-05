import { getDashboardProfile } from "@/lib/dashboard-access";

type SettingsProps = {
  searchParams?: Promise<{
    walletAddress?: string;
  }>;
};

const readinessItems = [
  { label: "Donor account created", status: "Complete" },
  { label: "Wallet connected", status: "Complete" },
  { label: "RoleNFT credential", status: "Verified" },
  { label: "Profile details", status: "Ready to update" },
];

const communicationPrefs = [
  "Milestone proof submitted",
  "Funds released",
  "Campaign status changes",
  "Support request replies",
];

function StatusPill({ status }: { status: string }) {
  const isDone = status === "Complete" || status === "Verified";

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

export default async function DonorSettingsPage({ searchParams }: SettingsProps) {
  const params = await searchParams;
  const { profile } = await getDashboardProfile("donor", params?.walletAddress);
  const displayName = profile?.full_name ?? "Anwen";
  const email = profile?.email ?? "anwen@example.com";
  const walletAddress = profile?.wallet_address ?? params?.walletAddress ?? "-";

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
          Keep account controls here so your profile page stays clean and easy
          to read.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <SettingsPanel
          defaultOpen
          title="Personal profile"
          description="Update the donor details shown on your profile page."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                Full name
              </span>
              <input
                defaultValue={displayName}
                className="mt-2 h-11 w-full rounded-xl border border-orange-100 bg-white px-3 text-sm font-semibold text-stone-950 outline-none transition focus:border-[var(--color-orange)] focus:ring-2 focus:ring-orange-100"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                Email
              </span>
              <input
                defaultValue={email}
                type="email"
                className="mt-2 h-11 w-full rounded-xl border border-orange-100 bg-white px-3 text-sm font-semibold text-stone-950 outline-none transition focus:border-[var(--color-orange)] focus:ring-2 focus:ring-orange-100"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                Phone number
              </span>
              <input
                placeholder="Add phone number"
                className="mt-2 h-11 w-full rounded-xl border border-orange-100 bg-white px-3 text-sm font-semibold text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-[var(--color-orange)] focus:ring-2 focus:ring-orange-100"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                Display name
              </span>
              <input
                defaultValue={displayName}
                className="mt-2 h-11 w-full rounded-xl border border-orange-100 bg-white px-3 text-sm font-semibold text-stone-950 outline-none transition focus:border-[var(--color-orange)] focus:ring-2 focus:ring-orange-100"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                Wallet address
              </span>
              <div className="mt-2 break-all rounded-xl border border-orange-100 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-stone-700">
                {walletAddress}
              </div>
            </label>
          </div>
          <button
            type="button"
            className="mt-4 rounded-xl bg-[var(--color-orange)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            Save profile changes to Supabase
          </button>
          <p className="mt-2 text-xs font-medium text-stone-500">
            Save action is UI-only until the Supabase update API is connected.
          </p>
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
          description="Choose the donor updates you want to receive."
        >
          <div className="space-y-2">
            {communicationPrefs.map((pref) => (
              <div
                key={pref}
                className="flex items-center justify-between rounded-xl border border-orange-100 bg-orange-50/20 px-3 py-2.5"
              >
                <p className="text-sm font-semibold text-stone-800">{pref}</p>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  On
                </span>
              </div>
            ))}
          </div>
        </SettingsPanel>

        <SettingsPanel
          title="Privacy and support"
          description="Manage report visibility and support request preferences."
        >
          <div className="space-y-2">
            {[
              ["Show donor name on public receipts", "Private by default"],
              ["Attach wallet to support reports", "Enabled"],
              ["Receive admin replies", "Enabled"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4 rounded-xl border border-orange-100 bg-orange-50/20 px-3 py-2.5"
              >
                <p className="text-sm font-semibold text-stone-800">{label}</p>
                <span className="text-right text-xs font-semibold text-stone-500">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </SettingsPanel>
      </section>
    </div>
  );
}
