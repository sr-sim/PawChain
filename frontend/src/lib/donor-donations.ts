import { createAdminClient } from "@/lib/supabase/admin";
import {
  createDonorNotification,
  ensureCampaignCompletedNotification,
} from "@/lib/donor-notifications";
import { campaignContractAbi } from "@/lib/campaign-contract-abi";
import { getPawChainPublicClient } from "@/lib/campaign-blockchain";
import {
  decodeEventLog,
  formatEther,
  isAddress,
  parseAbiItem,
  type Address,
  type Hash,
} from "viem";

type DonationRow = {
  id: string;
  donor_id: string;
  campaign_id: string;
  amount: number | string;
  amount_wei?: string | null;
  currency: string;
  tx_hash: string;
  refund_tx_hash?: string | null;
  refunded_at?: string | null;
  contract_address?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type CampaignRow = {
  id: string;
  shelter_id: string;
  title: string;
  goal_amount: number | string;
  current_amount: number | string;
  campaign_status: string;
  contract_address?: string | null;
};

function formatNotificationMyr(value: number) {
  return value.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type OnChainCampaignSnapshot = {
  progress: number;
  status: string;
};

type ShelterRow = {
  user_id: string;
  shelter_name: string;
};

export type DonorDonation = {
  id: string;
  campaignId: string;
  campaignTitle: string;
  shelterId: string | null;
  shelterName: string;
  amount: number;
  amountEth: number;
  amountWei: string | null;
  currency: string;
  txHash: string;
  refundTxHash: string | null;
  refundedAt: string | null;
  refundAmountEth: number;
  refundAmount: number;
  contractAddress: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  campaignProgress: number;
  campaignStatus: string;
};

export type DonorDonationSummary = {
  totalAmount: number;
  totalEth: number;
  currency: string;
  donationCount: number;
  confirmedCount: number;
  latestDonation: DonorDonation | null;
};

function toNumber(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeStatus(status: string) {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getOnChainStatusLabel(status: number) {
  if (status === 0) return "Active";
  if (status === 1) return "Completed";
  if (status === 2) return "Refunding";
  if (status === 3) return "Closed";
  return "Blockchain";
}

function getCampaignProgress(campaign?: CampaignRow) {
  if (!campaign) {
    return 0;
  }

  if (campaign.campaign_status === "completed") {
    return 100;
  }

  const goal = toNumber(campaign.goal_amount);
  const current = toNumber(campaign.current_amount);

  if (goal <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((current / goal) * 10_000) / 100);
}

async function getOnChainCampaignSnapshots(campaigns: CampaignRow[]) {
  const contractCampaigns = campaigns.filter(
    (campaign) =>
      campaign.contract_address && isAddress(campaign.contract_address),
  );

  if (contractCampaigns.length === 0) {
    return new Map<string, OnChainCampaignSnapshot>();
  }

  const publicClient = getPawChainPublicClient();
  const entries = await Promise.all(
    contractCampaigns.map(async (campaign) => {
      try {
        const address = campaign.contract_address as Address;
        const [totalRaisedWei, goalWei, campaignStatus] = await Promise.all([
          publicClient.readContract({
            address,
            abi: campaignContractAbi,
            functionName: "totalRaised",
          }),
          publicClient.readContract({
            address,
            abi: campaignContractAbi,
            functionName: "goal",
          }),
          publicClient.readContract({
            address,
            abi: campaignContractAbi,
            functionName: "campaignStatus",
          }),
        ]);
        const totalRaisedEth = Number(formatEther(totalRaisedWei));
        const goalEth = Number(formatEther(goalWei));
        const status = getOnChainStatusLabel(Number(campaignStatus));
        const progress =
          status === "Completed"
            ? 100
            : goalEth > 0
              ? Math.min(100, Math.round((totalRaisedEth / goalEth) * 10_000) / 100)
              : 0;

        return [campaign.id, { progress, status }] as const;
      } catch {
        return null;
      }
    }),
  );

  return new Map(entries.filter(Boolean) as [string, OnChainCampaignSnapshot][]);
}

async function getRefundAmounts(donations: DonationRow[]) {
  const refundRows = donations.filter(
    (donation) =>
      donation.refund_tx_hash &&
      /^0x[0-9a-fA-F]{64}$/.test(donation.refund_tx_hash) &&
      donation.contract_address &&
      isAddress(donation.contract_address),
  );

  if (refundRows.length === 0) {
    return new Map<string, number>();
  }

  const publicClient = getPawChainPublicClient();
  const entries = await Promise.all(
    refundRows.map(async (donation) => {
      try {
        const receipt = await publicClient.getTransactionReceipt({
          hash: donation.refund_tx_hash as Hash,
        });
        const refundLog = receipt.logs
          .map((log) => {
            try {
              if (
                log.address.toLowerCase() !==
                donation.contract_address?.toLowerCase()
              ) {
                return null;
              }

              return decodeEventLog({
                abi: campaignContractAbi,
                data: log.data,
                topics: log.topics,
              });
            } catch {
              return null;
            }
          })
          .find((log) => log?.eventName === "RefundClaimed");

        if (refundLog?.eventName !== "RefundClaimed") {
          return [donation.id, 0] as const;
        }

        return [donation.id, Number(formatEther(refundLog.args.amount))] as const;
      } catch {
        return [donation.id, 0] as const;
      }
    }),
  );

  return new Map(entries);
}

async function syncClaimedRefunds(
  supabase: ReturnType<typeof createAdminClient>,
  donations: DonationRow[],
  walletAddress: string,
  campaigns: Map<string, CampaignRow>,
) {
  const missingRefundRows = donations.filter((donation) => {
    const contractAddress =
      donation.contract_address ??
      campaigns.get(donation.campaign_id)?.contract_address;

    return (
      !donation.refund_tx_hash &&
      contractAddress &&
      isAddress(contractAddress)
    );
  });

  if (missingRefundRows.length === 0 || !isAddress(walletAddress)) {
    return donations;
  }

  const publicClient = getPawChainPublicClient();
  const refundEvent = parseAbiItem(
    "event RefundClaimed(address indexed donor, uint256 amount)",
  );
  const syncedEntries = await Promise.all(
    missingRefundRows.map(async (donation) => {
      try {
        const campaign = campaigns.get(donation.campaign_id);
        const contractAddress =
          donation.contract_address ?? campaign?.contract_address;

        if (!contractAddress || !isAddress(contractAddress)) {
          return null;
        }

        const claimed = await publicClient.readContract({
          address: contractAddress as Address,
          abi: campaignContractAbi,
          functionName: "refundClaimed",
          args: [walletAddress as Address],
        });

        if (!claimed) {
          return null;
        }

        const donationReceipt = /^0x[0-9a-fA-F]{64}$/.test(donation.tx_hash)
          ? await publicClient
              .getTransactionReceipt({ hash: donation.tx_hash as Hash })
              .catch(() => null)
          : null;
        const logs = await publicClient.getLogs({
          address: contractAddress as Address,
          event: refundEvent,
          args: { donor: walletAddress as Address },
          fromBlock: donationReceipt?.blockNumber ?? BigInt(0),
          toBlock: "latest",
        });
        const latestRefundLog = logs.at(-1);

        if (!latestRefundLog?.transactionHash) {
          return null;
        }

        const block = await publicClient.getBlock({
          blockNumber: latestRefundLog.blockNumber,
        });
        const refundedAt = new Date(Number(block.timestamp) * 1000).toISOString();
        const updatedAt = new Date().toISOString();
        const refundTxHash = latestRefundLog.transactionHash;
        const refundAmountEth =
          typeof latestRefundLog.args.amount === "bigint"
            ? Number(formatEther(latestRefundLog.args.amount))
            : 0;
        const donationAmountEth = donation.amount_wei
          ? Number(formatEther(BigInt(donation.amount_wei)))
          : 0;
        const donationAmountMyr = Number(donation.amount ?? 0);
        const refundAmountMyr =
          donationAmountEth > 0 && donationAmountMyr > 0
            ? (donationAmountMyr / donationAmountEth) * refundAmountEth
            : 0;

        const { error: updateError } = await supabase
          .from("donations")
          .update({
            refund_tx_hash: refundTxHash,
            refunded_at: refundedAt,
            status: "refunded",
            updated_at: updatedAt,
          })
          .eq("id", donation.id);

        if (updateError) {
          return null;
        }

        await createDonorNotification({
          donorId: donation.donor_id,
          campaignId: donation.campaign_id,
          title: "Refund recorded",
          message: `Your ${refundAmountEth.toFixed(6)} ETH refund from ${campaign?.title ?? "this campaign"} was verified. Approx. MYR ${formatNotificationMyr(refundAmountMyr)}.`,
          status: "success",
        });

        return [
          donation.id,
          {
            refund_tx_hash: refundTxHash,
            refunded_at: refundedAt,
            status: "refunded",
            updated_at: updatedAt,
          },
        ] as const;
      } catch {
        return null;
      }
    }),
  );
  const syncedMap = new Map(
    syncedEntries.filter(Boolean) as [
      string,
      Pick<
        DonationRow,
        "refund_tx_hash" | "refunded_at" | "status" | "updated_at"
      >,
    ][],
  );

  if (syncedMap.size === 0) {
    return donations;
  }

  return donations.map((donation) => ({
    ...donation,
    ...(syncedMap.get(donation.id) ?? {}),
  }));
}

export async function getDonorDonations(walletAddress?: string) {
  const empty = {
    donations: [] as DonorDonation[],
    summary: {
      totalAmount: 0,
      totalEth: 0,
      currency: "MYR",
      donationCount: 0,
      confirmedCount: 0,
      latestDonation: null,
    } satisfies DonorDonationSummary,
  };

  if (!walletAddress) {
    return empty;
  }

  const supabase = createAdminClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .ilike("wallet_address", walletAddress)
    .eq("role", "donor")
    .maybeSingle();

  if (profileError || !profile) {
    return empty;
  }

  const { data: donationRows, error: donationError } = await supabase
    .from("donations")
    .select(
      "id, donor_id, campaign_id, amount, amount_wei, currency, tx_hash, refund_tx_hash, refunded_at, contract_address, status, created_at, updated_at",
    )
    .eq("donor_id", profile.id)
    .order("created_at", { ascending: false });

  if (donationError || !donationRows?.length) {
    return empty;
  }

  const donationDataFromSupabase = donationRows as DonationRow[];
  const campaignIds = [
    ...new Set(donationDataFromSupabase.map((item) => item.campaign_id)),
  ];
  const { data: campaignRows } = await supabase
    .from("campaigns")
    .select(
      "id, shelter_id, title, goal_amount, current_amount, campaign_status, contract_address",
    )
    .in("id", campaignIds);

  const campaigns = ((campaignRows ?? []) as CampaignRow[]).reduce(
    (map, campaign) => map.set(campaign.id, campaign),
    new Map<string, CampaignRow>(),
  );
  const shelterIds = [
    ...new Set(
      [...campaigns.values()]
        .map((campaign) => campaign.shelter_id)
        .filter(Boolean),
    ),
  ];
  const { data: shelterRows } = shelterIds.length
    ? await supabase
        .from("shelter_applications")
        .select("user_id, shelter_name")
        .in("user_id", shelterIds)
    : { data: [] };
  const shelters = ((shelterRows ?? []) as ShelterRow[]).reduce(
    (map, shelter) => map.set(shelter.user_id, shelter.shelter_name),
    new Map<string, string>(),
  );
  const onChainSnapshots = await getOnChainCampaignSnapshots([
    ...campaigns.values(),
  ]);
  const donationsData = await syncClaimedRefunds(
    supabase,
    donationDataFromSupabase,
    walletAddress,
    campaigns,
  );
  const refundAmounts = await getRefundAmounts(donationsData);

  const donations = donationsData.map((donation) => {
    const campaign = campaigns.get(donation.campaign_id);
    const onChainSnapshot = campaign
      ? onChainSnapshots.get(campaign.id)
      : undefined;
    const amount = toNumber(donation.amount);
    const amountEth = donation.amount_wei
      ? Number(formatEther(BigInt(donation.amount_wei)))
      : 0;
    const refundAmountEth = refundAmounts.get(donation.id) ?? 0;
    const refundAmount =
      amountEth > 0 && refundAmountEth > 0
        ? (amount / amountEth) * refundAmountEth
        : 0;

    return {
      id: donation.id,
      campaignId: donation.campaign_id,
      campaignTitle: campaign?.title ?? "Campaign unavailable",
      shelterId: campaign?.shelter_id ?? null,
      shelterName: campaign?.shelter_id
        ? shelters.get(campaign.shelter_id) ?? "Verified shelter"
        : "Verified shelter",
      amount,
      amountEth,
      amountWei: donation.amount_wei ?? null,
      currency: donation.currency ?? "MYR",
      txHash: donation.tx_hash,
      refundTxHash: donation.refund_tx_hash ?? null,
      refundedAt: donation.refunded_at ?? null,
      refundAmountEth,
      refundAmount,
      contractAddress: donation.contract_address ?? null,
      status: donation.refund_tx_hash
        ? "Refunded"
        : normalizeStatus(donation.status),
      createdAt: donation.created_at,
      updatedAt: donation.updated_at,
      campaignProgress: onChainSnapshot?.progress ?? getCampaignProgress(campaign),
      campaignStatus:
        onChainSnapshot?.status ??
        (campaign ? normalizeStatus(campaign.campaign_status) : "Unavailable"),
    };
  });

  await Promise.all(
    donations
      .filter(
        (donation) =>
          donation.campaignStatus === "Completed" &&
          !["Failed", "Refunded"].includes(donation.status),
      )
      .map((donation) =>
        ensureCampaignCompletedNotification({
          donorId: profile.id,
          campaignId: donation.campaignId,
          campaignTitle: donation.campaignTitle,
        }),
      ),
  );

  const confirmedDonations = donations.filter(
    (donation) => !["Failed", "Refunded"].includes(donation.status),
  );
  const totalAmount = confirmedDonations.reduce(
    (total, donation) => total + donation.amount,
    0,
  );
  const totalEth = confirmedDonations.reduce(
    (total, donation) => total + donation.amountEth,
    0,
  );

  return {
    donations,
    summary: {
      totalAmount,
      totalEth,
      currency: donations[0]?.currency ?? "MYR",
      donationCount: donations.length,
      confirmedCount: confirmedDonations.length,
      latestDonation: donations[0] ?? null,
    },
  };
}

export async function getDonorDonationById(
  donationId: string,
  walletAddress?: string,
) {
  if (!donationId || !walletAddress) {
    return null;
  }

  const { donations } = await getDonorDonations(walletAddress);

  return donations.find((donation) => donation.id === donationId) ?? null;
}
