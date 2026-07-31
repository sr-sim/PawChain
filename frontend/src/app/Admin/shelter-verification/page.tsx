"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useChainId, usePublicClient, useWriteContract } from "wagmi";
import { isAddress, type Address } from "viem";
import { DashboardTopBar } from "@/app/components/DashboardTopBar";
import { AdminSidebar as SharedAdminSidebar } from "@/app/Admin/components/AdminSidebar";
import { BlockchainSuccessPopup } from "@/app/components/BlockchainSuccessPopup";
import { roleNFTAbi } from "@/lib/role-nft-abi";

type ApplicationStatus = "pending" | "approved" | "rejected";

type ShelterApplication = {
  id: string;
  user_id: string;
  shelter_name: string;
  registration_id: string;
  contact_phone: string;
  website_url: string | null;
  shelter_address: string;
  organization_description: string;
  proof_document_path: string | null;
  proof_document_url: string | null;
  applicant_name: string | null;
  applicant_email: string | null;
  applicant_wallet: string | null;
  account_status: string | null;
  status: ApplicationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

const navItems = [
  { label: "Dashboard", href: "/Admin/dashboard" },
  { label: "Shelter Verification", href: "/Admin/shelter-verification" },
  { label: "Campaign Management" },
  { label: "Milestone Verification" },
  { label: "Transactions" },
  { label: "Users" },
  { label: "Analytics" },
  { label: "Settings" },
];

function formatDate(value: string | null) {
  if (!value) return "Not reviewed";
  return new Intl.DateTimeFormat("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function NavIcon({ index }: { index: number }) {
  const paths = [
    "M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z",
    "M4 20v-8l8-7 8 7v8h-6v-5h-4v5H4Zm5-11V5h6v4",
    "M5 19V7l12-3v18L5 19Zm12-10h2a3 3 0 0 1 0 6h-2",
    "m5 12 4 4L19 6M5 5h6M5 19h14",
    "M4 7h16M4 12h16M4 17h10",
    "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 10c1-5 3-7 7-7s6 2 7 7",
    "M4 20V10m6 10V4m6 16v-7m5 7H2",
    "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
  ];
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[index]} />
    </svg>
  );
}

function AdminSidebar({
  open,
  onNavigate,
}: {
  open: boolean;
  onNavigate: () => void;
}) {
  return (
    <aside
      className={`fixed bottom-0 left-0 top-16 z-40 overflow-hidden border-r border-orange-100 bg-white/95 shadow-[14px_0_36px_rgba(155,86,20,0.05)] transition-[width] duration-300 ${open ? "w-64" : "w-0"}`}
      aria-label="Admin navigation"
    >
      <div className="flex h-full min-w-64 flex-col px-4 py-4">
        <nav className="flex-1 space-y-1 overflow-y-auto">
          <p className="mb-2 px-2 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Admin portal
          </p>
          {navItems.map((item, index) => {
            const active = item.label === "Shelter Verification";
            const classes = `flex min-h-10 items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium ${active ? "border-orange-200 bg-orange-50/55 text-[var(--color-orange)] shadow-[inset_3px_0_0_var(--color-orange)]" : item.href ? "border-transparent text-slate-700 hover:bg-orange-50" : "cursor-not-allowed border-transparent text-slate-400"}`;
            const content = (
              <>
                <span className="shrink-0">
                  <NavIcon index={index} />
                </span>
                <span className="truncate">{item.label}</span>
                {!item.href ? (
                  <span className="ml-auto text-[9px] font-bold uppercase">
                    Soon
                  </span>
                ) : null}
              </>
            );
            return item.href ? (
              <Link
                key={item.label}
                href={item.href}
                onClick={onNavigate}
                className={classes}
              >
                {content}
              </Link>
            ) : (
              <div key={item.label} className={classes}>
                {content}
              </div>
            );
          })}
        </nav>
        <Link
          href="/"
          className="border-t border-orange-100 px-3 pt-4 text-sm font-bold text-slate-600"
        >
          ← Logout
        </Link>
      </div>
    </aside>
  );
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const classes = {
    pending:
      "bg-[rgba(var(--color-gold-rgb),0.18)] text-stone-800 ring-[rgba(var(--color-gold-rgb),0.5)]",
    approved:
      "bg-[rgba(var(--color-orange-rgb),0.12)] text-[var(--color-orange)] ring-[rgba(var(--color-orange-rgb),0.35)]",
    rejected: "bg-stone-100 text-stone-700 ring-stone-300",
  }[status];
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black capitalize ring-1 ${classes}`}
    >
      {status}
    </span>
  );
}

function ApplicationStatusChart(_: {
  counts: Record<ApplicationStatus, number>;
}) {
  return null;
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-stone-950/45 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[1.6rem] border border-orange-100 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-black">{title}</h2>
          <button
            type="button"
            onClick={onClose}
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

function ShelterApplicationDetailsModal({
  application,
  onClose,
}: {
  application: ShelterApplication;
  onClose: () => void;
}) {
  const fields = [
    ["Application ID", application.id],
    ["User ID", application.user_id],
    ["Account owner", application.applicant_name || "Not provided"],
    ["Account email", application.applicant_email || "Not provided"],
    ["Wallet address", application.applicant_wallet || "Not provided"],
    ["Account status", application.account_status || "Not provided"],
    ["Shelter name", application.shelter_name],
    ["Registration ID", application.registration_id],
    ["Contact phone", application.contact_phone],
    ["Website", application.website_url || "Not provided"],
    ["Address", application.shelter_address],
    ["Application status", application.status],
    ["Created", formatDate(application.created_at)],
    ["Updated", formatDate(application.updated_at)],
    ["Reviewed by", application.reviewed_by || "Not reviewed"],
    ["Reviewed at", formatDate(application.reviewed_at)],
  ];
  return (
    <ModalShell title={application.shelter_name} onClose={onClose}>
      <div className="mt-4">
        <StatusBadge status={application.status} />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-stone-50 p-3">
            <p className="text-xs font-black uppercase text-stone-400">
              {label}
            </p>
            {label === "Website" && application.website_url ? (
              <a
                href={application.website_url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block break-all text-sm font-bold text-[var(--color-orange)] underline decoration-orange-200 underline-offset-2 transition hover:text-stone-950"
              >
                {application.website_url} ↗
              </a>
            ) : (
              <p className="mt-1 break-words text-sm font-bold">{value}</p>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl bg-stone-50 p-4">
        <p className="text-xs font-black uppercase text-stone-400">
          Organization description
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm font-bold leading-6 text-stone-700">
          {application.organization_description}
        </p>
      </div>
      {application.proof_document_url ? (
        <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-stone-200 bg-white text-stone-600 shadow-sm">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 2.5h8l4 4V21H6V2.5Z" />
                  <path d="M14 2.5v4h4M9 12h6M9 16h6" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-bold text-stone-900">
                  Registration certificate / licence
                </p>
                <p className="mt-0.5 text-xs text-stone-500">
                  Review this document before making a decision.
                </p>
              </div>
            </div>
            <a
              href={application.proof_document_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2"
            >
              Open document
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M14 5h5v5M19 5l-8 8" />
                <path d="M19 14v5H5V5h5" />
              </svg>
            </a>
          </div>
        </div>
      ) : null}
      {application.rejection_reason ? (
        <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4">
          <p className="text-xs font-black uppercase text-[var(--color-orange)]">
            Rejection reason
          </p>
          <p className="mt-1 text-sm font-bold">
            {application.rejection_reason}
          </p>
        </div>
      ) : null}
    </ModalShell>
  );
}

function RejectReasonModal({
  application,
  busy,
  onClose,
  onSubmit,
}: {
  application: ShelterApplication;
  busy: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <ModalShell title={`Reject ${application.shelter_name}`} onClose={onClose}>
      <p className="mt-3 text-sm font-bold text-stone-500">
        A clear reason is required so the shelter can correct and resubmit its
        application.
      </p>
      <textarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        rows={5}
        placeholder="Explain what must be corrected..."
        className="mt-4 w-full rounded-2xl border border-orange-100 p-4 text-sm font-bold outline-none focus:border-[var(--color-orange)] focus:ring-4 focus:ring-orange-100"
      />
      <div className="mt-4 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-4 py-2 text-sm font-black"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={busy || !reason.trim()}
          onClick={() => onSubmit(reason.trim())}
          className="rounded-full bg-stone-950 px-5 py-2 text-sm font-black text-white disabled:opacity-40"
        >
          {busy ? "Rejecting..." : "Reject application"}
        </button>
      </div>
    </ModalShell>
  );
}

export default function ShelterVerificationPage() {
  const { address, isConnected } = useAppKitAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [applications, setApplications] = useState<ShelterApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | ApplicationStatus>("all");
  const [selected, setSelected] = useState<ShelterApplication | null>(null);
  const [rejecting, setRejecting] = useState<ShelterApplication | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [blockchainSuccess, setBlockchainSuccess] = useState<{
    status: "pending" | "confirmed" | "failed";
    title: string;
    message: string;
    txHash: string;
  } | null>(null);

  const loadApplications = async () => {
    if (!address) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/shelter-applications?walletAddress=${encodeURIComponent(address)}`,
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.message || "Unable to load shelter applications.",
        );
      setApplications(result.applications ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load applications.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (address && isConnected) void loadApplications();
    else setApplications([]);
  }, [address, isConnected]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const counts = useMemo(
    () => ({
      pending: applications.filter((item) => item.status === "pending").length,
      approved: applications.filter((item) => item.status === "approved")
        .length,
      rejected: applications.filter((item) => item.status === "rejected")
        .length,
    }),
    [applications],
  );
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return applications.filter(
      (item) =>
        (filter === "all" || item.status === filter) &&
        (!query ||
          item.shelter_name.toLowerCase().includes(query) ||
          item.registration_id.toLowerCase().includes(query)),
    );
  }, [applications, filter, search]);

  const submitAction = async (
    application: ShelterApplication,
    action: "approve" | "reject",
    rejectionReason = "",
  ) => {
    if (!address) return;
    setBusyId(application.id);
    try {
      let txHash = "";
      if (action === "approve") {
        if (!application.applicant_wallet || !isAddress(application.applicant_wallet)) {
          throw new Error("The shelter wallet address is invalid.");
        }
        if (!publicClient) {
          throw new Error("Blockchain connection is unavailable.");
        }
        const configResponse = await fetch(
          `/api/admin/role-nft-mint-config?walletAddress=${encodeURIComponent(address)}`,
          { cache: "no-store" },
        );
        const config = await configResponse.json();
        if (!configResponse.ok) {
          throw new Error(config.message || "Unable to load RoleNFT configuration.");
        }
        if (chainId !== Number(config.chainId)) {
          throw new Error(`Switch MetaMask to PawChain ${config.chainId}.`);
        }
        const contractAddress = config.contractAddress as Address;
        const shelterWallet = application.applicant_wallet as Address;
        const connectedWalletIsAdmin = await publicClient.readContract({
          address: contractAddress,
          abi: roleNFTAbi,
          functionName: "isAdmin",
          args: [address as Address],
        });
        if (!connectedWalletIsAdmin) {
          throw new Error(
            "This MetaMask wallet is not authorized as a RoleNFT admin.",
          );
        }
        const hasNFT = await publicClient.readContract({
          address: contractAddress,
          abi: roleNFTAbi,
          functionName: "hasRoleNFT",
          args: [shelterWallet],
        });
        if (hasNFT) {
          const existingRole = await publicClient.readContract({
            address: contractAddress,
            abi: roleNFTAbi,
            functionName: "getUserRole",
            args: [shelterWallet],
          });
          if (existingRole !== "Shelter") {
            throw new Error("This wallet already has a different RoleNFT.");
          }
        } else {
          txHash = await writeContractAsync({
            address: contractAddress,
            abi: roleNFTAbi,
            functionName: "safeMintShelter",
            args: [shelterWallet, String(config.metadataCID)],
          });
          setBlockchainSuccess({
            status: "pending",
            title: "Minting Shelter RoleNFT",
            message:
              "The admin transaction was submitted through MetaMask and is waiting for blockchain confirmation.",
            txHash,
          });
          const receipt = await publicClient.waitForTransactionReceipt({
            hash: txHash as `0x${string}`,
          });
          if (receipt.status !== "success") {
            throw new Error("Shelter RoleNFT minting failed.");
          }
        }
      }
      const response = await fetch("/api/admin/shelter-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          applicationId: application.id,
          action,
          rejectionReason,
          txHash,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || "Unable to review application.");
      setRejecting(null);
      setSelected(null);
      if (action === "approve" && result.txHash) {
        setBlockchainSuccess({
          status: "confirmed",
          title: "Shelter approved successfully",
          message:
            "The Shelter RoleNFT was minted and the wallet is now verified on-chain.",
          txHash: result.txHash,
        });
      } else {
        setToast(
          action === "approve"
            ? "Shelter approved successfully."
            : "Application rejected successfully.",
        );
      }
      await loadApplications();
    } catch (actionError) {
      const message =
        actionError instanceof Error ? actionError.message : "Action failed.";
      if (action === "approve") {
        const cancelled = /reject|denied|cancel/i.test(message);
        setBlockchainSuccess({
          status: "failed",
          title: cancelled
            ? "Transaction cancelled"
            : "Shelter approval failed",
          message: cancelled
            ? "You cancelled the request in MetaMask. The Shelter RoleNFT was not minted and the application was not approved."
            : message,
          txHash: "",
        });
      } else setToast(message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <DashboardTopBar
        role="Admin"
        onMenuClick={() => setSidebarOpen((value) => !value)}
        isMenuOpen={sidebarOpen}
      />
      <SharedAdminSidebar
        open={sidebarOpen}
        onNavigate={() => setSidebarOpen(false)}
      />
      <main
        className={`min-h-screen bg-[var(--color-cream)] px-4 pb-12 pt-24 text-stone-950 transition-[margin] duration-300 sm:px-8 ${sidebarOpen ? "lg:ml-64" : "ml-0"}`}
      >
        <div className="mx-auto max-w-[1500px] space-y-6">
          <header className="rounded-[2rem] border border-orange-100 bg-[linear-gradient(120deg,var(--color-white),var(--color-cream),var(--color-peach))] p-7 shadow-xl shadow-orange-200/20">
            <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-orange)]">
                  Admin review
                </p>
                <h1 className="mt-2 text-3xl font-black sm:text-4xl">
                  Shelter Verification
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-bold text-stone-600">
                  Review organization details and proof documents before
                  granting verified shelter access.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["Total applications", applications.length],
                  ["Pending applications", counts.pending],
                  ["Approved shelters", counts.approved],
                  ["Rejected applications", counts.rejected],
                ].map(([label, value], index) => (
                  <div
                    key={String(label)}
                    className="min-w-0 rounded-2xl border border-orange-100 bg-white/80 px-3 py-3 shadow-sm backdrop-blur sm:min-w-28 sm:px-4"
                  >
                    <p
                      className={`text-2xl font-black ${index === 3 ? "text-stone-600" : "text-[var(--color-orange)]"}`}
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
          {!isConnected || !address ? (
            <div className="rounded-2xl border border-orange-100 bg-white p-10 text-center font-bold">
              Connect an authorized admin wallet to continue.
            </div>
          ) : loading ? (
            <div className="grid animate-pulse gap-4 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-28 rounded-2xl bg-white" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-orange-200 bg-white p-8 text-center">
              <p className="font-black">{error}</p>
              <button
                onClick={() => void loadApplications()}
                className="mt-4 rounded-full bg-stone-950 px-5 py-2 text-sm font-black text-white"
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              <ApplicationStatusChart counts={counts} />
              <section className="overflow-hidden rounded-[1.4rem] border border-orange-100 bg-white shadow-[0_14px_38px_rgba(97,55,17,0.07)]">
                <div className="flex flex-col gap-4 border-b border-orange-100 bg-orange-50/35 p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-wider text-[var(--color-orange)]">
                      Applications
                    </p>
                    <h2 className="mt-1 text-base font-black text-stone-950">
                      Shelter application list
                    </h2>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search shelter or registration ID"
                      className="min-w-72 rounded-xl border border-orange-100 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    />
                    <select
                      value={filter}
                      onChange={(event) =>
                        setFilter(event.target.value as typeof filter)
                      }
                      className="rounded-xl border border-orange-100 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-orange-400"
                    >
                      <option value="all">All statuses</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
                {filtered.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1050px] text-left">
                      <thead className="border-b border-orange-100 bg-[rgba(var(--color-cream-rgb),0.55)]">
                        <tr className="text-[11px] uppercase tracking-wider text-stone-500">
                          {[
                            "Shelter",
                            "Registration ID",
                            "Contact",
                            "Website",
                            "Status",
                            "Created",
                            "Reviewed",
                            "Actions",
                          ].map((heading) => (
                            <th key={heading} className="px-5 py-3 font-black">
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-orange-100">
                        {filtered.map((application) => (
                          <tr
                            key={application.id}
                            className="transition hover:bg-orange-50/35"
                          >
                            <td className="px-5 py-4 font-semibold">
                              {application.shelter_name}
                            </td>
                            <td className="px-5 py-4 text-sm font-medium">
                              {application.registration_id}
                            </td>
                            <td className="px-5 py-4 text-sm font-medium">
                              {application.contact_phone}
                            </td>
                            <td className="max-w-40 px-5 py-4 text-sm font-medium">
                              {application.website_url ? (
                                <a
                                  href={application.website_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  title={application.website_url}
                                  className="block max-w-40 truncate text-[var(--color-orange)] underline decoration-orange-200 underline-offset-2 transition hover:text-stone-950"
                                >
                                  {application.website_url} ↗
                                </a>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <StatusBadge status={application.status} />
                            </td>
                            <td className="px-5 py-4 text-xs font-medium text-stone-500">
                              {formatDate(application.created_at)}
                            </td>
                            <td className="px-5 py-4 text-xs font-medium text-stone-500">
                              {formatDate(application.reviewed_at)}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelected(application)}
                                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-bold text-stone-800 shadow-sm transition hover:border-stone-400 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:ring-offset-2"
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    className="h-4 w-4 text-stone-500"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                  >
                                    <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                                    <circle cx="12" cy="12" r="2.5" />
                                  </svg>
                                  View details
                                </button>
                                {application.status === "pending" ? (
                                  <>
                                    <button
                                      disabled={busyId === application.id}
                                      onClick={() =>
                                        void submitAction(application, "approve")
                                      }
                                      className="rounded-full bg-[var(--color-orange)] px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      disabled={busyId === application.id}
                                      onClick={() => setRejecting(application)}
                                      className="rounded-full bg-stone-950 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                                    >
                                      Reject
                                    </button>
                                  </>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-orange-200 bg-orange-50/40 p-10 text-center font-bold text-stone-500">
                    No shelter applications match your search and filter.
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
      {selected ? (
        <ShelterApplicationDetailsModal
          application={selected}
          onClose={() => setSelected(null)}
        />
      ) : null}
      {rejecting ? (
        <RejectReasonModal
          application={rejecting}
          busy={busyId === rejecting.id}
          onClose={() => setRejecting(null)}
          onSubmit={(reason) => void submitAction(rejecting, "reject", reason)}
        />
      ) : null}
      {toast ? (
        <div className="fixed bottom-6 right-6 z-[100] max-w-sm rounded-2xl bg-stone-950 px-5 py-4 text-sm font-black text-white shadow-2xl">
          <p>{toast}</p>
        </div>
      ) : null}
      <BlockchainSuccessPopup
        open={Boolean(blockchainSuccess)}
        status={blockchainSuccess?.status ?? "confirmed"}
        title={blockchainSuccess?.title ?? ""}
        message={blockchainSuccess?.message ?? ""}
        txHash={blockchainSuccess?.txHash ?? ""}
        actionLabel="View RoleNFT transaction"
        onClose={() => setBlockchainSuccess(null)}
      />
    </>
  );
}
