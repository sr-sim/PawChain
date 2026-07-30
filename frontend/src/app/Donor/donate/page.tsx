"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import {
  useChainId,
  useBalance,
  usePublicClient,
  useReadContract,
  useReadContracts,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { formatEther, isAddress, parseEther } from "viem";
import { BlockchainSuccessPopup } from "@/app/components/BlockchainSuccessPopup";
import type { Campaign } from "../campaignData";
import { campaignContractAbi } from "@/lib/campaign-contract-abi";
import { getTransactionExplorerUrl } from "@/lib/block-explorer";
import { demoEthMyrRate, getPawChainId } from "@/lib/campaign-blockchain";

type DonorCampaign = Campaign & {
  imageUrl?: string | null;
  source?: "supabase";
  contractAddress?: string | null;
  goalWei?: string | null;
  ethMyrRate?: number;
  goalAmount?: number;
  currentAmount?: number;
};

const quickAmountsMyr = [25, 50, 100, 250];
const estimatedGasEth = 0.0002;

function CampaignImage({
  imageClass,
  imageUrl,
}: {
  imageClass: string;
  imageUrl?: string | null;
}) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className="h-16 w-full rounded-xl object-cover"
      />
    );
  }

  return (
    <div
      className={[
        "relative h-16 overflow-hidden rounded-xl bg-gradient-to-br",
        imageClass,
      ].join(" ")}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.95),transparent_30%),radial-gradient(circle_at_80%_70%,rgba(255,138,0,0.18),transparent_34%)]" />
    </div>
  );
}

function parseGoal(goal: string) {
  return Number(goal.replace(/[^0-9]/g, ""));
}

function formatEthText(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 ETH";
  }

  return `${value.toLocaleString("en-MY", {
    minimumFractionDigits: value < 0.0001 ? 8 : 4,
    maximumFractionDigits: value < 0.0001 ? 8 : 6,
  })} ETH`;
}

function formatMyr(value: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function parseEthInput(value: string) {
  try {
    return parseEther(value.trim());
  } catch {
    return null;
  }
}

function getMilestoneStatusLabel(status: number) {
  const labels = [
    "Locked",
    "Active",
    "Pending review",
    "Rejected",
    "Approved",
    "Withdrawable",
    "Released",
    "Completed",
  ];

  return labels[status] ?? "Unknown";
}

function getContractCampaignStatusLabel(status: number) {
  if (status === 0) return "Funding";
  if (status === 1) return "Completed";
  if (status === 2) return "Refunding";
  if (status === 3) return "Closed";
  return "Unknown";
}

type OnChainMilestone = {
  percentageBps: number;
  allocation: bigint;
  cumulativeThreshold: bigint;
  status: number;
  proofCID: string;
};

function normalizeOnChainMilestone(value: unknown): OnChainMilestone | null {
  if (!value) {
    return null;
  }

  const named = value as Partial<OnChainMilestone>;
  if (
    typeof named.allocation === "bigint" &&
    typeof named.cumulativeThreshold === "bigint"
  ) {
    return {
      percentageBps: Number(named.percentageBps ?? 0),
      allocation: named.allocation,
      cumulativeThreshold: named.cumulativeThreshold,
      status: Number(named.status ?? 0),
      proofCID: String(named.proofCID ?? ""),
    };
  }

  const indexed = value as readonly unknown[];
  if (
    Array.isArray(indexed) &&
    typeof indexed[1] === "bigint" &&
    typeof indexed[2] === "bigint"
  ) {
    return {
      percentageBps: Number(indexed[0] ?? 0),
      allocation: indexed[1],
      cumulativeThreshold: indexed[2],
      status: Number(indexed[3] ?? 0),
      proofCID: String(indexed[4] ?? ""),
    };
  }

  return null;
}

function clampPercentage(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
}

function getMilestoneGateMessage(status: string, title: string) {
  if (status === "Withdrawable") {
    return `${title} is fully funded. Waiting for the shelter to withdraw the milestone funds before proof can be submitted.`;
  }

  if (status === "Released") {
    return `${title} funds were released. Waiting for the shelter to upload proof before the next milestone opens.`;
  }

  if (status === "Pending review") {
    return `${title} proof is under admin review. Donations reopen after approval moves the campaign to the next milestone.`;
  }

  if (status === "Rejected") {
    return `${title} proof was rejected. Waiting for the shelter to submit revised proof.`;
  }

  if (status === "Completed") {
    return `${title} is completed. Waiting for the next milestone to activate on-chain.`;
  }

  if (status === "Locked") {
    return `${title} is locked until earlier milestones are completed.`;
  }

  return `${title} is not accepting donations right now.`;
}

function getMilestoneAmount(goalAmount: number, percentage: number) {
  const releasePercentage = Number(percentage);

  if (
    !Number.isFinite(goalAmount) ||
    !Number.isFinite(releasePercentage) ||
    goalAmount <= 0
  ) {
    return 0;
  }

  return (goalAmount * releasePercentage) / 100;
}

function getCurrentMilestoneStage(
  milestones: { title: string; percentage: number }[],
  goalAmount: number,
  currentAmount: number,
) {
  if (!milestones.length || goalAmount <= 0) {
    return null;
  }

  let cumulativePercentage = 0;

  for (let index = 0; index < milestones.length; index += 1) {
    const milestone = milestones[index];
    cumulativePercentage += Number(milestone.percentage || 0);
    const cumulativeTarget = getMilestoneAmount(
      goalAmount,
      cumulativePercentage,
    );

    if (currentAmount < cumulativeTarget) {
      const stageAmount = getMilestoneAmount(goalAmount, milestone.percentage);

      return {
        index,
        milestone,
        stageAmount,
        cumulativeTarget,
        remainingAmount: Math.max(0, cumulativeTarget - currentAmount),
        cumulativePercentage,
      };
    }
  }

  return null;
}

function EthIcon() {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-950 text-white shadow-sm ring-1 ring-slate-200">
      <svg viewBox="0 0 256 417" className="h-5 w-5" aria-hidden="true">
        <path fill="#ffffff" d="M127.9 0 125.1 9.5v275.3l2.8 2.8 127.9-75.6z" />
        <path fill="#d6d6d6" d="M127.9 0 0 212l127.9 75.6V154.1z" />
        <path fill="#ffffff" d="m127.9 311.8-1.6 2v98.1l1.6 4.7 128-180.3z" />
        <path fill="#d6d6d6" d="M127.9 416.6v-104.8L0 236.3z" />
        <path fill="#f3f3f3" d="m127.9 287.6 127.9-75.6-127.9-57.9z" />
        <path fill="#bdbdbd" d="M0 212l127.9 75.6V154.1z" />
      </svg>
    </span>
  );
}

export default function DonorDonatePage() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletBalance } = useBalance({
    address:
      address && isAddress(address) ? (address as `0x${string}`) : undefined,
    query: { enabled: Boolean(address && isAddress(address)) },
  });
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const searchParams = useSearchParams();
  const initialCampaign = searchParams.get("campaign");
  const walletAddress = searchParams.get("walletAddress") ?? "";
  const [campaigns, setCampaigns] = useState<DonorCampaign[]>([]);
  const [campaignLoadError, setCampaignLoadError] = useState("");
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);
  const [selectedId, setSelectedId] = useState(initialCampaign ?? "");
  const [amount, setAmount] = useState("0.0125");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [donationError, setDonationError] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [confirmedDonationId, setConfirmedDonationId] = useState("");
  const [blockchainPopup, setBlockchainPopup] = useState<{
    status: "pending" | "confirmed" | "failed";
    title: string;
    message: string;
    txHash: string;
  } | null>(null);
  const [liveEthMyrRate, setLiveEthMyrRate] = useState<number | null>(null);
  const [rateSource, setRateSource] = useState<
    "coingecko" | "fallback" | "campaign"
  >("campaign");
  const [rateUpdatedAt, setRateUpdatedAt] = useState("");
  const [rateLoadError, setRateLoadError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadCampaigns() {
      setIsLoadingCampaigns(true);
      setCampaignLoadError("");

      try {
        const response = await fetch("/api/donor/campaigns", {
          cache: "no-store",
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message ?? "Unable to load campaigns.");
        }

        if (!isMounted) {
          return;
        }

        const liveCampaigns = Array.isArray(result.campaigns)
          ? (result.campaigns as DonorCampaign[])
          : [];
        const donationCampaigns = liveCampaigns.filter(
          (campaign) =>
            campaign.status === "Active" &&
            campaign.daysLeft > 0 &&
            Boolean(campaign.contractAddress),
        );

        setCampaigns(donationCampaigns);
        setSelectedId((current) =>
          donationCampaigns.some((campaign) => campaign.id === current)
            ? current
            : (donationCampaigns[0]?.id ?? ""),
        );
      } catch (error) {
        if (isMounted) {
          setCampaigns([]);
          setCampaignLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load active campaigns.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingCampaigns(false);
        }
      }
    }

    loadCampaigns();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadEthMyrRate() {
      try {
        const response = await fetch("/api/currency/eth-myr", {
          cache: "no-store",
        });
        const result = await response.json();
        const rate = Number(result.rate);

        if (!response.ok || !Number.isFinite(rate) || rate <= 0) {
          throw new Error(result.message ?? "Unable to load ETH/MYR rate.");
        }

        if (!isMounted) {
          return;
        }

        setLiveEthMyrRate(rate);
        setRateSource(result.source === "coingecko" ? "coingecko" : "fallback");
        setRateUpdatedAt(String(result.updatedAt ?? ""));
        setRateLoadError(
          result.source === "fallback" ? String(result.message ?? "") : "",
        );
      } catch (error) {
        if (isMounted) {
          setLiveEthMyrRate(null);
          setRateSource("campaign");
          setRateUpdatedAt("");
          setRateLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load ETH/MYR rate.",
          );
        }
      }
    }

    loadEthMyrRate();

    return () => {
      isMounted = false;
    };
  }, []);

  const allCampaignReadContracts = campaigns.flatMap((campaign) => {
    const contractAddress =
      campaign.contractAddress && isAddress(campaign.contractAddress)
        ? (campaign.contractAddress as `0x${string}`)
        : null;

    return contractAddress
      ? [
          {
            address: contractAddress,
            abi: campaignContractAbi,
            functionName: "campaignStatus",
            chainId: getPawChainId(),
          },
          {
            address: contractAddress,
            abi: campaignContractAbi,
            functionName: "totalRaised",
            chainId: getPawChainId(),
          },
          {
            address: contractAddress,
            abi: campaignContractAbi,
            functionName: "currentMilestoneIndex",
            chainId: getPawChainId(),
          },
        ]
      : [];
  });
  const { data: allCampaignReads, isLoading: isLoadingAllCampaignReads } =
    useReadContracts({
      contracts: allCampaignReadContracts,
      query: {
        enabled: allCampaignReadContracts.length > 0,
        refetchInterval: 10_000,
      },
    });
  const milestoneReadTargets = campaigns
    .map((campaign, index) => {
      const contractAddress =
        campaign.contractAddress && isAddress(campaign.contractAddress)
          ? (campaign.contractAddress as `0x${string}`)
          : null;
      const currentIndexResult = allCampaignReads?.[index * 3 + 2];
      const currentIndex =
        currentIndexResult?.status === "success"
          ? Number(currentIndexResult.result)
          : null;

      return contractAddress && currentIndex !== null
        ? {
            campaignId: campaign.id,
            contract: {
              address: contractAddress,
              abi: campaignContractAbi,
              functionName: "getMilestone",
              args: [BigInt(currentIndex)],
              chainId: getPawChainId(),
            },
          }
        : null;
    })
    .filter(Boolean) as {
    campaignId: string;
    contract: {
      address: `0x${string}`;
      abi: typeof campaignContractAbi;
      functionName: "getMilestone";
      args: [bigint];
      chainId: number;
    };
  }[];
  const { data: allMilestoneReads, isLoading: isLoadingAllMilestoneReads } =
    useReadContracts({
      contracts: milestoneReadTargets.map((target) => target.contract),
      query: {
        enabled: milestoneReadTargets.length > 0,
        refetchInterval: 10_000,
      },
    });
  const campaignFundingSnapshots = new Map<
    string,
    {
      canAccept: boolean;
      campaignStatus: string;
      milestoneStatus: string;
      remainingEth: number;
      progress: number;
    }
  >();

  campaigns.forEach((campaign, index) => {
    const statusResult = allCampaignReads?.[index * 3];
    const totalRaisedResult = allCampaignReads?.[index * 3 + 1];
    const milestoneReadIndex = milestoneReadTargets.findIndex(
      (target) => target.campaignId === campaign.id,
    );
    const milestoneResult =
      milestoneReadIndex >= 0 ? allMilestoneReads?.[milestoneReadIndex] : null;

    if (
      statusResult?.status !== "success" ||
      totalRaisedResult?.status !== "success" ||
      milestoneResult?.status !== "success"
    ) {
      return;
    }

    const contractStatus = getContractCampaignStatusLabel(
      Number(statusResult.result),
    );
    const totalRaisedWei = totalRaisedResult.result as bigint;
    const milestone = normalizeOnChainMilestone(milestoneResult.result);

    if (!milestone) {
      return;
    }

    const remainingWei =
      milestone.cumulativeThreshold > totalRaisedWei
        ? milestone.cumulativeThreshold - totalRaisedWei
        : BigInt(0);
    const raisedInStageWei =
      milestone.allocation > remainingWei
        ? milestone.allocation - remainingWei
        : BigInt(0);
    const milestoneStatus = getMilestoneStatusLabel(milestone.status);
    const remainingEth = Number(formatEther(remainingWei));

    campaignFundingSnapshots.set(campaign.id, {
      canAccept:
        contractStatus === "Funding" &&
        milestoneStatus === "Active" &&
        remainingWei > BigInt(0),
      campaignStatus: contractStatus,
      milestoneStatus,
      remainingEth,
      progress:
        milestone.allocation > BigInt(0)
          ? clampPercentage(
              (Number(raisedInStageWei) / Number(milestone.allocation)) * 100,
            )
          : 0,
    });
  });

  const donationReadyCampaigns = campaigns.filter((campaign) => {
    const snapshot = campaignFundingSnapshots.get(campaign.id);

    if (snapshot) {
      return snapshot.canAccept;
    }

    if (isLoadingAllCampaignReads || isLoadingAllMilestoneReads) {
      return campaign.status === "Active";
    }

    const goalAmount = campaign.goalAmount ?? parseGoal(campaign.goal);
    const currentAmount =
      campaign.currentAmount ?? (goalAmount * campaign.raised) / 100;
    const fallbackStage = getCurrentMilestoneStage(
      campaign.milestones,
      goalAmount,
      currentAmount,
    );

    return campaign.status === "Active" && Boolean(fallbackStage);
  });
  const selectedCampaign =
    donationReadyCampaigns.find((campaign) => campaign.id === selectedId) ??
    donationReadyCampaigns[0];
  const selectedContractAddress =
    selectedCampaign?.contractAddress &&
    isAddress(selectedCampaign.contractAddress)
      ? (selectedCampaign.contractAddress as `0x${string}`)
      : undefined;
  const { data: onChainBaseReads, isLoading: isLoadingOnChainBase } =
    useReadContracts({
      contracts: selectedContractAddress
        ? [
            {
              address: selectedContractAddress,
              abi: campaignContractAbi,
              functionName: "goal",
              chainId: getPawChainId(),
            },
            {
              address: selectedContractAddress,
              abi: campaignContractAbi,
              functionName: "totalRaised",
              chainId: getPawChainId(),
            },
            {
              address: selectedContractAddress,
              abi: campaignContractAbi,
              functionName: "currentMilestoneIndex",
              chainId: getPawChainId(),
            },
          ]
        : [],
      query: {
        enabled: Boolean(selectedContractAddress),
        refetchInterval: 10_000,
      },
    });
  const onChainGoalWei =
    onChainBaseReads?.[0]?.status === "success"
      ? (onChainBaseReads[0].result as bigint)
      : null;
  const onChainTotalRaisedWei =
    onChainBaseReads?.[1]?.status === "success"
      ? (onChainBaseReads[1].result as bigint)
      : null;
  const onChainCurrentMilestoneIndex =
    onChainBaseReads?.[2]?.status === "success"
      ? Number(onChainBaseReads[2].result)
      : null;
  const { data: onChainMilestone, isLoading: isLoadingOnChainMilestone } =
    useReadContract({
      address: selectedContractAddress,
      abi: campaignContractAbi,
      functionName: "getMilestone",
      args:
        onChainCurrentMilestoneIndex !== null
          ? [BigInt(onChainCurrentMilestoneIndex)]
          : undefined,
      chainId: getPawChainId(),
      query: {
        enabled:
          Boolean(selectedContractAddress) &&
          onChainCurrentMilestoneIndex !== null,
        refetchInterval: 10_000,
      },
    });
  const hasOnChainMilestoneData =
    onChainGoalWei !== null &&
    onChainTotalRaisedWei !== null &&
    Boolean(onChainMilestone);

  const ethToMyrRate =
    liveEthMyrRate ?? selectedCampaign?.ethMyrRate ?? demoEthMyrRate;
  const rateLabel =
    rateSource === "coingecko"
      ? "Live rate"
      : rateSource === "fallback"
        ? "Estimated rate"
        : "Campaign rate";
  const rateTimestamp = rateUpdatedAt
    ? new Intl.DateTimeFormat("en-MY", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(rateUpdatedAt))
    : "";
  const trimmedAmount = amount.trim();
  const parsedAmount = Number(trimmedAmount);
  const hasInvalidAmount =
    trimmedAmount.length === 0 ||
    !Number.isFinite(parsedAmount) ||
    parsedAmount <= 0;
  const numericAmount = hasInvalidAmount ? 0 : parsedAmount;
  const myrEstimate = numericAmount * ethToMyrRate;
  const walletBalanceEth = walletBalance
    ? Number(formatEther(walletBalance.value))
    : null;
  const walletBalanceMyr =
    walletBalanceEth !== null && Number.isFinite(walletBalanceEth)
      ? walletBalanceEth * ethToMyrRate
      : null;
  const goalAmount = selectedCampaign ? parseGoal(selectedCampaign.goal) : 0;
  const selectedGoalAmount = selectedCampaign?.goalAmount ?? goalAmount;
  const currentRaisedAmount =
    selectedCampaign?.currentAmount ??
    (selectedCampaign
      ? (selectedGoalAmount * selectedCampaign.raised) / 100
      : 0);
  const fallbackStage = selectedCampaign
    ? getCurrentMilestoneStage(
        selectedCampaign.milestones,
        selectedGoalAmount,
        currentRaisedAmount,
      )
    : null;
  const onChainStage = normalizeOnChainMilestone(onChainMilestone);
  const onChainRemainingWei =
    hasOnChainMilestoneData && onChainStage && onChainTotalRaisedWei !== null
      ? onChainStage.cumulativeThreshold > onChainTotalRaisedWei
        ? onChainStage.cumulativeThreshold - onChainTotalRaisedWei
        : BigInt(0)
      : null;
  const onChainStageRaisedWei =
    hasOnChainMilestoneData && onChainStage && onChainRemainingWei !== null
      ? onChainStage.allocation > onChainRemainingWei
        ? onChainStage.allocation - onChainRemainingWei
        : BigInt(0)
      : null;
  const onChainStageProgress =
    onChainStage &&
    onChainStage.allocation > BigInt(0) &&
    onChainStageRaisedWei !== null
      ? clampPercentage(
          (Number(onChainStageRaisedWei) / Number(onChainStage.allocation)) *
            100,
        )
      : 0;
  const onChainCurrentMilestone =
    onChainCurrentMilestoneIndex !== null
      ? {
          title:
            selectedCampaign?.milestones[onChainCurrentMilestoneIndex]?.title ??
            `Milestone ${onChainCurrentMilestoneIndex + 1}`,
          percentage: onChainStage
            ? onChainStage.percentageBps / 100
            : (selectedCampaign?.milestones[onChainCurrentMilestoneIndex]
                ?.percentage ?? 0),
        }
      : null;
  const currentStage = hasOnChainMilestoneData
    ? {
        index: onChainCurrentMilestoneIndex ?? 0,
        milestone: onChainCurrentMilestone,
        remainingAmount:
          Number(formatEther(onChainRemainingWei ?? BigInt(0))) * ethToMyrRate,
        remainingWei: onChainRemainingWei ?? BigInt(0),
        stageAmount:
          Number(formatEther(onChainStage?.allocation ?? BigInt(0))) *
          ethToMyrRate,
        stageAmountEth: Number(
          formatEther(onChainStage?.allocation ?? BigInt(0)),
        ),
        cumulativeTarget:
          Number(formatEther(onChainStage?.cumulativeThreshold ?? BigInt(0))) *
          ethToMyrRate,
        cumulativeTargetEth: Number(
          formatEther(onChainStage?.cumulativeThreshold ?? BigInt(0)),
        ),
        status: getMilestoneStatusLabel(onChainStage?.status ?? 0),
        progress: onChainStageProgress,
        source: "On-chain",
      }
    : fallbackStage
      ? {
          ...fallbackStage,
          remainingWei: null,
          stageAmountEth: fallbackStage.stageAmount / ethToMyrRate,
          cumulativeTargetEth: fallbackStage.cumulativeTarget / ethToMyrRate,
          status: "Campaign data",
          progress: clampPercentage(
            ((fallbackStage.stageAmount - fallbackStage.remainingAmount) /
              fallbackStage.stageAmount) *
              100,
          ),
          source: "Campaign data",
        }
      : null;
  const nextMilestone =
    currentStage?.milestone ?? selectedCampaign?.milestones[0];
  const currentStageRemaining = currentStage?.remainingAmount ?? 0;
  const currentStageEth =
    currentStage?.remainingWei !== null &&
    currentStage?.remainingWei !== undefined
      ? Number(formatEther(currentStage.remainingWei))
      : currentStageRemaining / ethToMyrRate;
  const currentStageEthInput =
    currentStage?.remainingWei !== null &&
    currentStage?.remainingWei !== undefined
      ? formatEther(currentStage.remainingWei)
      : currentStageEth.toFixed(6);
  const currentStageEthDisplay = formatEthText(currentStageEth);
  const donationEthDisplay = formatEthText(numericAmount);
  const isOpenForFunding =
    Boolean(currentStage) &&
    currentStageRemaining > 0 &&
    (!hasOnChainMilestoneData ||
      currentStage?.status === "Active" ||
      currentStage?.status === "Approved");
  const milestoneStatusSimple = currentStage
    ? isOpenForFunding
      ? "Open for funding"
      : currentStage.status === "Withdrawable"
        ? "Waiting for shelter withdrawal"
        : currentStage.status === "Released"
          ? "Released - awaiting proof"
          : currentStage.status === "Pending review"
            ? "Under review"
            : currentStage.status
    : "No active stage";
  const milestoneGateMessage = currentStage
    ? currentStageRemaining <= 0
      ? getMilestoneGateMessage(
          currentStage.status,
          nextMilestone?.title ?? "This milestone",
        )
      : !isOpenForFunding
        ? getMilestoneGateMessage(
            currentStage.status,
            nextMilestone?.title ?? "This milestone",
          )
        : ""
    : "This campaign has reached all milestone targets.";
  const parsedDonationWei = hasInvalidAmount
    ? null
    : parseEthInput(trimmedAmount);
  const exceedsCurrentStage =
    !hasInvalidAmount &&
    Boolean(currentStage) &&
    (currentStage?.remainingWei !== null &&
    currentStage?.remainingWei !== undefined
      ? parsedDonationWei !== null &&
        parsedDonationWei > currentStage.remainingWei
      : myrEstimate > currentStageRemaining + 0.01);
  const stageLimitMessage = currentStage
    ? currentStageRemaining <= 0
      ? milestoneGateMessage
      : `This milestone stage only needs ${currentStageEthDisplay} more. Please donate within the current stage before the next milestone unlocks.`
    : "This campaign has reached all milestone targets.";
  const requiredTotalEth = numericAmount + estimatedGasEth;
  const requiredTotalEthDisplay = formatEthText(requiredTotalEth);
  const estimatedGasMyr = estimatedGasEth * ethToMyrRate;
  const requiredTotalMyr = requiredTotalEth * ethToMyrRate;
  const connectedWallet = address ?? walletAddress;
  const shortWallet = connectedWallet
    ? `${connectedWallet.slice(0, 6)}...${connectedWallet.slice(-4)}`
    : "Not connected";
  const shortTxHash = transactionHash
    ? `${transactionHash.slice(0, 10)}...${transactionHash.slice(-8)}`
    : "";
  const explorerUrl = transactionHash
    ? getTransactionExplorerUrl(transactionHash)
    : "";
  const receiptHref = confirmedDonationId
    ? `/Donor/receipt/${confirmedDonationId}?walletAddress=${encodeURIComponent(connectedWallet)}`
    : `/Donor/tracking?walletAddress=${encodeURIComponent(connectedWallet)}`;

  async function handleDonate() {
    setDonationError("");
    setTransactionHash("");
    setConfirmedDonationId("");

    if (!isConnected || !address) {
      open();
      return;
    }

    if (hasInvalidAmount) {
      setDonationError("Please enter a valid ETH amount greater than 0.");
      return;
    }

    if (!selectedCampaign) {
      setDonationError("Please select an active campaign first.");
      return;
    }

    if (!currentStage) {
      setDonationError(
        "This campaign has reached all milestone funding stages.",
      );
      return;
    }

    if (!isOpenForFunding) {
      setDonationError(milestoneGateMessage);
      return;
    }

    if (exceedsCurrentStage) {
      setDonationError(stageLimitMessage);
      return;
    }

    if (chainId !== getPawChainId()) {
      try {
        await switchChainAsync({ chainId: getPawChainId() });
        setDonationError(
          "Network switched successfully. Please click Donate again.",
        );
      } catch {
        setDonationError(
          `Switch your wallet to PawChain ${getPawChainId()}. Detected chain: ${chainId ?? "not connected"}.`,
        );
      }
      return;
    }

    if (!publicClient) {
      setDonationError(
        "Blockchain connection is unavailable. Reconnect your wallet and try again.",
      );
      return;
    }

    if (
      !selectedCampaign.contractAddress ||
      !isAddress(selectedCampaign.contractAddress)
    ) {
      setDonationError(
        "This campaign is not linked to an on-chain contract yet.",
      );
      return;
    }

    let donationValue: bigint;
    try {
      donationValue = parseEther(trimmedAmount);
    } catch {
      setDonationError("Please enter a valid ETH amount, for example 0.01.");
      return;
    }

    setIsProcessing(true);
    try {
      const txHash = await writeContractAsync({
        address: selectedCampaign.contractAddress as `0x${string}`,
        abi: campaignContractAbi,
        functionName: "donate",
        value: donationValue,
      });
      setBlockchainPopup({
        status: "pending",
        title: "Donation submitted",
        message:
          "Your wallet approved the transaction. PawChain is waiting for blockchain confirmation.",
        txHash,
      });
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      if (receipt.status !== "success") {
        throw new Error("Donation transaction failed.");
      }

      const response = await fetch("/api/donor/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          campaignId: selectedCampaign.id,
          txHash,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Unable to save donation record.");
      }

      setTransactionHash(txHash);
      setConfirmedDonationId(result.donation?.id ?? "");
      setIsSubmitted(true);
      setBlockchainPopup({
        status: "confirmed",
        title: "Donation confirmed",
        message:
          "Your ETH donation is confirmed on-chain and saved into your donation history.",
        txHash,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to confirm donation.";
      setDonationError(message);
      setBlockchainPopup({
        status: "failed",
        title: "Donation not completed",
        message,
        txHash: transactionHash,
      });
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="donor-tech-hero rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
              Donation
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-stone-950 sm:text-3xl">
              Donate with ETH.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Select a campaign, enter ETH, and confirm the on-chain transaction
              in your wallet.
            </p>
          </div>
          <Link
            href="/Donor/discover"
            className="inline-flex w-fit items-center justify-center rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-900 transition hover:border-[var(--color-orange)] hover:bg-orange-50"
          >
            Browse campaigns
          </Link>
        </div>
      </section>

      <BlockchainSuccessPopup
        open={Boolean(blockchainPopup)}
        status={blockchainPopup?.status ?? "confirmed"}
        title={blockchainPopup?.title ?? ""}
        message={blockchainPopup?.message ?? ""}
        txHash={blockchainPopup?.txHash ?? ""}
        actionLabel="View transaction"
        onClose={() => setBlockchainPopup(null)}
      />

      <section className="grid items-start gap-5 xl:grid-cols-[1.18fr_0.82fr]">
        <div className="donor-donate-card h-fit rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
                Campaign
              </p>
              <h2 className="mt-1 text-xl font-black text-stone-950">
                Choose campaign
              </h2>
            </div>
            <p className="text-sm font-medium text-stone-500">
              {isLoadingCampaigns
                ? "Loading..."
                : `${donationReadyCampaigns.length} open campaigns`}
            </p>
          </div>

          <div className="mt-4 h-[42rem] max-h-[calc(100vh-10rem)] space-y-2 overflow-y-auto rounded-xl pr-1">
            {isLoadingCampaigns ? (
              <div className="rounded-xl border border-orange-100 bg-orange-50/30 p-5 text-center">
                <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-orange-100 border-t-[var(--color-orange)]" />
                <p className="mt-3 text-sm font-semibold text-stone-600">
                  Loading active campaigns...
                </p>
              </div>
            ) : campaignLoadError ? (
              <div className="rounded-xl border border-red-100 bg-red-50 p-5 text-center">
                <p className="text-sm font-black text-red-800">
                  Unable to load campaigns
                </p>
                <p className="mt-2 text-sm leading-6 text-red-700">
                  {campaignLoadError}
                </p>
              </div>
            ) : donationReadyCampaigns.length > 0 ? (
              donationReadyCampaigns.map((campaign) => {
                const selectorGoalAmount =
                  campaign.goalAmount ?? parseGoal(campaign.goal);
                const selectorCurrentAmount =
                  campaign.currentAmount ??
                  (selectorGoalAmount * campaign.raised) / 100;
                const fallbackSelectorStage = getCurrentMilestoneStage(
                  campaign.milestones,
                  selectorGoalAmount,
                  selectorCurrentAmount,
                );
                const selectorStage =
                  campaign.id === selectedCampaign?.id && currentStage
                    ? currentStage
                    : fallbackSelectorStage;
                const selectorMilestone = selectorStage?.milestone ?? {
                  title: "Current milestone",
                  percentage: 0,
                };
                const selectorRemainingEth =
                  selectorStage && ethToMyrRate > 0
                    ? selectorStage.remainingAmount / ethToMyrRate
                    : 0;
                const selectorStageProgress =
                  selectorStage && selectorStage.cumulativeTarget > 0
                    ? ((selectorStage.cumulativeTarget -
                        selectorStage.remainingAmount) /
                        selectorStage.cumulativeTarget) *
                      100
                    : 0;
                const fundingSnapshot = campaignFundingSnapshots.get(campaign.id);
                const selectorCanAccept = fundingSnapshot
                  ? fundingSnapshot.canAccept
                  : selectorStage
                    ? selectorStage.remainingAmount > 0
                    : false;
                const selectorDisplayProgress =
                  fundingSnapshot?.progress ?? selectorStageProgress;
                const selectorDisplayRemainingEth =
                  fundingSnapshot?.remainingEth ?? selectorRemainingEth;
                const selectorDisplayRemainingMyr =
                  fundingSnapshot?.remainingEth !== undefined
                    ? fundingSnapshot.remainingEth * ethToMyrRate
                    : (selectorStage?.remainingAmount ?? 0);
                const selectorDisplayStatus =
                  fundingSnapshot?.milestoneStatus ??
                  (selectorCanAccept ? "Active" : "Waiting");

                return (
                  <button
                    key={campaign.id}
                    type="button"
                    onClick={() => setSelectedId(campaign.id)}
                    suppressHydrationWarning
                    className={[
                      "grid w-full gap-2.5 rounded-xl border p-2.5 text-left transition sm:grid-cols-[5.25rem_1fr]",
                      selectedId === campaign.id
                        ? "border-[var(--color-orange)] bg-white shadow-[0_10px_28px_rgba(255,138,0,0.13)] ring-1 ring-orange-100"
                        : "border-orange-100 bg-white/82 hover:border-orange-200 hover:bg-white",
                    ].join(" ")}
                  >
                    <CampaignImage
                      imageClass={campaign.imageClass}
                      imageUrl={campaign.imageUrl}
                    />
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-black text-stone-950">
                            {campaign.title}
                          </h3>
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--color-orange)]">
                            <span className="truncate">{campaign.shelter}</span>
                          </p>
                        </div>
                        <span
                          className={[
                            "shrink-0 rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold",
                            selectorCanAccept
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-amber-200 bg-amber-50 text-amber-700",
                          ].join(" ")}
                        >
                          {selectorCanAccept ? "Open" : "Waiting"}
                        </span>
                      </div>

                      {selectorStage ? (
                        <div className="mt-1.5 rounded-lg border border-orange-100 bg-white/78 px-2 py-1.5">
                          <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                            <span className="min-w-0 truncate text-stone-950">
                              {selectorMilestone.title}
                            </span>
                            <span className="shrink-0 text-[var(--color-orange)]">
                              {Math.round(selectorDisplayProgress)}%
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white ring-1 ring-orange-100">
                            <div
                              className="donor-progress-fill h-full rounded-full bg-[var(--color-orange)]"
                              style={{
                                width: `${Math.max(
                                  0,
                                  Math.min(100, selectorDisplayProgress),
                                )}%`,
                              }}
                            />
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-2 text-[0.7rem] font-medium text-stone-500">
                            <span>
                              {selectorCanAccept
                                ? `Need ${formatEthText(selectorDisplayRemainingEth)}`
                                : selectorDisplayStatus === "Withdrawable"
                                  ? "Funded"
                                  : "Not open"}
                            </span>
                            <span className="shrink-0 text-stone-400">
                              {selectorCanAccept
                                ? formatMyr(selectorDisplayRemainingMyr)
                                : selectorDisplayStatus === "Withdrawable"
                                  ? "Awaiting withdrawal"
                                  : selectorDisplayStatus}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1.5 rounded-lg border border-slate-100 bg-white/70 px-2 py-1.5">
                          <p className="text-xs font-semibold text-stone-500">
                            Waiting for the next on-chain stage.
                          </p>
                        </div>
                      )}

                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[0.68rem] font-medium text-[var(--color-orange)]">
                          {campaign.daysLeft} days left
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-orange-200 bg-orange-50/30 p-5 text-center">
                <p className="text-sm font-black text-stone-950">
                  No campaigns open for donation
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
                  Donations reopen when an active campaign has a milestone that
                  is accepting funds.
                </p>
                <Link
                  href="/Donor/discover"
                  className="mt-4 inline-flex items-center justify-center rounded-xl border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-[var(--color-orange)] transition hover:border-[var(--color-orange)] hover:bg-orange-50"
                >
                  Back to Discover
                </Link>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="donor-donate-card rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
                  Donation
                </p>
                <h2 className="mt-1 text-xl font-black text-stone-950">
                  Enter amount
                </h2>
              </div>
              <span className="rounded-full border border-orange-100 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-[var(--color-orange)]">
                ETH payment
              </span>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-orange-100 bg-gradient-to-r from-orange-50/80 to-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                    Connected wallet
                  </p>
                  <p className="mt-1 font-mono text-sm font-black text-stone-950">
                    {shortWallet}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                    Available balance
                  </p>
                  {walletBalanceEth !== null ? (
                    <>
                      <p className="mt-1 text-sm font-black text-stone-950">
                        {formatEthText(walletBalanceEth)}
                      </p>
                      <p className="text-xs font-semibold text-stone-500">
                        Approx. {formatMyr(walletBalanceMyr ?? 0)}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-sm font-semibold text-stone-500">
                      Connect wallet to view balance
                    </p>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-[11.5rem_1fr]">
                <label className="border-b border-orange-100 bg-white px-4 py-4 sm:border-b-0 sm:border-r">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Token
                  </span>
                  <div className="mt-2 flex h-12 items-center gap-2.5 rounded-xl border border-orange-100 bg-white px-3 shadow-sm">
                    <EthIcon />
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-black text-stone-950">ETH</p>
                      <p className="text-xs font-semibold text-stone-400">
                        Native token
                      </p>
                    </div>
                  </div>
                </label>
                <label className="block bg-white px-4 py-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    On-chain amount
                  </span>
                  <div className="mt-2 flex items-end justify-between gap-3 rounded-2xl border border-orange-100 bg-orange-50/25 px-3 py-2.5 focus-within:border-[var(--color-orange)] focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-100">
                    <input
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      inputMode="decimal"
                      suppressHydrationWarning
                      className="min-w-0 flex-1 border-0 bg-transparent text-3xl font-black text-stone-950 outline-none placeholder:text-stone-300"
                      placeholder="0.00"
                    />
                    <span className="pb-1 text-sm font-black text-stone-400">
                      ETH
                    </span>
                  </div>
                  {hasInvalidAmount ? (
                    <p className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                      Please enter a valid ETH amount greater than 0.
                    </p>
                  ) : null}
                  {exceedsCurrentStage ? (
                    <p className="mt-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                      {stageLimitMessage}
                    </p>
                  ) : null}
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-orange-100 bg-white px-3 py-2">
                    <span className="text-xs font-semibold text-stone-500">
                      Approx. MYR value
                    </span>
                    <span className="text-sm font-black text-stone-950">
                      {formatMyr(myrEstimate)}
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                Quick local presets
              </p>
              <p className="text-xs font-semibold text-stone-500">
                1 ETH = {formatMyr(ethToMyrRate)}
              </p>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {quickAmountsMyr.map((quickAmount) => {
                const ethAmount = quickAmount / ethToMyrRate;

                return (
                  <button
                    key={quickAmount}
                    type="button"
                    onClick={() => setAmount(ethAmount.toFixed(6))}
                    suppressHydrationWarning
                    className={[
                      "rounded-xl border px-3 py-2 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5",
                      Math.abs(numericAmount - ethAmount) < 0.000001
                        ? "border-[var(--color-orange)] bg-orange-50 text-[var(--color-orange)]"
                        : "border-orange-100 bg-white text-stone-700 hover:border-orange-200 hover:bg-orange-50",
                    ].join(" ")}
                  >
                    RM {quickAmount}
                  </button>
                );
              })}
            </div>
            <div className="donor-gradient-card mt-4 rounded-2xl border border-orange-100 bg-white p-3 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-orange)]">
                    Current stage
                  </p>
                  <h3 className="mt-1 truncate text-base font-black text-stone-950">
                    {currentStage
                      ? `Stage ${currentStage.index + 1}: ${nextMilestone?.title}`
                      : "All milestones funded"}
                  </h3>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-sm font-black text-stone-950">
                    {currentStageEthDisplay}
                  </p>
                  <p className="text-xs font-semibold text-stone-500">
                    Approx. {formatMyr(currentStageRemaining)}
                  </p>
                </div>
              </div>

              {currentStage ? (
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white ring-1 ring-orange-100">
                  <div
                    className="donor-progress-fill h-full rounded-full bg-[var(--color-orange)]"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(
                          100,
                          currentStage.cumulativeTarget > 0
                            ? ((currentStage.cumulativeTarget -
                                currentStage.remainingAmount) /
                                currentStage.cumulativeTarget) *
                                100
                            : 0,
                        ),
                      )}%`,
                    }}
                  />
                </div>
              ) : null}

              {!isOpenForFunding ? (
                <p className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                  {milestoneGateMessage}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              disabled={
                !currentStage ||
                !isOpenForFunding ||
                isLoadingOnChainBase ||
                isLoadingOnChainMilestone
              }
              onClick={() => setAmount(currentStageEthInput)}
              suppressHydrationWarning
              className="mt-3 flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--color-orange)] bg-white px-3 py-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-orange-50 disabled:cursor-not-allowed disabled:border-orange-100 disabled:bg-orange-50/40 disabled:opacity-60"
            >
              <span>
                <span className="block text-sm font-black text-stone-950">
                  Fund current milestone
                </span>
                <span className="block text-xs font-semibold text-stone-500">
                  {currentStage
                    ? isOpenForFunding
                      ? `${nextMilestone?.title} needs ${currentStageEthDisplay} more`
                      : "Waiting for shelter or admin action"
                    : "All milestone stages are fully funded"}
                </span>
              </span>
              <span className="text-right">
                <span className="block text-sm font-black text-[var(--color-orange)]">
                  {currentStageEthDisplay}
                </span>
                <span className="block text-xs font-semibold text-stone-500">
                  Approx. {formatMyr(currentStageRemaining)}
                </span>
              </span>
            </button>
          </div>

          {selectedCampaign ? (
            <div className="donor-donate-card rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-orange)]">
                    Confirm
                  </p>
                  <h2 className="mt-1 text-xl font-black text-stone-950">
                    Transaction review
                  </h2>
                  <p className="mt-1 truncate text-sm font-semibold text-stone-500">
                    {selectedCampaign.title}
                  </p>
                </div>
                <span className="rounded-full border border-orange-100 bg-orange-50 px-2.5 py-1 text-xs font-black text-[var(--color-orange)]">
                  Smart contract
                </span>
              </div>

              <div className="mt-4 rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50/60 via-white to-white p-4">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                      You donate
                    </p>
                    <p className="mt-1 text-2xl font-black text-stone-950">
                      {donationEthDisplay}
                    </p>
                    <p className="text-sm font-semibold text-stone-500">
                      Approx. {formatMyr(myrEstimate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                      Stage
                    </p>
                    <p className="mt-1 text-sm font-black text-stone-950">
                      {currentStage ? `#${currentStage.index + 1}` : "-"}
                    </p>
                    <p className="text-xs font-semibold text-stone-500">
                      {milestoneStatusSimple}
                    </p>
                  </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white ring-1 ring-orange-100">
                  <div
                    className="donor-progress-fill h-full rounded-full bg-[var(--color-orange)]"
                    style={{
                      width: `${clampPercentage(currentStage?.progress ?? 0)}%`,
                    }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-xs font-semibold text-stone-500">
                  <span className="truncate">
                    {nextMilestone?.title ?? "Current milestone"}
                  </span>
                  <span className="shrink-0">
                    Need {currentStageEthDisplay}
                  </span>
                </div>
              </div>

              <details className="group mt-4 overflow-hidden rounded-xl border border-orange-100 bg-white">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-stone-500 [&::-webkit-details-marker]:hidden">
                  <span>Gas and rate</span>
                  <span className="text-[var(--color-orange)] transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <div className="divide-y divide-orange-100 border-t border-orange-100 text-sm">
                  {[
                    ["ETH donation", donationEthDisplay],
                    ["MYR estimate", formatMyr(myrEstimate)],
                    ["Gas buffer", `${formatEthText(estimatedGasEth)} / ${formatMyr(estimatedGasMyr)}`],
                    ["Estimated total", `${requiredTotalEthDisplay} / ${formatMyr(requiredTotalMyr)}`],
                    ["Rate", `${rateLabel}: 1 ETH = ${formatMyr(ethToMyrRate)}`],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-4 px-3 py-2.5"
                    >
                      <span className="text-stone-500">{label}</span>
                      <span className="text-right font-semibold text-stone-950">
                        {value}
                      </span>
                    </div>
                  ))}
                  {rateTimestamp || rateLoadError ? (
                    <div className="px-3 py-2.5 text-xs font-semibold text-stone-500">
                      {rateTimestamp ? <p>Updated {rateTimestamp}</p> : null}
                      {rateLoadError ? (
                        <p className="mt-1 text-amber-700">
                          Live rate unavailable, using latest estimate.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </details>

              {isSubmitted ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-black text-emerald-800">
                        Donation confirmed
                      </p>
                      <p className="mt-1 font-mono text-xs font-semibold text-emerald-700">
                        {shortTxHash || "Transaction recorded"}
                      </p>
                    </div>
                    <p className="text-sm font-black text-emerald-950">
                      {donationEthDisplay}
                    </p>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <Link
                      href={receiptHref}
                      className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
                    >
                      {confirmedDonationId ? "View receipt" : "View tracking"}
                    </Link>
                    {explorerUrl ? (
                      <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
                      >
                        View on Etherscan
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={
                      hasInvalidAmount ||
                      exceedsCurrentStage ||
                      isProcessing ||
                      !selectedCampaign ||
                      !isOpenForFunding
                    }
                    onClick={() => void handleDonate()}
                    suppressHydrationWarning
                    className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[var(--color-orange)] px-4 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-orange-600 disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-orange-200"
                  >
                    {isProcessing
                      ? "Confirming transaction..."
                      : isConnected
                        ? isOpenForFunding
                          ? `Donate ${donationEthDisplay}`
                          : "Milestone not open"
                        : "Connect wallet"}
                  </button>
                  {!isOpenForFunding ? (
                    <p className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-800">
                      {milestoneGateMessage}
                    </p>
                  ) : null}
                </>
              )}
              {donationError ? (
                <p className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">
                  {donationError}
                </p>
              ) : null}
            </div>
          ) : null}
        </aside>
      </section>
    </div>
  );
}
