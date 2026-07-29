export type FinancialTransactionType =
  | "donation"
  | "refund"
  | "fund_release";

export type FinancialTransaction = {
  id: string;
  txHash: string;
  transactionType: FinancialTransactionType;
  campaignId: string;
  campaignTitle: string;
  milestoneId: string | null;
  milestoneTitle: string | null;
  walletAddress: string;
  amountWei: string;
  amountMyr: number | null;
  chainId: number;
  blockNumber: number;
  occurredAt: string;
  status: "pending" | "confirmed" | "failed";
};
