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
    return "Approx. live MYR: MYR 0.00";
  }

  return `Approx. live MYR: MYR ${new Intl.NumberFormat("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
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

  const exactPercentage = (current / goal) * 100;

  return Math.min(100, Math.round(exactPercentage * 100) / 100);
}

export function readableStatus(status: CampaignStatus | MilestoneStatus) {
  if (status === "closed") {
    return "expired";
  }

  return status.replaceAll("_", " ");
}
