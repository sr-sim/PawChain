import type { CampaignStatus, MilestoneStatus } from "./campaign-types";

export const malaysianStates = [
  "Johor",
  "Kedah",
  "Kelantan",
  "Melaka",
  "Negeri Sembilan",
  "Pahang",
  "Penang",
  "Perak",
  "Perlis",
  "Sabah",
  "Sarawak",
  "Selangor",
  "Terengganu",
  "Kuala Lumpur",
  "Labuan",
  "Putrajaya",
];

export function formatCurrency(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return "RM 0.00";
  }

  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
  }).format(amount);
}

export function getProgress(
  currentAmount: number | string | null,
  goalAmount: number | string,
) {
  const current = Number(currentAmount ?? 0);
  const goal = Number(goalAmount);

  if (!Number.isFinite(current) || !Number.isFinite(goal) || goal <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((current / goal) * 100));
}

export function readableStatus(status: CampaignStatus | MilestoneStatus) {
  if (status === "closed") {
    return "expired";
  }

  return status.replaceAll("_", " ");
}
