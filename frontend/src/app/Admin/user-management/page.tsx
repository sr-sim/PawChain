"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { DashboardTopBar } from "@/app/components/DashboardTopBar";
import { AdminSidebar } from "@/app/Admin/components/AdminSidebar";
import type { DonorBadgeLevel } from "@/lib/role-nft";

type User = {
  id: string;
  role: string;
  full_name: string | null;
  email: string | null;
  wallet_address: string | null;
  account_status: string;
  deactivation_reason: string | null;
  deactivated_at: string | null;
  deactivated_by: string | null;
  created_at: string;
  updated_at: string;
  donor_badge_level: DonorBadgeLevel | null;
};

const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "—";
const shortWallet = (value: string | null) =>
  value ? `${value.slice(0, 7)}…${value.slice(-5)}` : "No wallet";

function certificateEmailHref(user: User) {
  const subject = "Your PawChain Hero Donor Certificate";
  const greetingName = user.full_name?.trim() || "Hero Donor";
  const body = [
    `Dear ${greetingName},`,
    "",
    "Congratulations on achieving Hero Donor status with PawChain!",
    "",
    "Please find your Hero Donor certificate attached to this email. Thank you for your exceptional generosity and continued support for animal shelters.",
    "",
    "Warm regards,",
    "PawChain Administration",
  ].join("\n");

  return `mailto:${encodeURIComponent(user.email ?? "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black capitalize ${className}`}>{children}</span>;
}

function DonorBadge({ level }: { level: DonorBadgeLevel | null }) {
  const classes = {
    normal: "bg-stone-100 text-stone-700 ring-stone-200",
    bronze: "bg-amber-100 text-amber-800 ring-amber-200",
    silver: "bg-slate-100 text-slate-700 ring-slate-300",
    gold: "bg-yellow-100 text-yellow-800 ring-yellow-300",
    hero: "bg-violet-100 text-violet-800 ring-violet-200",
  };

  return level ? (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black capitalize ring-1 ${classes[level]}`}>
      {level}
    </span>
  ) : (
    <span className="text-xs font-semibold text-stone-400">No badge</span>
  );
}

function Modal({ user, close }: { user: User; close: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-stone-950/45 p-4 backdrop-blur-sm">
      <div className="mx-auto my-6 max-h-[90vh] max-w-2xl overflow-y-auto rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">User details</p><h2 className="mt-1 text-2xl font-black">{user.full_name || "Unnamed user"}</h2></div>
          <button type="button" onClick={close} aria-label="Close dialog" className="grid h-9 w-9 place-items-center rounded-xl text-xl hover:bg-orange-50">×</button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[["Full name", user.full_name || "—"], ["Email", user.email || "—"], ["Wallet address", user.wallet_address || "—"], ["Role", user.role], ["Account status", user.account_status], ["Created", date(user.created_at)], ["Updated", date(user.updated_at)]].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-stone-50 p-3"><p className="text-[10px] font-black uppercase tracking-wide text-stone-400">{label}</p><p className="mt-1 break-words text-sm font-bold capitalize">{value}</p></div>
          ))}
        </div>
        {user.account_status === "deactivated" ? (
          <section className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-stone-500">Deactivation record</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">{[["Reason", user.deactivation_reason || "—"], ["Deactivated at", date(user.deactivated_at)], ["Deactivated by", user.deactivated_by || "—"]].map(([label, value]) => <div key={label}><p className="text-xs font-bold text-stone-400">{label}</p><p className="mt-1 break-words text-sm font-bold">{value}</p></div>)}</div>
          </section>
        ) : null}
        <p className="mt-5 rounded-xl bg-stone-50 p-3 text-sm font-bold text-stone-500">This donor account is view-only.</p>
      </div>
    </div>
  );
}

export default function UserManagementPage() {
  const { address, isConnected } = useAppKitAccount();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");
  const [details, setDetails] = useState<User | null>(null);
  const [copied, setCopied] = useState("");

  const load = async () => {
    if (!address) return;
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/admin/users?walletAddress=${encodeURIComponent(address)}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to load users.");
      setUsers(result.users ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load users.");
    } finally { setLoading(false); }
  };

  useEffect(() => { if (address && isConnected) void load(); else setUsers([]); }, [address, isConnected]);

  const summary = useMemo(() => ({
    total: users.length,
    active: users.filter((item) => item.account_status === "active").length,
    deactivated: users.filter((item) => item.account_status === "deactivated").length,
  }), [users]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...users].filter((user) =>
      user.role === "donor" &&
      (status === "all" || user.account_status === status) &&
      (!query || [user.full_name, user.email, user.wallet_address].filter(Boolean).join(" ").toLowerCase().includes(query)),
    ).sort((a, b) => {
      if (sort === "oldest") return +new Date(a.created_at) - +new Date(b.created_at);
      if (sort === "name-asc") return (a.full_name ?? "").localeCompare(b.full_name ?? "");
      if (sort === "name-desc") return (b.full_name ?? "").localeCompare(a.full_name ?? "");
      return +new Date(b.created_at) - +new Date(a.created_at);
    });
  }, [users, search, status, sort]);

  const copyWallet = async (wallet: string) => {
    await navigator.clipboard.writeText(wallet); setCopied(wallet);
    window.setTimeout(() => setCopied(""), 1500);
  };

  return <>
    <DashboardTopBar role="Admin" isMenuOpen={sidebarOpen} onMenuClick={() => setSidebarOpen((value) => !value)} />
    <AdminSidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
    <main className={`min-h-screen bg-[var(--color-cream)] px-4 pb-12 pt-24 text-stone-950 transition-[margin] sm:px-8 ${sidebarOpen ? "lg:ml-64" : ""}`}>
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="rounded-[2rem] border border-orange-100 bg-[linear-gradient(120deg,var(--color-white),var(--color-cream),var(--color-peach))] p-6 shadow-xl shadow-orange-200/20 sm:p-7">
          <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-orange)]">Donor directory</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Donor Management</h1><p className="mt-2 max-w-2xl text-sm font-bold text-stone-600">View and inspect donor accounts and their current RoleNFT badge levels.</p></div>
            <div className="grid grid-cols-3 gap-2">{[["Total donors", summary.total], ["Active", summary.active], ["Deactivated", summary.deactivated]].map(([label, value]) => <div key={String(label)} className="min-w-28 rounded-2xl border border-orange-100 bg-white/80 px-3 py-3 shadow-sm backdrop-blur"><p className={`text-2xl font-black ${label === "Deactivated" ? "text-stone-600" : "text-[var(--color-orange)]"}`}>{value}</p><p className="mt-1 text-[10px] font-black uppercase tracking-wide text-stone-500">{label}</p></div>)}</div>
          </div>
        </header>
        {!isConnected ? <div className="rounded-2xl border border-orange-100 bg-white p-10 text-center font-bold">Connect an authorized admin wallet to continue.</div> : loading ? <div className="grid animate-pulse gap-4 sm:grid-cols-3">{[1,2,3].map((item) => <div key={item} className="h-28 rounded-2xl bg-white" />)}</div> : error ? <div className="rounded-2xl border border-orange-100 bg-white p-8 text-center"><p className="font-black">{error}</p><button onClick={() => void load()} className="mt-4 rounded-full bg-stone-950 px-5 py-2.5 text-sm font-black text-white">Try again</button></div> :
          <section className="overflow-hidden rounded-[1.4rem] border border-orange-100 bg-white shadow-[0_14px_38px_rgba(97,55,17,0.07)]">
            <div className="border-b border-orange-100 bg-orange-50/35 p-4 sm:p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div><p className="text-[11px] font-black uppercase tracking-wider text-[var(--color-orange)]">Directory</p><h2 className="mt-1 text-base font-black text-stone-950">Platform donors</h2><p className="mt-0.5 text-xs font-medium text-stone-500">{filtered.length} donors shown</p></div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(18rem,1.5fr)_repeat(2,minmax(9rem,1fr))]"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, or wallet" className="h-10 rounded-xl border border-orange-100 bg-white px-3 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100" /><select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-xl border border-orange-100 bg-white px-3 text-sm font-medium outline-none focus:border-orange-400"><option value="all">All accounts</option><option value="active">Active</option><option value="deactivated">Deactivated</option></select><select value={sort} onChange={(event) => setSort(event.target.value)} className="h-10 rounded-xl border border-orange-100 bg-white px-3 text-sm font-medium outline-none focus:border-orange-400"><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="name-asc">Name A–Z</option><option value="name-desc">Name Z–A</option></select></div>
              </div>
            </div>
            {filtered.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left"><thead className="border-b border-orange-100 bg-[rgba(var(--color-cream-rgb),0.55)] text-[11px] uppercase tracking-wider text-stone-500"><tr>{["Donor", "Email", "Wallet", "Role", "Badge Level", "Account", "Created", "Actions"].map((label) => <th key={label} className="px-3 py-3 font-black xl:px-4">{label}</th>)}</tr></thead><tbody className="divide-y divide-orange-100">{filtered.map((user) => <tr key={user.id} className="transition hover:bg-orange-50/35"><td className="px-3 py-4 xl:px-4"><div className="flex items-center gap-2"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--color-peach)] text-xs font-black text-[var(--color-orange)]">{(user.full_name || user.email || "U").slice(0,2).toUpperCase()}</span><p className="max-w-40 truncate font-semibold">{user.full_name || "Unnamed donor"}</p></div></td><td className="max-w-44 truncate px-3 py-4 text-sm font-medium text-stone-600 xl:px-4">{user.email || "—"}</td><td className="px-3 py-4 xl:px-4"><div className="flex items-center gap-1.5"><span className="font-mono text-xs">{shortWallet(user.wallet_address)}</span>{user.wallet_address ? <button onClick={() => void copyWallet(user.wallet_address!)} className="rounded-lg border border-orange-100 px-2 py-1 text-[10px] font-black text-[var(--color-orange)]">{copied === user.wallet_address ? "Copied" : "Copy"}</button> : null}</div></td><td className="px-3 py-4 xl:px-4"><Badge className="bg-amber-50 text-amber-800">{user.role}</Badge></td><td className="px-3 py-4 xl:px-4"><DonorBadge level={user.donor_badge_level} /></td><td className="px-3 py-4 xl:px-4"><Badge className={user.account_status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-stone-200 text-stone-700"}>{user.account_status}</Badge></td><td className="px-3 py-4 text-xs font-medium text-stone-500 xl:px-4">{date(user.created_at)}</td><td className="px-3 py-4 xl:px-4"><div className="flex flex-col items-start gap-2"><button onClick={() => setDetails(user)} className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-stone-800 shadow-sm transition hover:border-stone-400 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:ring-offset-2"><svg viewBox="0 0 24 24" className="h-4 w-4 text-stone-500" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></svg>View details</button>{user.donor_badge_level === "hero" && user.email ? <a href={certificateEmailHref(user)} className="inline-flex whitespace-nowrap rounded-lg bg-violet-600 px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:ring-offset-2">Email certificate</a> : null}</div></td></tr>)}</tbody></table></div> : <div className="p-12 text-center"><h3 className="text-base font-black">No donors found</h3><p className="mt-1 text-sm font-semibold text-stone-500">Adjust the search or filters to view another donor.</p></div>}
          </section>}
      </div>
    </main>
    {details ? <Modal user={details} close={() => setDetails(null)} /> : null}
  </>;
}
