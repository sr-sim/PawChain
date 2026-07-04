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
  location: string;
  goal_amount: number | string;
  current_amount: number | string | null;
  urgency_level: UrgencyLevel;
  campaign_status: CampaignStatus;
  duration_days: number;
  image_url: string | null;
  contract_address: string | null;
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
};
