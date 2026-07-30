"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useChainId, usePublicClient, useWriteContract } from "wagmi";
import { isAddress, type Address } from "viem";
import { DashboardTopBar } from "@/app/components/DashboardTopBar";
import { AdminSidebar } from "@/app/Admin/components/AdminSidebar";
import { BlockchainSuccessPopup } from "@/app/components/BlockchainSuccessPopup";
import { campaignContractAbi } from "@/lib/campaign-contract-abi";
import { getPawChainId } from "@/lib/campaign-blockchain";
import { roleNFTAbi } from "@/lib/role-nft-abi";

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
  active_campaigns: DeactivationCampaign[];
};

type DeactivationCampaign = {
  id: string;
  title: string;
  contract_address: string | null;
};

type DeactivationStep = DeactivationCampaign & {
  status: "pending" | "processing" | "confirmed";
  txHash?: string;
};

const isDeactivationPending = (shelter: Shelter) =>
  shelter.account_status === "deactivated" && shelter.role_nft_active;

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
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
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
  const [blockchainSuccess, setBlockchainSuccess] = useState<{
    status: "pending" | "confirmed" | "failed";
    title: string;
    message: string;
    txHash: string;
    transactions?: { label: string; hash: string }[];
  } | null>(null);
  const [deactivationSteps, setDeactivationSteps] = useState<
    DeactivationStep[]
  >([]);

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
    const isDeactivating =
      actionTarget.account_status === "active" ||
      isDeactivationPending(actionTarget);
    const action = isDeactivating ? "deactivate" : "reactivate";
    if (actionTarget.account_status === "active" && !reason.trim()) return;
    setBusy(true);
    setDeactivationSteps([]);
    const confirmedTransactions: { label: string; hash: string }[] = [];
    try {
      const changeShelterStatus = async (txHash = "") => {
        const response = await fetch("/api/admin/verified-shelters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: address,
            profileId: actionTarget.profile_id,
            action,
            reason: reason.trim(),
            txHash,
          }),
        });
        const result = await response.json();
        if (!response.ok) {
          throw Object.assign(
            new Error(result.message || "Account action failed."),
            { txHash: result.txHash },
          );
        }
        return result;
      };

      const submitRoleNFTAction = async (
        requiredStatus:
          | "role_nft_mint_required"
          | "role_nft_revocation_required",
        shelterWalletValue: string,
      ) => {
        if (!publicClient) {
          throw new Error("Blockchain connection is unavailable.");
        }
        if (!isAddress(shelterWalletValue)) {
          throw new Error("The shelter wallet address is invalid.");
        }
        const configResponse = await fetch(
          `/api/admin/role-nft-mint-config?walletAddress=${encodeURIComponent(address)}`,
          { cache: "no-store" },
        );
        const config = await configResponse.json();
        if (!configResponse.ok) {
          throw new Error(
            config.message || "Unable to load RoleNFT configuration.",
          );
        }
        if (chainId !== Number(config.chainId)) {
          throw new Error(`Switch MetaMask to PawChain ${config.chainId}.`);
        }
        const contractAddress = config.contractAddress as Address;
        const shelterWallet = shelterWalletValue as Address;
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

        const roleNftHash =
          requiredStatus === "role_nft_mint_required"
            ? await writeContractAsync({
                address: contractAddress,
                abi: roleNFTAbi,
                functionName: "safeMintShelter",
                args: [shelterWallet, String(config.metadataCID)],
              })
            : await writeContractAsync({
                address: contractAddress,
                abi: roleNFTAbi,
                functionName: "revokeRoleNFT",
                args: [shelterWallet],
              });

        const receipt = await publicClient.waitForTransactionReceipt({
          hash: roleNftHash,
        });
        if (receipt.status !== "success") {
          throw new Error(
            requiredStatus === "role_nft_mint_required"
              ? "Shelter RoleNFT minting failed."
              : "Shelter RoleNFT revocation failed.",
          );
        }
        if (requiredStatus === "role_nft_revocation_required") {
          setDeactivationSteps((current) =>
            current.map((step) =>
              step.id === "role-nft-revocation"
                ? { ...step, status: "confirmed", txHash: roleNftHash }
                : step,
            ),
          );
        }
        return roleNftHash;
      };

      let result = await changeShelterStatus();
      if (
        action === "deactivate" &&
        result.status === "deactivation_pending"
      ) {
        if (!publicClient) {
          throw new Error("Blockchain connection is unavailable.");
        }
        if (chainId !== getPawChainId()) {
          throw new Error(`Switch your wallet to PawChain ${getPawChainId()}.`);
        }

        const campaigns = (result.campaigns ??
          []) as DeactivationCampaign[];
        setDeactivationSteps([
          ...campaigns.map((campaign) => ({
            ...campaign,
            status: "pending" as const,
          })),
          {
            id: "role-nft-revocation",
            title: "Revoke Shelter RoleNFT",
            contract_address: null,
            status: "pending",
          },
        ]);

        for (const campaign of campaigns) {
          if (
            !campaign.contract_address ||
            !isAddress(campaign.contract_address)
          ) {
            throw new Error(
              `${campaign.title} does not have a valid campaign contract.`,
            );
          }
          setDeactivationSteps((current) =>
            current.map((step) =>
              step.id === campaign.id
                ? { ...step, status: "processing" }
                : step,
            ),
          );
          await new Promise<void>((resolve) =>
            window.requestAnimationFrame(() => resolve()),
          );
          const cancellationHash = await writeContractAsync({
            address: campaign.contract_address,
            abi: campaignContractAbi,
            functionName: "cancelCampaign",
          });
          const receipt = await publicClient.waitForTransactionReceipt({
            hash: cancellationHash,
          });
          if (receipt.status !== "success") {
            throw new Error(`${campaign.title} cancellation failed.`);
          }

          const saveResponse = await fetch("/api/admin/campaigns", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              walletAddress: address,
              campaignId: campaign.id,
              action: "cancel",
              txHash: cancellationHash,
            }),
          });
          const saveResult = await saveResponse.json();
          if (!saveResponse.ok) {
            throw new Error(
              saveResult.message ??
                `Unable to record ${campaign.title} cancellation.`,
            );
          }
          confirmedTransactions.push({
            label: `Cancel ${campaign.title}`,
            hash: cancellationHash,
          });
          setDeactivationSteps((current) =>
            current.map((step) =>
              step.id === campaign.id
                ? {
                    ...step,
                    status: "confirmed",
                    txHash: cancellationHash,
                  }
                : step,
            ),
          );
        }

        result = await changeShelterStatus();
      }

      if (
        result.status === "role_nft_mint_required" ||
        result.status === "role_nft_revocation_required"
      ) {
        if (result.status === "role_nft_revocation_required") {
          setDeactivationSteps((current) => {
            const steps = current.some(
              (step) => step.id === "role-nft-revocation",
            )
              ? current
              : [
                  ...current,
                  {
                    id: "role-nft-revocation",
                    title: "Revoke Shelter RoleNFT",
                    contract_address: null,
                    status: "pending" as const,
                  },
                ];
            return steps.map((step) =>
              step.id === "role-nft-revocation"
                ? { ...step, status: "processing" as const }
                : step,
            );
          });
          await new Promise<void>((resolve) =>
            window.requestAnimationFrame(() => resolve()),
          );
        }
        const roleNftHash = await submitRoleNFTAction(
          result.status,
          String(result.shelterWallet ?? actionTarget.wallet_address ?? ""),
        );
        confirmedTransactions.push({
          label:
            result.status === "role_nft_mint_required"
              ? "RoleNFT mint"
              : "RoleNFT revocation",
          hash: roleNftHash,
        });
        result = await changeShelterStatus(roleNftHash);
      }

      const expectedFinalStatus =
        action === "deactivate" ? "deactivated" : "active";
      if (result.status !== expectedFinalStatus) {
        throw new Error(
          action === "deactivate"
            ? "Shelter deactivation could not be finalized."
            : "Shelter reactivation could not be finalized.",
        );
      }

      if (result.txHash) {
        setBlockchainSuccess({
          status: "confirmed",
          title:
            action === "deactivate"
              ? "Shelter fully deactivated"
              : "Shelter RoleNFT restored",
          message:
            action === "deactivate"
              ? "All active campaigns were cancelled, donor refunds are available, and the Shelter RoleNFT was revoked."
              : "A Shelter RoleNFT was minted and the shelter account is active again.",
          txHash: result.txHash,
          transactions:
            confirmedTransactions.length > 1
              ? confirmedTransactions
              : undefined,
        });
      } else {
        setBlockchainSuccess({
          status: "confirmed",
          title:
            action === "deactivate"
              ? "Shelter fully deactivated"
              : "Shelter reactivated",
          message:
            action === "deactivate"
              ? "The shelter account is deactivated and no additional blockchain transaction was required."
              : "The shelter account is active and its existing Shelter RoleNFT was verified.",
          txHash: "",
        });
      }
      setActionTarget(null);
      setReason("");
      await load();
    } catch (actionError) {
      const typed = actionError as Error & { txHash?: string };
      const rejected = /reject|denied|cancel/i.test(typed.message);
      setBlockchainSuccess({
        status: "failed",
        title: rejected
          ? "Transaction cancelled"
          : action === "deactivate"
            ? "Shelter deactivation failed"
            : "Shelter reactivation failed",
        message: rejected
          ? "You rejected the request in MetaMask. No pending wallet transaction was completed."
          : "The blockchain action could not be completed. Check your wallet network and permissions, then try again.",
        txHash: typed.txHash ?? "",
      });
      if (rejected) {
        setActionTarget(null);
        setReason("");
        setDeactivationSteps([]);
      }
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
                                className={`rounded-full px-3 py-1 text-xs font-black capitalize ${shelter.account_status === "active" ? "bg-orange-50 text-[var(--color-orange)]" : isDeactivationPending(shelter) ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-600"}`}
                              >
                                {isDeactivationPending(shelter)
                                  ? "Deactivation pending"
                                  : shelter.account_status}
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
                                  className={`rounded-full px-3 py-2 text-xs font-black text-white disabled:opacity-40 ${shelter.account_status === "active" || isDeactivationPending(shelter) ? "bg-stone-950" : "bg-[var(--color-orange)]"}`}
                                >
                                  {shelter.account_status === "active"
                                    ? "Deactivate"
                                    : isDeactivationPending(shelter)
                                      ? "Resume deactivation"
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
              : isDeactivationPending(actionTarget)
                ? "Resume shelter deactivation"
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
          {actionTarget.account_status === "active" ||
          isDeactivationPending(actionTarget) ? (
            <>
              <p className="mt-4 text-sm font-bold leading-6 text-stone-600">
                Shelter access will remain blocked while every active campaign
                is cancelled on-chain. Donors can then claim refunds, and the
                Shelter RoleNFT will be revoked last.
              </p>
              <div className="mt-3 rounded-2xl border border-red-100 bg-red-50/45 p-4">
                <p className="text-xs font-black text-red-800">
                  {actionTarget.active_campaigns.length + 1} MetaMask confirmation
                  {actionTarget.active_campaigns.length + 1 === 1 ? "" : "s"} required
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-red-600">
                  Blockchain action order
                </p>
                <div className="mt-3 space-y-1.5">
                  {actionTarget.active_campaigns.map((campaign, index) => (
                    <div
                      key={campaign.id}
                      className="flex items-center gap-2 text-sm font-bold text-stone-700"
                    >
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-[10px] text-red-700">
                        {index + 1}
                      </span>
                      <span className="truncate">
                        Cancel campaign: {campaign.title}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 text-sm font-bold text-stone-700">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-[10px] text-red-700">
                      {actionTarget.active_campaigns.length + 1}
                    </span>
                    <span>Revoke Shelter RoleNFT</span>
                  </div>
                </div>
                <p className="mt-3 text-xs font-semibold leading-5 text-red-700">
                  MetaMask opens once for every action listed above.
                </p>
              </div>
              {actionTarget.account_status === "active" ? (
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={4}
                  placeholder="Required deactivation reason"
                  className="mt-3 w-full rounded-2xl border border-orange-100 p-4 text-sm font-bold outline-none"
                />
              ) : null}
              {deactivationSteps.length ? (
                <div className="mt-4 space-y-2 rounded-2xl border border-orange-100 bg-orange-50/35 p-3">
                  {deactivationSteps.map((step) => (
                    <div
                      key={step.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-xs"
                    >
                      <span className="min-w-0 truncate font-bold">
                        {step.title}
                      </span>
                      <span
                        className={`shrink-0 font-black ${
                          step.status === "confirmed"
                            ? "text-emerald-600"
                            : step.status === "processing"
                              ? "text-orange-600"
                              : "text-stone-400"
                        }`}
                      >
                        {step.status === "confirmed" ? (
                          step.id === "role-nft-revocation" ? (
                            "Revoked"
                          ) : (
                            "Cancelled"
                          )
                        ) : step.status === "processing" ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-orange-200 border-t-orange-600 motion-reduce:animate-none" />
                            Waiting for wallet
                          </span>
                        ) : (
                          "Pending"
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p className="mt-4 text-sm font-bold leading-6 text-stone-600">
              A new Shelter RoleNFT will be minted before the account is marked
              active.
            </p>
          )}
          <div className="mt-5 flex justify-end gap-3">
            {!busy ? (
              <button
                onClick={() => setActionTarget(null)}
                className="rounded-full px-4 py-2.5 text-sm font-black"
              >
                Cancel
              </button>
            ) : null}
            <button
              disabled={
                busy ||
                (actionTarget.account_status === "active" && !reason.trim())
              }
              onClick={() => void runAction()}
              className="rounded-full bg-stone-950 px-5 py-2.5 text-sm font-black text-white disabled:opacity-40"
            >
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white motion-reduce:animate-none" />
                  {actionTarget.account_status === "active" ||
                  isDeactivationPending(actionTarget)
                    ? "Processing deactivation..."
                    : "Processing reactivation..."}
                </span>
              ) : actionTarget.account_status === "active" ? (
                "Cancel campaigns and deactivate"
              ) : isDeactivationPending(actionTarget) ? (
                "Resume deactivation"
              ) : (
                "Mint and reactivate"
              )}
            </button>
          </div>
        </Modal>
      ) : null}
      <BlockchainSuccessPopup
        open={Boolean(blockchainSuccess)}
        status={blockchainSuccess?.status ?? "confirmed"}
        title={blockchainSuccess?.title ?? ""}
        message={blockchainSuccess?.message ?? ""}
        txHash={blockchainSuccess?.txHash ?? ""}
        transactions={blockchainSuccess?.transactions}
        actionLabel="View RoleNFT transaction"
        onClose={() => setBlockchainSuccess(null)}
      />
    </>
  );
}
