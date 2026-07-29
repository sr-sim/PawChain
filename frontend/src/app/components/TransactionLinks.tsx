import { getTransactionExplorerUrl, shortAddress } from "@/lib/block-explorer";

type TransactionLinksProps = {
  proofTxHash?: string | null;
  reviewTxHash?: string | null;
  releaseTxHash?: string | null;
  transactions?: Array<{
    label: string;
    hash?: string | null;
  }>;
  emptyMessage?: string | false;
};

export function TransactionLinks({
  proofTxHash,
  reviewTxHash,
  releaseTxHash,
  transactions: customTransactions,
  emptyMessage = "No on-chain transactions yet.",
}: TransactionLinksProps) {
  const transactions = (
    customTransactions ?? [
      { label: "Proof tx", hash: proofTxHash },
      { label: "Review tx", hash: reviewTxHash },
      { label: "Release tx", hash: releaseTxHash },
    ]
  )
    .map((transaction) => ({
      label: transaction.label,
      hash: transaction.hash ?? "",
    }))
    .filter((transaction) => Boolean(getTransactionExplorerUrl(transaction.hash)));

  if (transactions.length === 0) {
    if (emptyMessage === false) return null;
    return (
      <p className="text-xs font-semibold text-stone-400">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">
        On-chain evidence
      </span>

      {transactions.map((transaction) => (
        <a
          key={transaction.label}
          href={getTransactionExplorerUrl(transaction.hash)}
          target="_blank"
          rel="noopener noreferrer"
          title={`View ${transaction.label} on block explorer`}
          className="inline-flex items-center gap-1.5 rounded-full border border-orange-300 bg-orange-50 px-3 py-1.5 font-mono text-[0.7rem] font-black text-orange-700 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-500 hover:bg-orange-100"
        >
          {transaction.label}
          <span className="font-semibold text-orange-600">
            {shortAddress(transaction.hash)}
          </span>
          <span aria-hidden="true">-&gt;</span>
        </a>
      ))}
    </div>
  );
}
