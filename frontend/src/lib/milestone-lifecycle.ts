export const milestoneChainStatus = {
  locked: 0,
  active: 1,
  pendingReview: 2,
  rejected: 3,
  approved: 4,
  withdrawable: 5,
  released: 6,
  completed: 7,
} as const;

export function getMilestoneActions(status: number | null | undefined) {
  return {
    canWithdraw: status === milestoneChainStatus.withdrawable,
    canUploadProof:
      status === milestoneChainStatus.released ||
      status === milestoneChainStatus.rejected,
    isPendingReview: status === milestoneChainStatus.pendingReview,
    isCompleted: status === milestoneChainStatus.completed,
  };
}
