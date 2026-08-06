import { createAdminClient } from "@/lib/supabase/admin";
import { campaigns as previewCampaigns } from "@/app/Donor/campaignData";
import { campaignContractAbi } from "@/lib/campaign-contract-abi";
import { getPawChainPublicClient } from "@/lib/campaign-blockchain";
import { formatEther, isAddress, type Address } from "viem";

type CampaignRow = {
  id: string;
  shelter_id?: string | null;
  title: string;
  description: string;
  goal_amount: number | string;
  current_amount: number | string | null;
  urgency_level: "medium" | "high" | "critical";
  campaign_status: string;
  duration_days: number;
  image_url: string | null;
  contract_address?: string | null;
  goal_wei?: string | null;
  deployment_tx_hash?: string | null;
  eth_myr_rate?: number | string | null;
  created_at?: string | null;
};

type MilestoneRow = {
  id: string;
  campaign_id: string;
  title: string;
  description?: string | null;
  requirement?: string | null;
  percentage: number | string;
  on_chain_index?: number | string | null;
  status?: string | null;
  proof_url?: string | null;
  proof_tx_hash?: string | null;
  review_tx_hash?: string | null;
  release_tx_hash?: string | null;
};

type ShelterProfileRow = {
  id: string;
  full_name: string;
};

type ShelterApplicationRow = {
  user_id: string;
  shelter_name: string;
  registration_id?: string | null;
  contact_phone?: string | null;
  website_url?: string | null;
  shelter_address?: string | null;
  organization_description?: string | null;
  created_at?: string | null;
};

type ShelterVisualRow = {
  user_id: string;
  shelter_image_url?: string | null;
};

type CampaignDonorRow = {
  campaign_id: string;
  donor_id: string;
};

type OnChainCampaignSnapshot = {
  totalRaisedEth: number;
  goalEth: number;
  status: string;
  progress: number;
  currentMilestoneIndex: number;
};

export type DonorCampaign = Omit<(typeof previewCampaigns)[number], "location"> & {
  source?: "supabase" | "preview";
  imageUrl?: string | null;
  shelterImageUrl?: string | null;
  milestoneDetails?: {
    id?: string;
    title: string;
    description: string;
    requirement: string;
    percentage: number;
    status: string;
    proofUrl?: string | null;
    proofTxHash?: string | null;
    reviewTxHash?: string | null;
    releaseTxHash?: string | null;
  }[];
  goalAmount?: number;
  currentAmount?: number;
  contractAddress?: string | null;
  goalWei?: string | null;
  deploymentTxHash?: string | null;
  ethMyrRate?: number;
  onChainGoalEth?: number;
  onChainTotalRaisedEth?: number;
  currentMilestoneIndex?: number;
};

export type DonorShelter = ReturnType<typeof import("@/app/Donor/campaignData").getShelters>[number] & {
  source?: "supabase";
  imageUrl?: string | null;
  registrationId?: string | null;
  contactPhone?: string | null;
  websiteUrl?: string | null;
  address?: string | null;
  description?: string | null;
};

function toTitleCase(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatGoal(value: number | string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "RM 0";
  }

  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatEthGoal(value: number) {
  return `${value.toLocaleString("en-MY", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  })} ETH`;
}

function getProgress(currentAmount: number | string | null, goalAmount: number | string) {
  const current = Number(currentAmount ?? 0);
  const goal = Number(goalAmount);

  if (!Number.isFinite(current) || !Number.isFinite(goal) || goal <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((current / goal) * 10_000) / 100);
}

function getOnChainStatusLabel(status: number) {
  if (status === 0) return "Active";
  if (status === 1) return "Completed";
  if (status === 2) return "Refunding";
  if (status === 3) return "Closed";
  return "Unknown";
}

function getCampaignStatusLabel(status: string) {
  if (status === "active") return "Active";
  if (status === "completed") return "Completed";
  if (status === "closed") return "Closed";
  if (status === "pending_approval") return "Pending approval";
  if (status === "rejected") return "Rejected";
  return toTitleCase(status);
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
        const [
          totalRaisedWei,
          goalWei,
          campaignStatus,
          currentMilestoneIndex,
        ] = await Promise.all([
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
          publicClient.readContract({
            address,
            abi: campaignContractAbi,
            functionName: "currentMilestoneIndex",
          }),
        ]);
        const totalRaisedEth = Number(formatEther(totalRaisedWei));
        const goalEth = Number(formatEther(goalWei));
        const status = getOnChainStatusLabel(Number(campaignStatus));
        const progress =
          status === "Completed"
            ? 100
            : goalEth > 0
              ? Math.min(
                  100,
                  Math.round((totalRaisedEth / goalEth) * 10_000) / 100,
                )
              : 0;

        return [
          campaign.id,
          {
            totalRaisedEth,
            goalEth,
            status,
            progress,
            currentMilestoneIndex: Number(currentMilestoneIndex),
          },
        ] as const;
      } catch {
        return null;
      }
    }),
  );

  return new Map(entries.filter(Boolean) as [string, OnChainCampaignSnapshot][]);
}

function getDaysLeft(createdAt: string | null | undefined, durationDays: number) {
  if (!createdAt || !Number.isFinite(durationDays)) {
    return durationDays || 0;
  }

  const createdTime = new Date(createdAt).getTime();

  if (!Number.isFinite(createdTime)) {
    return durationDays;
  }

  const endTime = createdTime + durationDays * 24 * 60 * 60 * 1000;
  const remainingMs = endTime - Date.now();

  return Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
}

function getImageClass(urgency: string) {
  if (urgency === "critical") {
    return "from-red-100 via-orange-100 to-white";
  }

  if (urgency === "high") {
    return "from-orange-200 via-amber-100 to-white";
  }

  return "from-yellow-100 via-orange-100 to-white";
}

function getShelterName(
  shelterId: string | null | undefined,
  profileNames: Map<string, string>,
  applicationNames: Map<string, string>,
) {
  if (!shelterId) {
    return "Verified Shelter";
  }

  return (
    applicationNames.get(shelterId) ??
    profileNames.get(shelterId) ??
    "Verified Shelter"
  );
}

async function mapCampaignRows(campaigns: CampaignRow[]): Promise<DonorCampaign[]> {
  if (campaigns.length === 0) {
    return [];
  }

  const supabase = createAdminClient();
  const campaignIds = campaigns.map((campaign) => campaign.id);
  const shelterIds = Array.from(
    new Set(campaigns.map((campaign) => campaign.shelter_id).filter(Boolean)),
  ) as string[];

  const { data: milestoneRows } = await supabase
    .from("campaign_milestones")
    .select("id, campaign_id, title, description, requirement, percentage, on_chain_index, status, proof_url, proof_tx_hash, review_tx_hash, release_tx_hash, created_at")
    .in("campaign_id", campaignIds)
    .order("on_chain_index", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  const { data: campaignDonorRows } = await supabase
    .from("donations")
    .select("campaign_id, donor_id")
    .in("campaign_id", campaignIds)
    .eq("status", "confirmed");

  const { data: profileRows } =
    shelterIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", shelterIds)
      : { data: [] };

  const { data: applicationRows } =
    shelterIds.length > 0
      ? await supabase
          .from("shelter_applications")
          .select("user_id, shelter_name")
          .in("user_id", shelterIds)
      : { data: [] };

  const { data: visualRows } =
    shelterIds.length > 0
      ? await supabase
          .from("shelter_profiles")
          .select("user_id, shelter_image_url")
          .in("user_id", shelterIds)
      : { data: [] };

  const milestonesByCampaign = new Map<string, MilestoneRow[]>();
  ((milestoneRows ?? []) as MilestoneRow[]).forEach((milestone) => {
    const existing = milestonesByCampaign.get(milestone.campaign_id) ?? [];
    existing.push(milestone);
    milestonesByCampaign.set(milestone.campaign_id, existing);
  });
  milestonesByCampaign.forEach((milestones, campaignId) => {
    milestonesByCampaign.set(
      campaignId,
      [...milestones].sort((first, second) => {
        const firstIndex = Number(first.on_chain_index);
        const secondIndex = Number(second.on_chain_index);
        const firstHasIndex = Number.isFinite(firstIndex);
        const secondHasIndex = Number.isFinite(secondIndex);

        if (firstHasIndex && secondHasIndex) {
          return firstIndex - secondIndex;
        }

        if (firstHasIndex) {
          return -1;
        }

        if (secondHasIndex) {
          return 1;
        }

        return 0;
      }),
    );
  });

  const profileNames = new Map(
    ((profileRows ?? []) as ShelterProfileRow[]).map((profile) => [
      profile.id,
      profile.full_name,
    ]),
  );
  const applicationNames = new Map(
    ((applicationRows ?? []) as ShelterApplicationRow[]).map((application) => [
      application.user_id,
      application.shelter_name,
    ]),
  );
  const shelterImages = new Map(
    ((visualRows ?? []) as ShelterVisualRow[]).map((visual) => [
      visual.user_id,
      visual.shelter_image_url ?? null,
    ]),
  );
  const donorIdsByCampaign = new Map<string, Set<string>>();
  ((campaignDonorRows ?? []) as CampaignDonorRow[]).forEach((donation) => {
    const donorIds = donorIdsByCampaign.get(donation.campaign_id) ?? new Set<string>();
    donorIds.add(donation.donor_id);
    donorIdsByCampaign.set(donation.campaign_id, donorIds);
  });
  const onChainSnapshots = await getOnChainCampaignSnapshots(campaigns);

  return campaigns.map((campaign) => {
    const milestones = milestonesByCampaign.get(campaign.id) ?? [];
    const onChainSnapshot = onChainSnapshots.get(campaign.id);
    const fallbackMilestones = [
      { title: "Initial proof submission", percentage: 40 },
      { title: "Progress update", percentage: 35 },
      { title: "Final release review", percentage: 25 },
    ];
    const mappedMilestones =
      milestones.length > 0
        ? milestones.map((milestone) => ({
            title: milestone.title,
            percentage: Number(milestone.percentage) || 0,
          }))
        : fallbackMilestones;

    return {
      id: campaign.id,
      title: campaign.title,
      shelterId: campaign.shelter_id ?? campaign.id,
      shelter: getShelterName(campaign.shelter_id, profileNames, applicationNames),
      urgency: toTitleCase(campaign.urgency_level),
      status: onChainSnapshot?.status ?? getCampaignStatusLabel(campaign.campaign_status),
      duration: `${campaign.duration_days} days`,
      raised:
        onChainSnapshot?.progress ??
        getProgress(campaign.current_amount, campaign.goal_amount),
      goal: onChainSnapshot
        ? formatEthGoal(onChainSnapshot.goalEth)
        : formatGoal(campaign.goal_amount),
      goalAmount: Number(campaign.goal_amount) || 0,
      currentAmount: Number(campaign.current_amount ?? 0) || 0,
      onChainGoalEth: onChainSnapshot?.goalEth,
      onChainTotalRaisedEth: onChainSnapshot?.totalRaisedEth,
      currentMilestoneIndex: onChainSnapshot?.currentMilestoneIndex,
      donors: donorIdsByCampaign.get(campaign.id)?.size ?? 0,
      daysLeft: getDaysLeft(campaign.created_at, campaign.duration_days),
      verifiedSince: campaign.created_at
        ? String(new Date(campaign.created_at).getFullYear())
        : "Verified",
      animalsHelped: "Active",
      imageClass: getImageClass(campaign.urgency_level),
      imageUrl: campaign.image_url,
      shelterImageUrl: campaign.shelter_id
        ? shelterImages.get(campaign.shelter_id) ?? null
        : null,
      story: campaign.description,
      campaignDetails: campaign.description,
      milestones: mappedMilestones,
      milestoneDetails:
        milestones.length > 0
          ? milestones.map((milestone) => ({
              id: milestone.id,
              title: milestone.title,
              description: milestone.description ?? "",
              requirement: milestone.requirement ?? "",
              percentage: Number(milestone.percentage) || 0,
              status: toTitleCase(milestone.status ?? "pending"),
              proofUrl: milestone.proof_url ?? null,
              proofTxHash: milestone.proof_tx_hash ?? null,
              reviewTxHash: milestone.review_tx_hash ?? null,
              releaseTxHash: milestone.release_tx_hash ?? null,
            }))
          : mappedMilestones.map((milestone) => ({
              ...milestone,
              description: "",
              requirement: "",
              status: "Pending",
              proofUrl: null,
              proofTxHash: null,
              reviewTxHash: null,
              releaseTxHash: null,
            })),
      source: "supabase",
      contractAddress: campaign.contract_address ?? null,
      goalWei: campaign.goal_wei ?? null,
      deploymentTxHash: campaign.deployment_tx_hash ?? null,
      ethMyrRate: Number(campaign.eth_myr_rate ?? 0) || undefined,
    };
  });
}

export async function getActiveDonorCampaigns(): Promise<DonorCampaign[]> {
  const supabase = createAdminClient();

  const { data: campaignRows, error: campaignError } = await supabase
    .from("campaigns")
    .select(
      "id, shelter_id, title, description, goal_amount, current_amount, urgency_level, campaign_status, duration_days, image_url, contract_address, goal_wei, deployment_tx_hash, eth_myr_rate, created_at",
    )
    .eq("campaign_status", "active")
    .order("created_at", { ascending: false });

  if (campaignError) {
    throw campaignError;
  }

  const campaigns = (campaignRows ?? []) as CampaignRow[];

  return mapCampaignRows(campaigns);
}

export async function getBrowsableDonorCampaigns(): Promise<DonorCampaign[]> {
  const supabase = createAdminClient();

  const { data: campaignRows, error: campaignError } = await supabase
    .from("campaigns")
    .select(
      "id, shelter_id, title, description, goal_amount, current_amount, urgency_level, campaign_status, duration_days, image_url, contract_address, goal_wei, deployment_tx_hash, eth_myr_rate, created_at",
    )
    .in("campaign_status", ["active", "completed", "closed"])
    .order("created_at", { ascending: false });

  if (campaignError) {
    throw campaignError;
  }

  return mapCampaignRows((campaignRows ?? []) as CampaignRow[]);
}

export async function getDonorCampaignById(id: string): Promise<DonorCampaign | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("campaigns")
    .select(
      "id, shelter_id, title, description, goal_amount, current_amount, urgency_level, campaign_status, duration_days, image_url, contract_address, goal_wei, deployment_tx_hash, eth_myr_rate, created_at",
    )
    .eq("id", id)
    .in("campaign_status", ["active", "completed", "closed"])
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const [campaign] = await mapCampaignRows([data as CampaignRow]);

  return campaign ?? null;
}

export async function getDonorCampaignsByIds(
  ids: string[],
): Promise<DonorCampaign[]> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];

  if (uniqueIds.length === 0) {
    return [];
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("campaigns")
    .select(
      "id, shelter_id, title, description, goal_amount, current_amount, urgency_level, campaign_status, duration_days, image_url, contract_address, goal_wei, deployment_tx_hash, eth_myr_rate, created_at",
    )
    .in("id", uniqueIds)
    .in("campaign_status", ["active", "completed", "closed"]);

  if (error) {
    throw error;
  }

  return mapCampaignRows((data ?? []) as CampaignRow[]);
}

export async function getDonorShelterById(id: string): Promise<DonorShelter | null> {
  const supabase = createAdminClient();

  const { data: campaignRows, error: campaignError } = await supabase
    .from("campaigns")
    .select(
      "id, shelter_id, title, description, goal_amount, current_amount, urgency_level, campaign_status, duration_days, image_url, contract_address, goal_wei, deployment_tx_hash, eth_myr_rate, created_at",
    )
    .eq("shelter_id", id)
    .eq("campaign_status", "active")
    .order("created_at", { ascending: false });

  if (campaignError) {
    throw campaignError;
  }

  const campaigns = await mapCampaignRows((campaignRows ?? []) as CampaignRow[]);

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("id", id)
    .maybeSingle();

  const { data: applicationRow } = await supabase
    .from("shelter_applications")
    .select(
      "user_id, shelter_name, registration_id, contact_phone, website_url, shelter_address, organization_description, created_at",
    )
    .eq("user_id", id)
    .maybeSingle();

  const { data: visualRow } = await supabase
    .from("shelter_profiles")
    .select("user_id, shelter_image_url")
    .eq("user_id", id)
    .maybeSingle();

  if (!profileRow && !applicationRow && campaigns.length === 0) {
    return null;
  }

  const application = applicationRow as ShelterApplicationRow | null;
  const profile = profileRow as ShelterProfileRow | null;
  const visual = visualRow as ShelterVisualRow | null;
  const firstCampaign = campaigns[0];
  const verifiedSince = application?.created_at
    ? String(new Date(application.created_at).getFullYear())
    : (firstCampaign?.verifiedSince ?? "Verified");

  return {
    id,
    name: application?.shelter_name ?? profile?.full_name ?? firstCampaign?.shelter ?? "Verified Shelter",
    location: application?.shelter_address ?? "Malaysia",
    verifiedSince,
    animalsHelped: firstCampaign?.animalsHelped ?? "Active",
    imageClass: firstCampaign?.imageClass ?? "from-yellow-100 via-orange-100 to-white",
    imageUrl: visual?.shelter_image_url ?? null,
    story:
      application?.organization_description ??
      firstCampaign?.story ??
      "This verified shelter is part of PawChain.",
    campaigns,
    source: "supabase",
    registrationId: application?.registration_id ?? null,
    contactPhone: application?.contact_phone ?? null,
    websiteUrl: application?.website_url ?? null,
    address: application?.shelter_address ?? null,
    description: application?.organization_description ?? null,
  };
}
