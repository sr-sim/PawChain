import type { CampaignStatus, MilestoneStatus } from "./campaign-types";
import { readableStatus } from "./campaign-utils";

type StatusBadgeProps = {
  status: CampaignStatus | MilestoneStatus;
};

const statusStyles: Record<CampaignStatus | MilestoneStatus, string> = {
  pending_approval: "border-amber-200 bg-amber-50 text-amber-700",
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
  completed: "border-orange-200 bg-orange-50 text-[var(--color-orange)]",
  closed: "border-stone-200 bg-stone-100 text-stone-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  submitted: "border-sky-200 bg-sky-50 text-sky-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={[
        "inline-flex rounded-full border px-3 py-1 text-xs font-black capitalize",
        statusStyles[status],
      ].join(" ")}
    >
      {readableStatus(status)}
    </span>
  );
}
