export type CampaignStatus =
  | "pending_approval"
  | "active"
  | "rejected"
  | "completed"
  | "closed";

export type MilestoneStatus = "pending" | "submitted" | "approved" | "rejected";

export type UrgencyLevel = "medium" | "high" | "critical";

export type Campaign = {
  id: string;
  shelter_id?: string;
  title: string;
  description: string;
  goal_amount: number | string;
  current_amount: number | string | null;
  urgency_level: UrgencyLevel;
  campaign_status: CampaignStatus;
  duration_days: number;
  image_url: string | null;
  contract_address: string | null;
  goal_wei?: string | null;
  chain_id?: number | null;
  factory_address?: string | null;
  deployment_tx_hash?: string | null;
  on_chain_campaign_key?: string | null;
  eth_myr_rate?: number | string | null;
  rejection_reason?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CampaignMilestone = {
  id: string;
  campaign_id: string;
  title: string;
  description: string;
  requirement: string;
  percentage: number | string;
  status: MilestoneStatus;
  proof_url: string | null;
  rejection_reason: string | null;
  on_chain_index?: number | null;
  proof_cid?: string | null;
  proof_tx_hash?: string | null;
  review_tx_hash?: string | null;
  release_tx_hash?: string | null;
  created_at?: string;
};
