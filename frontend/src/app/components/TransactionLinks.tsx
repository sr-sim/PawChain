import { getTransactionExplorerUrl, shortAddress } from "@/lib/block-explorer";

type TransactionLinksProps = {
  proofTxHash?: string | null;
  reviewTxHash?: string | null;
  releaseTxHash?: string | null;
};

export function TransactionLinks({
  proofTxHash,
  reviewTxHash,
  releaseTxHash,
}: TransactionLinksProps) {
  const transactions = [
    { label: "Proof tx", hash: proofTxHash },
    { label: "Review tx", hash: reviewTxHash },
    { label: "Release tx", hash: releaseTxHash },
  ]
    .map((transaction) => ({
      label: transaction.label,
      hash: transaction.hash ?? "",
    }))
    .filter((transaction) => Boolean(getTransactionExplorerUrl(transaction.hash)));

  if (transactions.length === 0) {
    return (
      <p className="text-xs font-semibold text-stone-400">
        No on-chain transactions yet.
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
          className="inline-flex items-center gap-1.5 rounded-full border border-orange-100 bg-white px-3 py-1.5 font-mono text-[0.7rem] font-black text-[var(--color-orange)] shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50"
        >
          {transaction.label}
          <span className="font-semibold text-orange-500">
            {shortAddress(transaction.hash)}
          </span>
          <span aria-hidden="true">-&gt;</span>
        </a>
      ))}
    </div>
  );
}
