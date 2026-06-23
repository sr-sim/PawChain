"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppKitAccount } from "@reown/appkit/react";
import { DashboardTopBar } from "@/app/components/DashboardTopBar";

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
  status: "pending" | "approved" | "rejected";
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
};

export default function ShelterApprovedPage() {
  const { address, isConnected } = useAppKitAccount();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(false);
  const [applications, setApplications] = useState<ShelterApplication[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const checkAdmin = async (walletAddress: string) => {
    setIsCheckingAdmin(true);

    try {
      const response = await fetch(
        `/api/auth/admin-status?walletAddress=${encodeURIComponent(
          walletAddress,
        )}`,
      );
      const result = await response.json();
      setIsAdmin(response.ok && Boolean(result.isAdmin));
      return response.ok && Boolean(result.isAdmin);
    } catch {
      setIsAdmin(false);
      return false;
    } finally {
      setIsCheckingAdmin(false);
    }
  };

  const loadApplications = async (adminAllowed = isAdmin) => {
    if (!address || !adminAllowed) {
      setApplications([]);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/shelter-applications?walletAddress=${encodeURIComponent(
          address,
        )}`,
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to load applications.");
      }

      setApplications(result.applications ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load applications.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!address || !isConnected) {
      setIsAdmin(false);
      setApplications([]);
      return;
    }

    const loadAdminApplications = async () => {
      const adminAllowed = await checkAdmin(address);
      await loadApplications(adminAllowed);
    };

    void loadAdminApplications();
  }, [address, isConnected]);

  const submitAdminAction = async (
    applicationId: string,
    action: "approve" | "reject",
    rejectionReason = "",
  ) => {
    if (!address) return;

    setPendingActionId(applicationId);
    setError("");

    try {
      const response = await fetch("/api/admin/shelter-applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: address,
          applicationId,
          action,
          rejectionReason,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to update application.");
      }

      await loadApplications(true);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to update application.",
      );
    } finally {
      setPendingActionId(null);
    }
  };

  return (
    <>
      <DashboardTopBar role="Admin" />
      <main className="min-h-screen bg-[var(--color-cream)] px-4 pb-8 pt-28 text-stone-950 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/Admin/dashboard"
            className="text-sm font-black text-[var(--color-orange)] transition hover:text-stone-950"
          >
            Back to admin dashboard
          </Link>

          <div className="mt-5">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--color-orange)]">
              Shelter approval
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Review shelter applications
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-stone-600">
              Admin access is checked by connected wallet. Approved shelters
              receive a Shelter RoleNFT before dashboard access unlocks.
            </p>
          </div>

          {!isConnected ? (
            <div className="mt-6 rounded-2xl border border-orange-100 bg-white p-5 text-sm font-bold shadow-sm">
              Connect an admin wallet first.
            </div>
          ) : isCheckingAdmin ? (
            <div className="mt-6 rounded-2xl border border-orange-100 bg-white p-5 text-sm font-bold shadow-sm">
              Checking admin access...
            </div>
          ) : !isAdmin ? (
            <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-600 shadow-sm">
              Access denied. This wallet is not in the admin allowlist.
            </div>
          ) : error ? (
            <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-600 shadow-sm">
              {error}
            </div>
          ) : isLoading ? (
            <div className="mt-6 rounded-2xl border border-orange-100 bg-white p-5 text-sm font-bold shadow-sm">
              Loading shelter applications...
            </div>
          ) : applications.length ? (
            <div className="mt-6 grid gap-4">
              {applications.map((application) => (
                <article
                  key={application.id}
                  className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-xl font-black">
                        {application.shelter_name}
                      </h2>
                      <p className="mt-1 text-sm font-bold text-stone-500">
                        Submitted{" "}
                        {new Date(application.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-amber-700">
                      {application.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm font-bold text-stone-700 sm:grid-cols-2">
                    <p>Registration ID: {application.registration_id}</p>
                    <p>Phone: {application.contact_phone}</p>
                    <p>Website: {application.website_url || "-"}</p>
                    <p>Document: {application.proof_document_path || "-"}</p>
                    <p className="sm:col-span-2">
                      Address: {application.shelter_address}
                    </p>
                    <p className="sm:col-span-2">
                      Description: {application.organization_description}
                    </p>
                    {application.rejection_reason && (
                      <p className="sm:col-span-2 text-red-600">
                        Rejection reason: {application.rejection_reason}
                      </p>
                    )}
                  </div>

                  {application.status === "pending" && (
                    <div className="mt-5 grid gap-3 lg:grid-cols-[auto_1fr]">
                      <button
                        type="button"
                        disabled={pendingActionId === application.id}
                        onClick={() => {
                          void submitAdminAction(application.id, "approve");
                        }}
                        className="rounded-full bg-stone-950 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-orange-200/70 transition hover:-translate-y-0.5 hover:bg-[var(--color-orange)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {pendingActionId === application.id
                          ? "Updating..."
                          : "Approve shelter"}
                      </button>

                      <form
                        className="grid gap-2 sm:grid-cols-[1fr_auto]"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const formData = new FormData(event.currentTarget);
                          void submitAdminAction(
                            application.id,
                            "reject",
                            String(formData.get("rejectionReason") ?? ""),
                          );
                        }}
                      >
                        <input
                          name="rejectionReason"
                          placeholder="Reason if rejected"
                          className="rounded-full border border-orange-100 bg-white px-4 py-2.5 text-sm font-bold outline-none transition focus:border-[var(--color-orange)] focus:ring-4 focus:ring-orange-100"
                        />
                        <button
                          type="submit"
                          disabled={pendingActionId === application.id}
                          className="rounded-full border border-red-100 bg-red-50 px-5 py-2.5 text-sm font-black text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </form>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-orange-100 bg-white p-5 text-sm font-bold text-stone-600 shadow-sm">
              No shelter applications yet.
            </div>
          )}
        </div>
      </main>
    </>
  );
}
