"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useChainId, usePublicClient, useWriteContract } from "wagmi";
import { formatEther, isAddress } from "viem";
import { DashboardTopBar } from "@/app/components/DashboardTopBar";
import { AdminSidebar } from "@/app/Admin/components/AdminSidebar";
import { campaignFactoryAbi } from "@/lib/campaign-factory-abi";
import { campaignContractAbi } from "@/lib/campaign-contract-abi";
import { TransactionLinks } from "@/app/components/TransactionLinks";
import { BlockchainSuccessPopup } from "@/app/components/BlockchainSuccessPopup";
import {
  campaignKeyFromId,
  demoEthMyrRate,
  getCampaignFactoryAddress,
  getPawChainId,
  myrToWei,
} from "@/lib/campaign-blockchain";

type Milestone = {
  id: string;
  title: string;
  description: string;
  requirement: string;
  percentage: number | string;
  status: string;
  proof_url: string | null;
  rejection_reason: string | null;
  on_chain_index: number | null;
  proof_tx_hash?: string | null;
  review_tx_hash?: string | null;
  release_tx_hash?: string | null;
  created_at: string;
  updated_at: string;
};
type Campaign = {
  id: string;
  shelter_id: string;
  shelter_name: string | null;
  shelter_wallet: string | null;
  title: string;
  description: string;
  location: string;
  goal_amount: number | string;
  current_amount: number | string | null;
  urgency_level: string;
  campaign_status: string;
  duration_days: number;
  image_url: string | null;
  contract_address: string | null;
  deployment_tx_hash?: string | null;
  goal_wei?: string | null;
  on_chain_total_raised_wei?: string | null;
  on_chain_goal_wei?: string | null;
  on_chain_status?: number | null;
  cancellation_tx_hash?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  blockchain_deadline: string | null;
  created_at: string;
  updated_at: string;
  rejection_reason: string | null;
  campaign_milestones: Milestone[];
};
type Tab =
  | "All Campaigns"
  | "Pending Approval"
  | "Approved"
  | "Rejected"
  | "Completed"
  | "Closed";
type ProofPreview = { name: string; url: string };

function displayProofName(name: string) {
  const decoded = (() => {
    try {
      return decodeURIComponent(name);
    } catch {
      return name;
    }
  })();
  const filename = decoded.split(/[\\/]/).pop() || "Milestone proof";
  return filename
    .replace(/^[a-f0-9]{16,}[_-]/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+(\.[a-z0-9]+)$/i, "$1")
    .trim();
}

const tabs: Tab[] = [
  "All Campaigns",
  "Pending Approval",
  "Approved",
  "Rejected",
  "Completed",
  "Closed",
];
const urgencyRank: Record<string, number> = { critical: 0, high: 1, medium: 2 };
const money = (value: number | string | null) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
const date = (value: string) =>
  new Intl.DateTimeFormat("en-MY", { dateStyle: "medium" }).format(
    new Date(value),
  );
const isApproved = (status: string) =>
  status === "active" || status === "approved";
const effectiveCampaignStatus = (campaign: Campaign) =>
  campaign.on_chain_status === 1
    ? "completed"
    : campaign.on_chain_status === 2 || campaign.on_chain_status === 3
      ? "closed"
      : campaign.campaign_status;
const campaignProgress = (campaign: Campaign) => {
  if (campaign.on_chain_status === 1) return 100;
  const raised = Number(campaign.on_chain_total_raised_wei ?? 0);
  const goal = Number(campaign.on_chain_goal_wei ?? campaign.goal_wei ?? 0);
  return goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
};
const weiAsEth = (value?: string | null) =>
  `${Number(formatEther(BigInt(value || "0"))).toLocaleString("en-MY", {
    maximumFractionDigits: 6,
  })} ETH`;
const reviewableMilestone = (item: Milestone) =>
  Boolean(item.proof_url) && item.status === "submitted";

function proofLinks(value: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [{ name: "Proof", url: value }];
    return parsed
      .map((item) =>
        typeof item === "string"
          ? { name: "Proof", url: item }
          : {
              name: item.name || "Proof",
              url: item.url || item.path || item.dataUrl || "",
            },
      )
      .filter((item) => item.url);
  } catch {
    return [{ name: "Proof", url: value }];
  }
}

function MilestoneBadge({ item }: { item: Milestone }) {
  const label = reviewableMilestone(item) ? "Pending review" : item.status;
  const style = reviewableMilestone(item)
    ? "bg-amber-100 text-amber-800 ring-amber-200"
    : item.status === "approved"
      ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
      : item.status === "rejected"
        ? "bg-red-100 text-red-700 ring-red-200"
        : "bg-stone-100 text-stone-600 ring-stone-200";
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-black capitalize ring-1 ${style}`}
    >
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style =
    status === "pending_approval"
      ? "bg-[rgba(var(--color-gold-rgb),0.2)] text-stone-800"
      : isApproved(status)
        ? "bg-orange-50 text-[var(--color-orange)]"
        : status === "rejected"
          ? "bg-stone-100 text-stone-700"
          : "bg-[var(--color-cream)] text-stone-700";
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black capitalize ${style}`}
    >
      {status === "pending_approval"
        ? "Pending approval"
        : status === "active"
          ? "Approved / Active"
          : status}
    </span>
  );
}

function Modal({
  title,
  close,
  children,
  wide = false,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-stone-950/45 p-4 backdrop-blur-sm">
      <div
        className={`mx-auto my-4 max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] ${wide ? "max-w-5xl" : "max-w-xl"}`}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-black">{title}</h2>
          <button
            onClick={close}
            className="grid h-9 w-9 place-items-center rounded-xl hover:bg-orange-50"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function CampaignManagementPage() {
  const { address, isConnected } = useAppKitAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [urgency, setUrgency] = useState("all");
  const [status, setStatus] = useState("all");
  const [location, setLocation] = useState("all");
  const [sort, setSort] = useState("newest");
  const [tab, setTab] = useState<Tab>("All Campaigns");
  const [milestoneCampaign, setMilestoneCampaign] = useState<Campaign | null>(null);
  const [details, setDetails] = useState<Campaign | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Campaign | null>(null);
  const [reason, setReason] = useState("");
  const [milestoneDetails, setMilestoneDetails] = useState<Milestone | null>(null);
  const [proofPreview, setProofPreview] = useState<ProofPreview | null>(null);
  const [milestoneApproveTarget, setMilestoneApproveTarget] =
    useState<Milestone | null>(null);
  const [milestoneRejectTarget, setMilestoneRejectTarget] =
    useState<Milestone | null>(null);
  const [milestoneReason, setMilestoneReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [blockchainSuccess, setBlockchainSuccess] = useState<{
    status: "pending" | "confirmed" | "failed";
    title: string;
    message: string;
    txHash: string;
  } | null>(null);
  const [heroSlide, setHeroSlide] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [documentHidden, setDocumentHidden] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const load = async () => {
    if (!address) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/campaigns?walletAddress=${encodeURIComponent(address)}`,
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || "Unable to load campaigns.");
      setCampaigns(
        (result.campaigns ?? []).map((campaign: Campaign) => ({
          ...campaign,
          campaign_milestones: [...(campaign.campaign_milestones ?? [])].sort(
            (left, right) =>
              (left.on_chain_index ?? Number.MAX_SAFE_INTEGER) -
              (right.on_chain_index ?? Number.MAX_SAFE_INTEGER),
          ),
        })),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load campaigns.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (address && isConnected) void load();
    else setCampaigns([]);
  }, [address, isConnected]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const update = () => setDocumentHidden(document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  const locations = useMemo(
    () =>
      [
        ...new Set(campaigns.map((item) => item.location).filter(Boolean)),
      ].sort(),
    [campaigns],
  );
  const summary = useMemo(
    () => ({
      total: campaigns.length,
      pending: campaigns.filter(
        (item) => effectiveCampaignStatus(item) === "pending_approval",
      ).length,
      approved: campaigns.filter((item) =>
        isApproved(effectiveCampaignStatus(item)),
      )
        .length,
      rejected: campaigns.filter(
        (item) => effectiveCampaignStatus(item) === "rejected",
      )
        .length,
      completed: campaigns.filter(
        (item) => effectiveCampaignStatus(item) === "completed",
      ).length,
      closed: campaigns.filter(
        (item) => effectiveCampaignStatus(item) === "closed",
      )
        .length,
      proofs: campaigns.reduce(
        (total, item) =>
          total +
          (item.campaign_milestones ?? []).filter(reviewableMilestone).length,
        0,
      ),
    }),
    [campaigns],
  );
  const latestCampaigns = useMemo(
    () =>
      [...campaigns]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .slice(0, 4),
    [campaigns],
  );
  const heroSlideCount = latestCampaigns.length + 1;
  useEffect(() => {
    setHeroSlide((current) => Math.min(current, heroSlideCount - 1));
  }, [heroSlideCount]);
  useEffect(() => {
    if (heroSlideCount < 2 || heroPaused || documentHidden || reduceMotion) return;
    const timer = window.setInterval(
      () => setHeroSlide((current) => (current + 1) % heroSlideCount),
      3000,
    );
    return () => window.clearInterval(timer);
  }, [heroSlideCount, heroPaused, documentHidden, reduceMotion]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const tabMatch = (item: Campaign) =>
      tab === "All Campaigns" ||
      (tab === "Pending Approval" &&
        effectiveCampaignStatus(item) === "pending_approval") ||
      (tab === "Approved" && isApproved(effectiveCampaignStatus(item))) ||
      (tab === "Rejected" && effectiveCampaignStatus(item) === "rejected") ||
      (tab === "Completed" &&
        effectiveCampaignStatus(item) === "completed") ||
      (tab === "Closed" && effectiveCampaignStatus(item) === "closed");
    return campaigns
      .filter(
        (item) =>
          tabMatch(item) &&
          (urgency === "all" || item.urgency_level === urgency) &&
          (status === "all" ||
            effectiveCampaignStatus(item) === status ||
            (status === "approved" &&
              isApproved(effectiveCampaignStatus(item)))) &&
          (location === "all" || item.location === location) &&
          (!q ||
            [
              item.title,
              item.shelter_name,
              item.shelter_id,
              item.description,
              item.location,
              ...(item.campaign_milestones ?? []).flatMap((milestone) => [
                milestone.title,
                milestone.description,
                milestone.requirement,
              ]),
            ]
              .join(" ")
              .toLowerCase()
              .includes(q)),
      )
      .sort((a, b) =>
        sort === "goal"
          ? Number(b.on_chain_goal_wei ?? b.goal_wei ?? 0) -
            Number(a.on_chain_goal_wei ?? a.goal_wei ?? 0)
          : sort === "funded"
            ? Number(b.on_chain_total_raised_wei ?? 0) -
              Number(a.on_chain_total_raised_wei ?? 0)
            : sort === "urgency"
              ? (urgencyRank[a.urgency_level] ?? 9) -
                (urgencyRank[b.urgency_level] ?? 9)
              : new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
      );
  }, [campaigns, tab, urgency, status, location, search, sort]);

  const review = async (campaign: Campaign, action: "approve" | "reject") => {
    if (!address) return;
    setBusy(true);
    try {
      let txHash: `0x${string}` | "" = "";
      let goalWei = "";
      let deadline = 0;

      if (action === "approve") {
        if (!publicClient) {
          throw new Error("Blockchain connection is unavailable.");
        }
        if (chainId !== getPawChainId()) {
          throw new Error(`Switch your wallet to PawChain ${getPawChainId()}.`);
        }
        if (!campaign.shelter_wallet || !isAddress(campaign.shelter_wallet)) {
          throw new Error("The shelter wallet address is missing.");
        }

        const orderedMilestones = [...campaign.campaign_milestones].sort(
          (left, right) => {
            if (
              left.on_chain_index !== null &&
              right.on_chain_index !== null
            ) {
              return left.on_chain_index - right.on_chain_index;
            }
            return (
              new Date(left.created_at).getTime() -
              new Date(right.created_at).getTime()
            );
          },
        );
        const percentages = orderedMilestones.map(
          (milestone) => Number(milestone.percentage) * 100,
        );
        if (
          percentages.length < 2 ||
          percentages.length > 5 ||
          percentages[0] !== 500 ||
          percentages.reduce((sum, value) => sum + value, 0) !== 10_000
        ) {
          throw new Error(
            "Milestones must start with 5% and total exactly 100%.",
          );
        }

        const calculatedGoalWei = myrToWei(
          Number(campaign.goal_amount),
          demoEthMyrRate,
        );
        deadline =
          Math.floor(Date.now() / 1000) + campaign.duration_days * 24 * 60 * 60;
        goalWei = calculatedGoalWei.toString();
        txHash = await writeContractAsync({
          address: getCampaignFactoryAddress(),
          abi: campaignFactoryAbi,
          functionName: "createApprovedCampaign",
          args: [
            campaignKeyFromId(campaign.id),
            campaign.shelter_wallet,
            calculatedGoalWei,
            BigInt(deadline),
            percentages,
          ],
        });
        setBlockchainSuccess({
          status: "pending",
          title: "Deploying campaign contract",
          message:
            "The campaign approval transaction was submitted and is waiting for Sepolia confirmation.",
          txHash,
        });
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash,
        });
        if (receipt.status !== "success") {
          throw new Error("Campaign deployment failed.");
        }
      }

      const response = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          campaignId: campaign.id,
          action,
          rejectionReason: reason.trim(),
          txHash,
          goalWei,
          ethMyrRate: demoEthMyrRate,
          deadline,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Review failed.");
      if (action === "approve" && txHash) {
        setBlockchainSuccess({
          status: "confirmed",
          title: "Campaign approved successfully",
          message:
            "The campaign contract was deployed and the campaign is now active on-chain.",
          txHash,
        });
      } else {
        setToast("Campaign rejected successfully.");
      }
      setRejectTarget(null);
      setReason("");
      await load();
    } catch (reviewError) {
      const message =
        reviewError instanceof Error ? reviewError.message : "Review failed.";
      if (action === "approve") {
        const cancelled = /reject|denied|cancel/i.test(message);
        setBlockchainSuccess({
          status: "failed",
          title: cancelled
            ? "Transaction cancelled"
            : "Campaign approval failed",
          message: cancelled
            ? "You cancelled the request in MetaMask. No blockchain changes were made."
            : message,
          txHash: "",
        });
      } else setToast(message);
    } finally {
      setBusy(false);
    }
  };

  const reviewMilestone = async (
    milestone: Milestone,
    action: "approve" | "reject",
  ) => {
    if (!address) return;
    setBusy(true);
    try {
      if (!publicClient) {
        throw new Error("Blockchain connection is unavailable.");
      }
      if (chainId !== getPawChainId()) {
        throw new Error(`Switch your wallet to PawChain ${getPawChainId()}.`);
      }

      const relatedCampaign = campaigns.find((campaign) =>
        campaign.campaign_milestones.some((item) => item.id === milestone.id),
      );
      if (
        !relatedCampaign?.contract_address ||
        !isAddress(relatedCampaign.contract_address) ||
        milestone.on_chain_index === null
      ) {
        throw new Error("This milestone is not linked to a contract.");
      }

      const txHash = await writeContractAsync({
        address: relatedCampaign.contract_address,
        abi: campaignContractAbi,
        functionName:
          action === "approve" ? "approveMilestone" : "rejectMilestone",
        args: [BigInt(milestone.on_chain_index)],
      });
      setBlockchainSuccess({
        status: "pending",
        title:
          action === "approve"
            ? "Approving milestone on-chain"
            : "Rejecting milestone on-chain",
        message:
          "The milestone review transaction was submitted and is waiting for Sepolia confirmation.",
        txHash,
      });
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });
      if (receipt.status !== "success") {
        throw new Error("Milestone review transaction failed.");
      }

      const response = await fetch("/api/admin/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          milestoneId: milestone.id,
          action,
          rejectionReason: milestoneReason.trim(),
          txHash,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Review failed.");
      setBlockchainSuccess({
        status: "confirmed",
        title:
          action === "approve"
            ? "Milestone approved successfully"
            : "Milestone rejected successfully",
        message:
          action === "approve"
            ? "The milestone review was confirmed by the smart contract."
            : "The milestone rejection was confirmed by the smart contract.",
        txHash,
      });
      setMilestoneCampaign((current) =>
        current
          ? {
              ...current,
              campaign_milestones: current.campaign_milestones.map((item) =>
                item.id === milestone.id
                  ? {
                      ...item,
                      status: action === "approve" ? "approved" : "rejected",
                      rejection_reason:
                        action === "approve" ? null : milestoneReason.trim(),
                    }
                  : item,
              ),
            }
          : null,
      );
      setMilestoneApproveTarget(null);
      setMilestoneRejectTarget(null);
      setMilestoneReason("");
      await load();
    } catch (reviewError) {
      const message =
        reviewError instanceof Error ? reviewError.message : "Review failed.";
      const cancelled = /reject|denied|cancel/i.test(message);
      setBlockchainSuccess({
        status: "failed",
        title: cancelled ? "Transaction cancelled" : "Milestone review failed",
        message: cancelled
          ? "You cancelled the request in MetaMask. The milestone was not changed."
          : message,
        txHash: "",
      });
    } finally {
      setBusy(false);
    }
  };

  const cancelActiveCampaign = async (campaign: Campaign) => {
    if (
      !address ||
      !campaign.contract_address ||
      !isAddress(campaign.contract_address)
    ) {
      setToast("Campaign contract is unavailable.");
      return;
    }
    if (!window.confirm("Cancel this campaign and enable refunds for all locked funds?")) {
      return;
    }

    setBusy(true);
    let confirmedTxHash = "";
    try {
      if (!publicClient) {
        throw new Error("Blockchain connection is unavailable.");
      }
      if (chainId !== getPawChainId()) {
        throw new Error(`Switch your wallet to PawChain ${getPawChainId()}.`);
      }
      const txHash = await writeContractAsync({
        address: campaign.contract_address,
        abi: campaignContractAbi,
        functionName: "cancelCampaign",
      });
      setBlockchainSuccess({
        status: "pending",
        title: "Cancelling campaign",
        message:
          "The transaction was submitted and is waiting for Sepolia confirmation. Keep this window open while the smart contract is processing.",
        txHash,
      });
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });
      if (receipt.status !== "success") {
        throw new Error("Campaign cancellation failed.");
      }
      confirmedTxHash = txHash;

      const response = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          campaignId: campaign.id,
          action: "cancel",
          txHash,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message ?? "Unable to record cancellation.");
      }

      setBlockchainSuccess({
        status: "confirmed",
        title: "Campaign cancelled successfully",
        message:
          "The smart contract is cancelled and its remaining locked funds are now available for donor refunds.",
        txHash,
      });
      await load();
    } catch (cancelError) {
      const message =
        cancelError instanceof Error
          ? cancelError.message
          : "Unable to cancel campaign.";
      if (confirmedTxHash) {
        setBlockchainSuccess({
          status: "confirmed",
          title: "Campaign cancelled on-chain",
          message:
            "Sepolia confirmed the cancellation, but PawChain could not save the database record. Your transaction remains successful; retry synchronization without sending another transaction.",
          txHash: confirmedTxHash,
        });
        return;
      }
      const cancelled = /reject|denied|cancelled the request/i.test(message);
      setBlockchainSuccess({
        status: "failed",
        title: cancelled
          ? "Transaction cancelled"
          : "Campaign cancellation failed",
        message: cancelled
          ? "You cancelled the request in MetaMask. The campaign remains active and no blockchain changes were made."
          : message,
        txHash: "",
      });
    } finally {
      setBusy(false);
    }
  };

  const finalizeExpiredCampaign = async (campaign: Campaign) => {
    if (
      !address ||
      !campaign.contract_address ||
      !isAddress(campaign.contract_address)
    ) {
      setToast("Campaign contract is unavailable.");
      return;
    }
    if (
      !window.confirm(
        "Finalize this expired underfunded campaign and enable refunds?",
      )
    ) {
      return;
    }

    setBusy(true);
    try {
      if (!publicClient) {
        throw new Error("Blockchain connection is unavailable.");
      }
      if (chainId !== getPawChainId()) {
        throw new Error(`Switch your wallet to PawChain ${getPawChainId()}.`);
      }
      const txHash = await writeContractAsync({
        address: campaign.contract_address,
        abi: campaignContractAbi,
        functionName: "finalizeExpired",
      });
      setBlockchainSuccess({
        status: "pending",
        title: "Finalizing expired campaign",
        message:
          "The expiry transaction was submitted and is waiting for Sepolia confirmation.",
        txHash,
      });
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });
      if (receipt.status !== "success") {
        throw new Error("Campaign expiry finalization failed.");
      }

      const response = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          campaignId: campaign.id,
          action: "finalize_expired",
          txHash,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message ?? "Unable to record campaign expiry.");
      }

      setBlockchainSuccess({
        status: "confirmed",
        title: "Expired campaign finalized",
        message:
          "The smart contract enabled refunds for the campaign's remaining locked funds.",
        txHash,
      });
      await load();
    } catch (finalizeError) {
      const message =
        finalizeError instanceof Error
          ? finalizeError.message
          : "Unable to finalize expired campaign.";
      const cancelled = /reject|denied|cancel/i.test(message);
      setBlockchainSuccess({
        status: "failed",
        title: cancelled
          ? "Transaction cancelled"
          : "Campaign finalization failed",
        message: cancelled
          ? "You cancelled the request in MetaMask. No blockchain changes were made."
          : message,
        txHash: "",
      });
    } finally {
      setBusy(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setUrgency("all");
    setStatus("all");
    setLocation("all");
    setSort("newest");
  };

  const hasFilters =
    Boolean(search.trim()) ||
    urgency !== "all" ||
    status !== "all" ||
    location !== "all" ||
    sort !== "newest";

  const milestoneSummary = milestoneCampaign
    ? milestoneCampaign.campaign_milestones.reduce(
        (summary, milestone) => {
          const percentage = Number(milestone.percentage) || 0;
          summary.planned += percentage;
          if (milestone.status === "approved") {
            summary.approved += percentage;
            summary.approvedCount += 1;
          }
          return summary;
        },
        { approved: 0, planned: 0, approvedCount: 0 },
      )
    : { approved: 0, planned: 0, approvedCount: 0 };

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
          <section
            className="group relative h-[22rem] overflow-hidden rounded-2xl bg-orange-50 text-white shadow-[0_16px_45px_rgba(28,25,23,0.16)] sm:h-72"
            aria-roledescription="carousel"
            aria-label="Campaign management highlights"
            tabIndex={0}
            onMouseEnter={() => setHeroPaused(true)}
            onMouseLeave={() => setHeroPaused(false)}
            onFocusCapture={() => setHeroPaused(true)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setHeroPaused(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                setHeroSlide((current) => (current - 1 + heroSlideCount) % heroSlideCount);
              } else if (event.key === "ArrowRight") {
                event.preventDefault();
                setHeroSlide((current) => (current + 1) % heroSlideCount);
              }
            }}
          >
            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[var(--color-orange)]/25 blur-3xl" />
            <div className="absolute bottom-0 right-1/3 h-32 w-32 rounded-full bg-amber-300/10 blur-2xl" />
            <div
              className={`relative flex h-full ${reduceMotion ? "" : "transition-transform duration-700 ease-out"}`}
              style={{ transform: `translateX(-${heroSlide * 100}%)` }}
            >
              <div className="relative flex h-full w-full shrink-0 items-center overflow-hidden bg-[linear-gradient(120deg,#fffaf3_0%,#ffedd5_55%,#fed7aa_100%)] px-5 pb-12 pt-5 text-stone-950 sm:px-12 sm:py-8">
                <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-orange-300/35 blur-3xl" />
                <div className="absolute -bottom-20 left-1/3 h-52 w-52 rounded-full bg-amber-200/45 blur-3xl" />
                <div className="relative grid w-full gap-5 xl:grid-cols-[1fr_auto] xl:items-center">
                  <div>
                    <div className="mb-2 flex items-center gap-2.5">
                      <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/80 text-[var(--color-orange)] shadow-sm ring-1 ring-orange-200">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true"><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/></svg>
                      </span>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-orange)]">Review workspace</p>
                    </div>
                    <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Campaign management</h1>
                    <p className="mt-1.5 max-w-2xl text-sm font-medium leading-5 text-stone-600">Review new fundraising requests, verify milestone evidence, and keep every shelter campaign accountable.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      ["Needs review", summary.pending, "text-orange-600"],
                      ["Proofs waiting", summary.proofs, "text-amber-600"],
                      ["Live", summary.approved, "text-emerald-600"],
                      ["All campaigns", summary.total, "text-stone-950"],
                    ].map(([label, value, color]) => (
                      <div key={label} className="relative min-w-24 rounded-xl bg-white/70 px-3 py-2.5 shadow-sm ring-1 ring-orange-100 backdrop-blur">
                        <p className={`text-xl font-black leading-none ${color}`}>{value}</p>
                        <p className="mt-1 text-[11px] font-semibold text-stone-500">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {latestCampaigns.map((campaign, index) => {
                const progress = campaignProgress(campaign);
                return (
                  <article key={campaign.id} className="relative h-full w-full shrink-0" aria-hidden={heroSlide !== index + 1}>
                    {campaign.image_url ? (
                      <img src={campaign.image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
                    ) : (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_30%,rgba(249,115,22,0.35),transparent_38%),linear-gradient(120deg,#1c1917,#292524)]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-stone-950/95 via-stone-950/70 to-stone-950/15" />
                    <div className="relative flex h-full max-w-4xl flex-col justify-center px-5 pb-14 pt-5 sm:px-12 sm:py-8">
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em]">
                        <span className="text-orange-300">Latest event {index + 1}</span>
                        <span className="text-stone-500">•</span>
                        <span className="text-stone-300">Submitted {date(campaign.created_at)}</span>
                      </div>
                      <h2 className="mt-2 line-clamp-2 text-2xl font-black sm:text-3xl">{campaign.title}</h2>
                      <p className="mt-1 text-sm font-semibold text-stone-300">{campaign.shelter_name || "Unknown shelter"} · {campaign.location || "Location not provided"}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <StatusBadge status={effectiveCampaignStatus(campaign)} />
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black capitalize ring-1 ring-white/15">{campaign.urgency_level} urgency</span>
                      </div>
                      <div className="mt-4 max-w-lg">
                        <div className="flex justify-between text-xs font-bold text-stone-300"><span>{weiAsEth(campaign.on_chain_total_raised_wei)} raised</span><span>{progress}% of {weiAsEth(campaign.on_chain_goal_wei ?? campaign.goal_wei)}</span></div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[var(--color-orange)]" style={{ width: `${progress}%` }} /></div>
                      </div>
                      <button type="button" onClick={() => setDetails(campaign)} className="mt-4 w-fit rounded-xl bg-white px-4 py-2 text-xs font-black text-stone-950 transition hover:bg-orange-100">View details →</button>
                    </div>
                  </article>
                );
              })}
            </div>
            {heroSlideCount > 1 ? (
              <>
                <button type="button" aria-label="Previous slide" onClick={() => setHeroSlide((current) => (current - 1 + heroSlideCount) % heroSlideCount)} className="absolute left-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-stone-950/55 text-xl ring-1 ring-white/20 backdrop-blur transition hover:bg-stone-950 sm:grid">‹</button>
                <button type="button" aria-label="Next slide" onClick={() => setHeroSlide((current) => (current + 1) % heroSlideCount)} className="absolute right-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-stone-950/55 text-xl ring-1 ring-white/20 backdrop-blur transition hover:bg-stone-950 sm:grid">›</button>
                <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2" aria-label="Choose carousel slide">
                  {Array.from({ length: heroSlideCount }, (_, index) => (
                    <button key={index} type="button" aria-label={`Go to slide ${index + 1}`} aria-current={heroSlide === index ? "true" : undefined} onClick={() => setHeroSlide(index)} className={`h-2 rounded-full transition-all ${heroSlide === index ? "w-7 bg-orange-300" : "w-2 bg-white/40 hover:bg-white/70"}`} />
                  ))}
                </div>
              </>
            ) : null}
          </section>
          {!isConnected ? (
            <div className="rounded-2xl bg-white p-10 text-center font-bold">
              Connect an admin wallet to continue.
            </div>
          ) : loading ? (
            <div className="grid animate-pulse gap-4 lg:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-96 rounded-2xl bg-white" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl bg-white p-8 text-center">
              <p className="font-black">{error}</p>
              <button
                onClick={() => void load()}
                className="mt-4 rounded-xl bg-stone-950 px-4 py-2 text-white"
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              <section className="overflow-hidden rounded-[1.75rem] border border-orange-100 bg-white p-4 shadow-[0_16px_50px_rgba(120,70,20,0.08)] sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div><p className="text-lg font-black">Find a campaign</p><p className="mt-1 text-xs font-medium text-stone-500">Search the review queue or narrow it by status and priority.</p></div>
                  {hasFilters ? <button type="button" onClick={clearFilters} className="rounded-xl px-3 py-2 text-xs font-black text-[var(--color-orange)] hover:bg-orange-50">Clear filters</button> : null}
                </div>
                <div className="mt-3 grid gap-2.5 xl:grid-cols-[1.4fr_repeat(4,0.7fr)]">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search title, shelter, description, location..."
                    className="h-9 rounded-lg border border-orange-100 bg-orange-50/30 px-3 text-xs font-medium outline-none transition focus:border-[var(--color-orange)] focus:bg-white focus:ring-2 focus:ring-orange-100"
                  />
                  <select
                    value={urgency}
                    onChange={(event) => setUrgency(event.target.value)}
                    className="h-9 rounded-lg border border-orange-100 bg-white px-2.5 text-xs font-semibold outline-none focus:border-[var(--color-orange)]"
                  >
                    <option value="all">All urgency</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                  </select>
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="h-9 rounded-lg border border-orange-100 bg-white px-2.5 text-xs font-semibold outline-none focus:border-[var(--color-orange)]"
                  >
                    <option value="all">All status</option>
                    <option value="pending_approval">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="closed">Closed</option>
                  </select>
                  <select
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    className="h-9 rounded-lg border border-orange-100 bg-white px-2.5 text-xs font-semibold outline-none focus:border-[var(--color-orange)]"
                  >
                    <option value="all">All locations</option>
                    {locations.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value)}
                    className="h-9 rounded-lg border border-orange-100 bg-white px-2.5 text-xs font-semibold outline-none focus:border-[var(--color-orange)]"
                  >
                    <option value="newest">Newest</option>
                    <option value="goal">Highest goal</option>
                    <option value="funded">Most funded</option>
                    <option value="urgency">Urgency</option>
                  </select>
                </div>
              <div className="mt-4 flex gap-2 overflow-x-auto rounded-2xl border border-orange-100 bg-orange-50/60 p-1.5">
                {tabs.map((item) => (
                  <button
                    key={item}
                    onClick={() => setTab(item)}
                    className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-black transition ${tab === item ? "bg-white text-[var(--color-orange)] shadow-sm ring-1 ring-orange-100" : "text-stone-500 hover:bg-white/60 hover:text-stone-900"}`}
                  >
                    {item}{" "}
                    <span className="ml-1 text-xs opacity-60">
                      {item === "All Campaigns"
                        ? summary.total
                        : item === "Pending Approval"
                          ? summary.pending
                          : item === "Approved"
                            ? summary.approved
                            : item === "Rejected"
                              ? summary.rejected
                              : item === "Completed"
                                ? summary.completed
                                : summary.closed}
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-5 border-t border-orange-100 pt-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div><p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">Campaign results</p><p className="mt-1 text-sm font-semibold text-stone-500">{filtered.length} {filtered.length === 1 ? "campaign" : "campaigns"} in this view</p></div>
                </div>
              {filtered.length ? (
                <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((campaign) => {
                    const progress = campaignProgress(campaign);
                    return (
                      <article
                        key={campaign.id}
                        className="group overflow-hidden rounded-[1.5rem] border border-orange-100 bg-[linear-gradient(180deg,#fff_0%,#fffdfa_100%)] p-3 shadow-[0_8px_28px_rgba(120,70,20,0.07)] transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_18px_45px_rgba(120,70,20,0.12)]"
                      >
                        <div className="relative h-36 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,var(--color-cream),var(--color-peach))]">
                          {campaign.image_url ? (
                            <img
                              src={campaign.image_url}
                              alt={campaign.title}
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                            />
                          ) : <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,.9),transparent_35%),radial-gradient(circle_at_85%_75%,rgba(255,138,0,.22),transparent_38%)]" />}
                          <div className="absolute left-3 top-3"><StatusBadge status={effectiveCampaignStatus(campaign)} /></div>
                          <span className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-black capitalize text-stone-800 shadow-sm backdrop-blur">{campaign.urgency_level}</span>
                        </div>
                        <div className="px-1.5 pb-1 pt-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h2 className="truncate text-lg font-black tracking-tight">
                                {campaign.title}
                              </h2>
                              <p className="mt-1 truncate text-sm font-semibold text-[var(--color-orange)]">
                                {campaign.shelter_name || campaign.shelter_id}
                              </p>
                            </div>
                            <span className="shrink-0 text-xs font-bold text-stone-400">{date(campaign.created_at)}</span>
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm leading-5 text-stone-600">
                            {campaign.description}
                          </p>
                          <div className="mt-3 flex justify-between text-xs font-semibold text-stone-500">
                            <span>{weiAsEth(campaign.on_chain_total_raised_wei)} raised</span>
                            <span>
                              {progress}% of {weiAsEth(campaign.on_chain_goal_wei ?? campaign.goal_wei)}
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-orange-100">
                            <div
                              className="h-full rounded-full bg-[var(--color-orange)]"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2 text-left">
                            <div className="rounded-xl bg-orange-50/60 p-2.5">
                              <p className="text-sm font-black">{campaign.duration_days}</p>
                              <p className="text-[10px] font-semibold text-stone-500">Days</p>
                            </div>
                            <div className="rounded-xl bg-orange-50/60 p-2.5">
                              <p className="text-sm font-black">{campaign.campaign_milestones?.length ?? 0}</p>
                              <p className="text-[10px] font-semibold text-stone-500">Milestones</p>
                            </div>
                            <div className="rounded-xl bg-orange-50/60 p-2.5">
                              <p className="truncate text-sm font-black">{campaign.location}</p>
                              <p className="text-[10px] font-semibold text-stone-500">Location</p>
                            </div>
                          </div>
                          {isApproved(campaign.campaign_status) ? (
                            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-orange-100 bg-orange-50/30 px-3 py-2 text-xs font-bold">
                              <span>
                                {
                                  campaign.campaign_milestones.filter(
                                    reviewableMilestone,
                                  ).length
                                }{" "}
                                proofs awaiting review
                              </span>
                              <span className="text-stone-400">·</span>
                              <span className="max-w-md truncate font-mono text-[10px] text-stone-500">
                                {campaign.contract_address ||
                                  "No campaign contract address"}
                              </span>
                            </div>
                          ) : null}
                          {campaign.campaign_status === "rejected" &&
                          campaign.rejection_reason ? (
                            <div className="mt-3 rounded-xl bg-orange-50 p-3 text-xs font-bold">
                              <span className="text-[var(--color-orange)]">
                                Rejected:
                              </span>{" "}
                              {campaign.rejection_reason}
                            </div>
                          ) : null}
                          <div className="mt-4 flex flex-wrap gap-2 border-t border-orange-100 pt-3">
                            <button
                              onClick={() => setDetails(campaign)}
                              className="min-w-28 flex-1 rounded-xl border border-orange-200 px-3 py-2.5 text-sm font-black transition hover:bg-orange-50"
                            >
                              View details
                            </button>
                            {campaign.campaign_status === "pending_approval" ? (
                              <>
                                <button
                                  disabled={busy}
                                  onClick={() => void review(campaign, "approve")}
                                  className="rounded-xl bg-[var(--color-orange)] px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-orange-600 disabled:opacity-50"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectTarget(campaign);
                                    setReason("");
                                  }}
                                  className="rounded-xl bg-stone-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-stone-800"
                                >
                                  Reject
                                </button>
                              </>
                            ) : null}
                            {isApproved(campaign.campaign_status) ? (
                              <>
                                <button
                                  onClick={() => setMilestoneCampaign(campaign)}
                                  className="rounded-xl bg-stone-950 px-4 py-2 text-sm font-semibold text-white"
                                >
                                  Milestone management
                                </button>
                                <button
                                  disabled={busy}
                                  onClick={() => void cancelActiveCampaign(campaign)}
                                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-black text-red-700 disabled:opacity-50"
                                >
                                  Cancel & refund
                                </button>
                                {campaign.blockchain_deadline &&
                                new Date(campaign.blockchain_deadline).getTime() <=
                                  Date.now() ? (
                                  <button
                                    disabled={busy}
                                    onClick={() =>
                                      void finalizeExpiredCampaign(campaign)
                                    }
                                    className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-black text-sky-700 disabled:opacity-50"
                                  >
                                    Finalize expiry
                                  </button>
                                ) : null}
                              </>
                            ) : null}
                          </div>
                          {false ? (
                            <div className="mt-4 space-y-3 border-t border-orange-100 pt-4">
                              {campaign.campaign_milestones.length ? (
                                campaign.campaign_milestones.map(
                                  (milestone, index) => {
                                    const links = proofLinks(
                                      milestone.proof_url,
                                    );
                                    return (
                                      <div
                                        key={milestone.id}
                                        className="rounded-xl border border-orange-100 bg-orange-50/20 p-4"
                                      >
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                          <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                              <span className="grid h-7 w-7 place-items-center rounded-lg bg-white text-xs font-black text-[var(--color-orange)] shadow-sm">
                                                {index + 1}
                                              </span>
                                              <h3 className="font-black">
                                                {milestone.title}
                                              </h3>
                                              <MilestoneBadge
                                                item={milestone}
                                              />
                                            </div>
                                            <p className="mt-2 text-sm font-bold text-stone-600">
                                              Requirement:{" "}
                                              {milestone.requirement}
                                            </p>
                                          </div>
                                          <p className="text-2xl font-black text-[var(--color-orange)]">
                                            {milestone.percentage}%
                                          </p>
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                          {links.length ? (
                                            links.map((link, linkIndex) => (
                                              <a
                                                key={`${link.url}-${linkIndex}`}
                                                href={link.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="rounded-xl bg-white px-3 py-2 text-xs font-black text-[var(--color-orange)] ring-1 ring-orange-100"
                                              >
                                                {link.name} ↗
                                              </a>
                                            ))
                                          ) : (
                                            <span className="rounded-xl bg-stone-100 px-3 py-2 text-xs font-bold text-stone-500">
                                              Waiting for shelter proof
                                            </span>
                                          )}
                                        </div>
                                        {milestone.status === "rejected" &&
                                        milestone.rejection_reason ? (
                                          <div className="mt-3 rounded-xl bg-orange-50 p-3 text-xs font-bold">
                                            <span className="text-[var(--color-orange)]">
                                              Rejected:
                                            </span>{" "}
                                            {milestone.rejection_reason}
                                          </div>
                                        ) : null}
                                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                          <p className="text-xs text-stone-400">
                                            Created {date(milestone.created_at)} ·
                                            Updated {date(milestone.updated_at)}
                                          </p>
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() =>
                                                setMilestoneDetails(milestone)
                                              }
                                              className="rounded-xl border border-orange-200 px-3 py-2 text-xs font-black"
                                            >
                                              Details
                                            </button>
                                            {reviewableMilestone(milestone) ? (
                                              <>
                                                <button
                                                  onClick={() =>
                                                    setMilestoneApproveTarget(
                                                      milestone,
                                                    )
                                                  }
                                                  className="rounded-xl bg-[var(--color-orange)] px-3 py-2 text-xs font-black text-white"
                                                >
                                                  Approve
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    setMilestoneRejectTarget(
                                                      milestone,
                                                    );
                                                    setMilestoneReason("");
                                                  }}
                                                  className="rounded-xl bg-stone-950 px-3 py-2 text-xs font-black text-white"
                                                >
                                                  Reject
                                                </button>
                                              </>
                                            ) : null}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  },
                                )
                              ) : (
                                <div className="rounded-xl border border-dashed border-orange-200 p-6 text-center text-sm font-bold text-stone-500">
                                  No milestones found for this campaign.
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </section>
              ) : (
                <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/30 p-10 text-center">
                  <h2 className="text-xl font-black">No campaigns found</h2>
                  <p className="mt-2 text-sm text-stone-600">
                    Adjust the filters or choose another tab.
                  </p>
                </div>
              )}
              </div>
              </section>
            </>
          )}
        </div>
      </main>
      {milestoneCampaign ? (
        <Modal
          title="Milestone management"
          close={() => setMilestoneCampaign(null)}
          wide
        >
          <div className="mt-5 border-b border-orange-100 pb-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-stone-400">
                  Approved fund releases
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-black tracking-tight text-[var(--color-orange)]">
                    {Math.min(100, milestoneSummary.approved)}%
                  </span>
                  <span className="text-sm font-bold text-stone-500">
                    of {milestoneSummary.planned}% planned
                  </span>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-lg font-black text-stone-950">
                  {milestoneSummary.approvedCount} / {milestoneCampaign.campaign_milestones.length}
                </p>
                <p className="text-xs font-semibold text-stone-500">
                  milestones approved
                </p>
              </div>
            </div>
            <div className="relative mt-4 h-3 overflow-hidden rounded-full bg-orange-100 ring-1 ring-orange-200/70">
              <div
                className="h-full rounded-full bg-[var(--color-orange)] transition-[width] duration-700 ease-out"
                style={{
                  width: `${Math.min(100, milestoneSummary.approved)}%`,
                }}
              />
              {milestoneCampaign.campaign_milestones
                .slice(0, -1)
                .map((milestone, index) => {
                  const position = milestoneCampaign.campaign_milestones
                    .slice(0, index + 1)
                    .reduce(
                      (total, item) => total + (Number(item.percentage) || 0),
                      0,
                    );
                  return (
                    <span
                      key={milestone.id}
                      className="absolute inset-y-0 w-px bg-white/90"
                      style={{ left: `${Math.min(100, position)}%` }}
                      aria-hidden="true"
                    />
                  );
                })}
            </div>
            <div className="mt-2 flex justify-between text-[10px] font-bold uppercase tracking-wider text-stone-400">
              <span>0%</span>
              <span>{milestoneCampaign.campaign_milestones.length} milestone stages</span>
              <span>100%</span>
            </div>
            <div className="mt-3">
              <TransactionLinks
                transactions={[
                  {
                    label: "Deployment tx",
                    hash: milestoneCampaign.deployment_tx_hash,
                  },
                ]}
              />
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {milestoneCampaign.campaign_milestones.length ? (
              milestoneCampaign.campaign_milestones.map((milestone, index) => {
                const links = proofLinks(milestone.proof_url);
                return (
                  <article key={milestone.id} className="rounded-2xl border border-orange-100 p-4 shadow-sm sm:p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="grid h-8 w-8 place-items-center rounded-xl bg-orange-50 text-xs font-black text-[var(--color-orange)]">{index + 1}</span>
                          <h4 className="font-black text-stone-950">{milestone.title}</h4>
                          <MilestoneBadge item={milestone} />
                        </div>
                        <p className="mt-3 text-sm leading-6 text-stone-600">{milestone.description}</p>
                        <p className="mt-2 text-xs font-bold text-stone-500">Requirement: {milestone.requirement}</p>
                      </div>
                      <div className="shrink-0 text-left md:text-right">
                        <p className="text-2xl font-black text-[var(--color-orange)]">{milestone.percentage}%</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Fund release</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-orange-50/50 p-3">
                      {links.length ? links.map((link, linkIndex) => (
                        <button
                          type="button"
                          key={`${link.url}-${linkIndex}`}
                          title={link.name}
                          onClick={() => setProofPreview(link)}
                          className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-black text-[var(--color-orange)] shadow-sm ring-1 ring-orange-100 transition hover:bg-orange-100"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>
                          View proof{links.length > 1 ? ` ${linkIndex + 1}` : ""}
                        </button>
                      )) : <span className="text-xs font-bold text-stone-500">No proof submitted yet</span>}
                    </div>

                    {milestone.rejection_reason ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">Previous rejection: {milestone.rejection_reason}</p> : null}
                    <div className="mt-3">
                      <TransactionLinks
                        proofTxHash={milestone.proof_tx_hash}
                        reviewTxHash={milestone.review_tx_hash}
                        releaseTxHash={milestone.release_tx_hash}
                      />
                    </div>

                    <div className="mt-4 flex flex-col gap-3 border-t border-orange-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-stone-400">Updated {date(milestone.updated_at)}</p>
                      <div className="flex flex-wrap gap-2">
                        {reviewableMilestone(milestone) ? (
                          <>
                            <button onClick={() => setMilestoneApproveTarget(milestone)} className="rounded-xl bg-[var(--color-orange)] px-4 py-2 text-xs font-black text-white hover:bg-orange-600">Approve proof</button>
                            <button onClick={() => { setMilestoneRejectTarget(milestone); setMilestoneReason(""); }} className="rounded-xl bg-stone-950 px-4 py-2 text-xs font-black text-white hover:bg-stone-800">Reject proof</button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-orange-200 p-8 text-center text-sm font-bold text-stone-500">No milestones found for this campaign.</div>
            )}
          </div>
        </Modal>
      ) : null}
      {details ? (
        <Modal title={details.title} close={() => setDetails(null)} wide>
          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            <div>
              {details.image_url ? (
                <img
                  src={details.image_url}
                  alt=""
                  className="h-52 w-full rounded-xl object-cover"
                />
              ) : (
                <div className="h-52 rounded-xl bg-[linear-gradient(135deg,var(--color-cream),var(--color-peach))]" />
              )}
              <p className="mt-4 text-sm leading-7 text-stone-600">
                {details.description}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Shelter", details.shelter_name || details.shelter_id],
                ["Location", details.location],
                ["On-chain goal", weiAsEth(details.on_chain_goal_wei ?? details.goal_wei)],
                ["Raised on-chain", weiAsEth(details.on_chain_total_raised_wei)],
                ["Urgency", details.urgency_level],
                ["Status", effectiveCampaignStatus(details)],
                ["Duration", `${details.duration_days} days`],
                ["Contract", details.contract_address || "Not deployed"],
                ...(details.cancelled_at
                  ? [["Cancelled", date(details.cancelled_at)]]
                  : []),
                ["Created", date(details.created_at)],
                ["Updated", date(details.updated_at)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-orange-50/50 p-3">
                  <p className="text-xs font-semibold text-stone-400">
                    {label}
                  </p>
                  <p className="mt-1 break-all text-sm font-bold">{value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <TransactionLinks
              transactions={[
                {
                  label: "Deployment tx",
                  hash: details.deployment_tx_hash,
                },
                {
                  label: "Cancellation tx",
                  hash: details.cancellation_tx_hash,
                },
              ]}
            />
          </div>
          {details.rejection_reason ? (
            <div className="mt-4 rounded-xl bg-orange-50 p-4 font-bold">
              <span className="text-[var(--color-orange)]">
                Rejection reason:
              </span>{" "}
              {details.rejection_reason}
            </div>
          ) : null}
          <h3 className="mt-6 text-xl font-black">Milestone plan</h3>
          <div className="mt-3 space-y-3">
            {details.campaign_milestones?.map((item, index) => (
              <div
                key={item.id}
                className="rounded-xl border border-orange-100 p-4"
              >
                <div className="flex justify-between gap-3">
                  <p className="font-black">
                    {index + 1}. {item.title}
                  </p>
                  <span className="text-sm font-black text-[var(--color-orange)]">
                    {item.percentage}% · {item.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-stone-600">
                  {item.description}
                </p>
                <p className="mt-2 text-xs font-bold">
                  Requirement: {item.requirement}
                </p>
                {item.rejection_reason ? (
                  <p className="mt-2 text-xs font-bold text-stone-600">
                    Rejected: {item.rejection_reason}
                  </p>
                ) : null}
                <p className="mt-2 text-[10px] text-stone-400">
                  Created {date(item.created_at)} · Updated{" "}
                  {date(item.updated_at)}
                </p>
              </div>
            ))}
          </div>
        </Modal>
      ) : null}
      {rejectTarget ? (
        <Modal
          title="Reject campaign"
          close={() => !busy && setRejectTarget(null)}
        >
          <p className="mt-3 text-sm font-bold text-stone-600">
            Explain what the shelter must revise before resubmitting.
          </p>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={5}
            className="mt-4 w-full rounded-xl border border-orange-100 p-4 outline-none"
            placeholder="Required rejection reason"
          />
          <div className="mt-5 flex justify-end gap-3">
            <button
              onClick={() => setRejectTarget(null)}
              className="px-4 py-2 font-black"
            >
              Cancel
            </button>
            <button
              disabled={busy || !reason.trim()}
              onClick={() => void review(rejectTarget, "reject")}
              className="rounded-full bg-stone-950 px-5 py-2.5 font-black text-white disabled:opacity-40"
            >
              {busy ? "Rejecting..." : "Reject campaign"}
            </button>
          </div>
        </Modal>
      ) : null}
      {milestoneDetails ? (
        <Modal
          title={milestoneDetails.title}
          close={() => setMilestoneDetails(null)}
        >
          <div className="mt-4 space-y-3">
            <div className="rounded-xl bg-orange-50/50 p-4">
              <p className="text-xs font-semibold text-stone-400">
                Description
              </p>
              <p className="mt-1 text-sm leading-6">
                {milestoneDetails.description}
              </p>
            </div>
            <div className="rounded-xl bg-orange-50/50 p-4">
              <p className="text-xs font-semibold text-stone-400">
                Requirement
              </p>
              <p className="mt-1 text-sm font-bold">
                {milestoneDetails.requirement}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Percentage", `${milestoneDetails.percentage}%`],
                ["Status", milestoneDetails.status],
                ["Created", date(milestoneDetails.created_at)],
                ["Updated", date(milestoneDetails.updated_at)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-stone-50 p-3">
                  <p className="text-xs text-stone-400">{label}</p>
                  <p className="font-bold">{value}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {proofLinks(milestoneDetails.proof_url).map((link, index) => (
                <button
                  type="button"
                  key={index}
                  onClick={() => setProofPreview(link)}
                  className="rounded-xl bg-orange-50 px-3 py-2 text-sm font-black text-[var(--color-orange)]"
                >
                  View {link.name}
                </button>
              ))}
            </div>
            <TransactionLinks
              proofTxHash={milestoneDetails.proof_tx_hash}
              reviewTxHash={milestoneDetails.review_tx_hash}
              releaseTxHash={milestoneDetails.release_tx_hash}
            />
            {milestoneDetails.rejection_reason ? (
              <div className="rounded-xl bg-orange-50 p-3 font-bold">
                Rejected: {milestoneDetails.rejection_reason}
              </div>
            ) : null}
          </div>
        </Modal>
      ) : null}
      {proofPreview ? (
        <Modal
          title={displayProofName(proofPreview.name)}
          close={() => setProofPreview(null)}
        >
          <div className="mt-4 overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
            {proofPreview.url.startsWith("data:application/pdf") ||
            proofPreview.name.toLowerCase().endsWith(".pdf") ? (
              <iframe
                src={proofPreview.url}
                title={`Proof preview: ${displayProofName(proofPreview.name)}`}
                className="h-[70vh] w-full bg-white"
              />
            ) : (
              <div className="grid min-h-80 place-items-center p-4">
                <img
                  src={proofPreview.url}
                  alt={`Milestone proof: ${displayProofName(proofPreview.name)}`}
                  className="max-h-[70vh] max-w-full rounded-lg object-contain shadow-sm"
                />
              </div>
            )}
          </div>
          <div className="mt-3 flex justify-end">
            <a
              href={proofPreview.url}
              download={displayProofName(proofPreview.name)}
              className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-bold text-stone-700 transition hover:bg-stone-50"
            >
              Download proof ↓
            </a>
          </div>
        </Modal>
      ) : null}
      {milestoneApproveTarget ? (
        <Modal
          title="Approve milestone"
          close={() => !busy && setMilestoneApproveTarget(null)}
        >
          <div className="mt-4 rounded-xl bg-orange-50 p-4">
            <p className="font-black">{milestoneApproveTarget.title}</p>
            <p className="mt-1 text-sm text-stone-600">
              Confirm that the submitted proof satisfies this milestone.
            </p>
          </div>
          <p className="mt-3 text-xs font-bold text-stone-500">
            Fund release remains off-chain until a release contract is
            configured.
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <button onClick={() => setMilestoneApproveTarget(null)}>
              Cancel
            </button>
            <button
              disabled={busy}
              onClick={() =>
                void reviewMilestone(milestoneApproveTarget, "approve")
              }
              className="rounded-full bg-[var(--color-orange)] px-5 py-2.5 font-black text-white disabled:opacity-50"
            >
              {busy ? "Approving..." : "Approve milestone"}
            </button>
          </div>
        </Modal>
      ) : null}
      {milestoneRejectTarget ? (
        <Modal
          title="Reject milestone"
          close={() => !busy && setMilestoneRejectTarget(null)}
        >
          <p className="mt-3 text-sm font-bold text-stone-600">
            Explain what proof the shelter must correct or resubmit.
          </p>
          <textarea
            value={milestoneReason}
            onChange={(event) => setMilestoneReason(event.target.value)}
            rows={5}
            placeholder="Required rejection reason"
            className="mt-4 w-full rounded-xl border border-orange-100 p-4 outline-none"
          />
          <div className="mt-5 flex justify-end gap-3">
            <button onClick={() => setMilestoneRejectTarget(null)}>
              Cancel
            </button>
            <button
              disabled={busy || !milestoneReason.trim()}
              onClick={() =>
                void reviewMilestone(milestoneRejectTarget, "reject")
              }
              className="rounded-full bg-stone-950 px-5 py-2.5 font-black text-white disabled:opacity-40"
            >
              {busy ? "Rejecting..." : "Reject milestone"}
            </button>
          </div>
        </Modal>
      ) : null}
      {toast ? (
        <div className="fixed bottom-6 right-6 z-[110] max-w-md rounded-2xl bg-stone-950 px-5 py-4 text-sm font-black text-white shadow-2xl">
          <p>{toast}</p>
        </div>
      ) : null}
      <BlockchainSuccessPopup
        open={Boolean(blockchainSuccess)}
        status={blockchainSuccess?.status ?? "confirmed"}
        title={blockchainSuccess?.title ?? ""}
        message={blockchainSuccess?.message ?? ""}
        txHash={blockchainSuccess?.txHash ?? ""}
        actionLabel="View transaction"
        onClose={() => setBlockchainSuccess(null)}
      />
    </>
  );
}
