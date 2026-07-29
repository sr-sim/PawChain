"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { DashboardTopBar } from "@/app/components/DashboardTopBar";
import { AdminSidebar } from "@/app/Admin/components/AdminSidebar";
import { TransactionLinks } from "@/app/components/TransactionLinks";
import { BlockchainSuccessPopup } from "@/app/components/BlockchainSuccessPopup";

type Shelter = {
  profile_id: string;
  shelter_name: string;
  registration_id: string;
  contact_phone: string;
  website_url: string | null;
  shelter_address: string;
  organization_description: string;
  wallet_address: string | null;
  email: string;
  account_status: "active" | "deactivated";
  deactivation_reason: string | null;
  deactivated_at: string | null;
  deactivated_by: string | null;
  reviewed_at: string | null;
  role_nft_active: boolean;
};

function date(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-MY", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
}

function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-stone-950/45 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[1.6rem] border border-orange-100 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black">{title}</h2>
          <button
            onClick={close}
            className="grid h-10 w-10 place-items-center rounded-full bg-orange-50 text-xl font-black"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function VerifiedSheltersPage() {
  const { address, isConnected } = useAppKitAccount();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "deactivated">("all");
  const [details, setDetails] = useState<Shelter | null>(null);
  const [actionTarget, setActionTarget] = useState<Shelter | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; hash?: string } | null>(
    null,
  );
  const [blockchainSuccess, setBlockchainSuccess] = useState<{
    title: string;
    message: string;
    txHash: string;
  } | null>(null);

  const load = async () => {
    if (!address) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/verified-shelters?walletAddress=${encodeURIComponent(address)}`,
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || "Unable to load verified shelters.");
      setShelters(result.shelters ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load shelters.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (address && isConnected) void load();
    else setShelters([]);
  }, [address, isConnected]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(timer);
  }, [toast]);

  const filtered = useMemo(
    () =>
      shelters.filter((shelter) => {
        const q = search.trim().toLowerCase();
        return (
          (filter === "all" || shelter.account_status === filter) &&
          (!q ||
            shelter.shelter_name.toLowerCase().includes(q) ||
            shelter.registration_id.toLowerCase().includes(q) ||
            shelter.wallet_address?.toLowerCase().includes(q))
        );
      }),
    [shelters, search, filter],
  );

  const runAction = async () => {
    if (!address || !actionTarget) return;
    const action =
      actionTarget.account_status === "active" ? "deactivate" : "reactivate";
    if (action === "deactivate" && !reason.trim()) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/verified-shelters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          profileId: actionTarget.profile_id,
          action,
          reason: reason.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw Object.assign(
          new Error(result.message || "Account action failed."),
          { txHash: result.txHash },
        );
      if (result.txHash) {
        setBlockchainSuccess({
          title:
            action === "deactivate"
              ? "Shelter RoleNFT revoked"
              : "Shelter RoleNFT restored",
          message:
            action === "deactivate"
              ? "The RoleNFT revocation was confirmed and the shelter account is deactivated."
              : "A Shelter RoleNFT was minted and the shelter account is active again.",
          txHash: result.txHash,
        });
      } else {
        setToast({
          message:
            action === "deactivate"
              ? "Shelter deactivated."
              : "Shelter reactivated.",
        });
      }
      setActionTarget(null);
      setReason("");
      await load();
    } catch (actionError) {
      const typed = actionError as Error & { txHash?: string };
      setToast({ message: typed.message, hash: typed.txHash });
    } finally {
      setBusy(false);
    }
  };

  const activeCount = shelters.filter(
    (item) => item.account_status === "active",
  ).length;
  const deactivatedCount = shelters.length - activeCount;

  return (
    <>
      <DashboardTopBar
        role="Admin"
        isMenuOpen={sidebarOpen}
        onMenuClick={() => setSidebarOpen((value) => !value)}
      />
      <AdminSidebar
        open={sidebarOpen}
        onNavigate={() => setSidebarOpen(false)}
      />
      <main
        className={`min-h-screen bg-[var(--color-cream)] px-4 pb-12 pt-24 text-stone-950 transition-[margin] sm:px-8 ${sidebarOpen ? "lg:ml-64" : ""}`}
      >
        <div className="mx-auto max-w-[1500px] space-y-6">
          <header className="rounded-[2rem] border border-orange-100 bg-[linear-gradient(120deg,var(--color-white),var(--color-cream),var(--color-peach))] p-7 shadow-xl shadow-orange-200/20">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-orange)]">
                  Shelter management
                </p>
                <h1 className="mt-2 text-3xl font-black sm:text-4xl">
                  Verified Shelters
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-bold text-stone-600">
                  Manage verified shelter access and synchronize account status
                  with on-chain credentials.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["Verified shelters", shelters.length],
                  ["Active accounts", activeCount],
                  ["Deactivated", deactivatedCount],
                ].map(([label, value], index) => (
                  <div
                    key={String(label)}
                    className="min-w-0 rounded-2xl border border-orange-100 bg-white/80 px-3 py-3 shadow-sm backdrop-blur sm:min-w-28 sm:px-4"
                  >
                    <p
                      className={`text-2xl font-black ${index === 2 ? "text-stone-600" : "text-[var(--color-orange)]"}`}
                    >
                      {value}
                    </p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-stone-500 sm:text-xs">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </header>
          {!isConnected ? (
            <div className="rounded-2xl bg-white p-10 text-center font-bold">
              Connect an admin wallet to continue.
            </div>
          ) : loading ? (
            <div className="grid animate-pulse gap-4 sm:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-28 rounded-2xl bg-white" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl bg-white p-8 text-center">
              <p className="font-black">{error}</p>
              <button
                onClick={() => void load()}
                className="mt-4 rounded-full bg-stone-950 px-5 py-2 text-sm font-black text-white"
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              <section className="rounded-[1.6rem] border border-orange-100 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-[var(--color-orange)]">
                      Directory
                    </p>
                    <h2 className="mt-1 text-2xl font-black">
                      Shelter accounts
                    </h2>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search shelter, ID, or wallet"
                      className="min-w-72 rounded-full border border-orange-100 px-4 py-2.5 text-sm font-bold outline-none"
                    />
                    <select
                      value={filter}
                      onChange={(event) =>
                        setFilter(event.target.value as typeof filter)
                      }
                      className="rounded-full border border-orange-100 bg-white px-4 py-2.5 text-sm font-black"
                    >
                      <option value="all">All accounts</option>
                      <option value="active">Active</option>
                      <option value="deactivated">Deactivated</option>
                    </select>
                  </div>
                </div>
                {filtered.length ? (
                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[1000px] text-left">
                      <thead>
                        <tr className="border-b border-stone-100 text-xs uppercase text-stone-400">
                          {[
                            "Shelter",
                            "Wallet",
                            "Account",
                            "RoleNFT",
                            "Verified",
                            "Actions",
                          ].map((item) => (
                            <th key={item} className="pb-3 pr-4 font-black">
                              {item}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((shelter) => (
                          <tr
                            key={shelter.profile_id}
                            className="border-b border-stone-100 last:border-0"
                          >
                            <td className="py-4 pr-4">
                              <p className="font-black">
                                {shelter.shelter_name}
                              </p>
                              <p className="text-xs font-bold text-stone-400">
                                {shelter.registration_id}
                              </p>
                            </td>
                            <td className="max-w-56 truncate py-4 pr-4 font-mono text-xs">
                              {shelter.wallet_address || "Missing wallet"}
                            </td>
                            <td className="py-4 pr-4">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-black capitalize ${shelter.account_status === "active" ? "bg-orange-50 text-[var(--color-orange)]" : "bg-stone-100 text-stone-600"}`}
                              >
                                {shelter.account_status}
                              </span>
                            </td>
                            <td className="py-4 pr-4 text-sm font-black">
                              {shelter.role_nft_active ? "Active" : "Not found"}
                            </td>
                            <td className="py-4 pr-4 text-xs font-bold text-stone-500">
                              {date(shelter.reviewed_at)}
                            </td>
                            <td className="py-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setDetails(shelter)}
                                  className="rounded-full border border-orange-100 px-3 py-2 text-xs font-black text-[var(--color-orange)]"
                                >
                                  Details
                                </button>
                                <button
                                  disabled={!shelter.wallet_address}
                                  onClick={() => {
                                    setActionTarget(shelter);
                                    setReason("");
                                  }}
                                  className={`rounded-full px-3 py-2 text-xs font-black text-white disabled:opacity-40 ${shelter.account_status === "active" ? "bg-stone-950" : "bg-[var(--color-orange)]"}`}
                                >
                                  {shelter.account_status === "active"
                                    ? "Deactivate"
                                    : "Reactivate"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-orange-200 p-10 text-center font-bold text-stone-500">
                    No verified shelters match this view.
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
      {details ? (
        <Modal title={details.shelter_name} close={() => setDetails(null)}>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ["Registration ID", details.registration_id],
              ["Email", details.email],
              ["Phone", details.contact_phone],
              ["Wallet", details.wallet_address || "Missing"],
              ["Account status", details.account_status],
              ["RoleNFT", details.role_nft_active ? "Active" : "Not found"],
              ["Deactivated at", date(details.deactivated_at)],
              ["Deactivated by", details.deactivated_by || "—"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-stone-50 p-3">
                <p className="text-xs font-black uppercase text-stone-400">
                  {label}
                </p>
                <p className="mt-1 break-words text-sm font-bold">{value}</p>
              </div>
            ))}
          </div>
          {details.deactivation_reason ? (
            <div className="mt-4 rounded-xl bg-orange-50 p-4">
              <p className="text-xs font-black uppercase text-[var(--color-orange)]">
                Deactivation reason
              </p>
              <p className="mt-1 font-bold">{details.deactivation_reason}</p>
            </div>
          ) : null}
        </Modal>
      ) : null}
      {actionTarget ? (
        <Modal
          title={
            actionTarget.account_status === "active"
              ? "Deactivate shelter"
              : "Reactivate shelter"
          }
          close={() => !busy && setActionTarget(null)}
        >
          <div className="mt-4 rounded-2xl bg-orange-50 p-4">
            <p className="font-black">{actionTarget.shelter_name}</p>
            <p className="mt-1 text-sm font-bold text-stone-500">
              {actionTarget.wallet_address}
            </p>
          </div>
          {actionTarget.account_status === "active" ? (
            <>
              <p className="mt-4 text-sm font-bold leading-6 text-stone-600">
                The RoleNFT will be revoked first. The database will only be
                updated after blockchain confirmation.
              </p>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={4}
                placeholder="Required deactivation reason"
                className="mt-3 w-full rounded-2xl border border-orange-100 p-4 text-sm font-bold outline-none"
              />
            </>
          ) : (
            <p className="mt-4 text-sm font-bold leading-6 text-stone-600">
              A new Shelter RoleNFT will be minted before the account is marked
              active.
            </p>
          )}
          <div className="mt-5 flex justify-end gap-3">
            <button
              disabled={busy}
              onClick={() => setActionTarget(null)}
              className="rounded-full px-4 py-2.5 text-sm font-black"
            >
              Cancel
            </button>
            <button
              disabled={
                busy ||
                (actionTarget.account_status === "active" && !reason.trim())
              }
              onClick={() => void runAction()}
              className="rounded-full bg-stone-950 px-5 py-2.5 text-sm font-black text-white disabled:opacity-40"
            >
              {busy
                ? "Waiting for blockchain..."
                : actionTarget.account_status === "active"
                  ? "Revoke and deactivate"
                  : "Mint and reactivate"}
            </button>
          </div>
        </Modal>
      ) : null}
      {toast ? (
        <div className="fixed bottom-6 right-6 z-[100] max-w-md rounded-2xl bg-stone-950 px-5 py-4 text-sm font-black text-white shadow-2xl">
          <p>{toast.message}</p>
          {toast.hash ? (
            <div className="mt-2">
              <TransactionLinks
                transactions={[
                  { label: "RoleNFT tx", hash: toast.hash },
                ]}
                emptyMessage={false}
              />
            </div>
          ) : null}
        </div>
      ) : null}
      <BlockchainSuccessPopup
        open={Boolean(blockchainSuccess)}
        title={blockchainSuccess?.title ?? ""}
        message={blockchainSuccess?.message ?? ""}
        txHash={blockchainSuccess?.txHash ?? ""}
        actionLabel="View RoleNFT transaction"
        onClose={() => setBlockchainSuccess(null)}
      />
    </>
  );
}
