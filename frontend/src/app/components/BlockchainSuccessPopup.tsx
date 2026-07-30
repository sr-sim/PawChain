"use client";

import { useEffect, useRef } from "react";

type BlockchainSuccessPopupProps = {
  open: boolean;
  status?: "pending" | "confirmed" | "failed";
  title: string;
  message: string;
  txHash?: string;
  transactions?: { label: string; hash: string }[];
  actionLabel?: string;
  onClose: () => void;
  autoCloseMs?: number;
};

const transactionHashPattern = /^0x[0-9a-fA-F]{64}$/;

export function BlockchainSuccessPopup({
  open,
  status = "confirmed",
  title,
  message,
  txHash = "",
  transactions = [],
  actionLabel = "View transaction",
  onClose,
  autoCloseMs = 0,
}: BlockchainSuccessPopupProps) {
  const validHash = transactionHashPattern.test(txHash);
  const validTransactions = transactions.filter((item) =>
    transactionHashPattern.test(item.hash),
  );
  const hasTransaction = validHash || validTransactions.length > 0;
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || !hasTransaction || status !== "confirmed" || autoCloseMs <= 0)
      return;
    const timer = window.setTimeout(() => onCloseRef.current(), autoCloseMs);
    return () => window.clearTimeout(timer);
  }, [autoCloseMs, hasTransaction, open, status]);

  if (!open) return null;

  const pending = status === "pending";
  const failed = status === "failed";
  const accent = pending
    ? "border-orange-200"
    : failed
      ? "border-red-200"
      : "border-emerald-200";
  const tone = pending
    ? "bg-orange-100 text-orange-700"
    : failed
      ? "bg-red-100 text-red-700"
      : "bg-emerald-100 text-emerald-700";
  const labelTone = pending
    ? "text-orange-700"
    : failed
      ? "text-red-700"
      : "text-emerald-700";

  return (
    <div className="fixed inset-0 z-[140] grid place-items-center bg-stone-950/30 p-4 backdrop-blur-sm">
      <aside
        role={failed ? "alert" : "status"}
        aria-live={failed ? "assertive" : "polite"}
        aria-busy={pending}
        className={`w-[min(27rem,calc(100vw-2rem))] animate-[blockchain-success-in_320ms_ease-out] overflow-hidden rounded-2xl border bg-white shadow-[0_30px_90px_rgba(28,25,23,0.3)] motion-reduce:animate-none ${accent}`}
      >
        <div
          className={`h-1 ${
            pending
              ? "bg-[linear-gradient(90deg,var(--color-gold),var(--color-orange))]"
              : failed
                ? "bg-[linear-gradient(90deg,#ef4444,#f97316)]"
                : "bg-[linear-gradient(90deg,#10b981,var(--color-orange))]"
          }`}
        />
        <div className="p-4">
          <div className="flex items-start gap-3">
            <span
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg font-black ${tone}`}
            >
              {pending ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-orange-200 border-t-orange-600 motion-reduce:animate-none" />
              ) : failed ? (
                "!"
              ) : (
                "\u2713"
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={`text-[10px] font-black uppercase tracking-[0.14em] ${labelTone}`}
              >
                {pending
                  ? "Pending blockchain confirmation"
                  : failed
                    ? "Transaction not completed"
                    : "Smart contract confirmed"}
              </p>
              <h2 className="mt-1 text-base font-black text-stone-950">
                {title}
              </h2>
              <p className="mt-1 text-xs leading-5 text-stone-500">{message}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close transaction popup"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
            >
              {"\u00d7"}
            </button>
          </div>

          {validTransactions.length > 0 ? (
            <div className="mt-4 space-y-2">
              {validTransactions.map((transaction) => (
                <div
                  key={`${transaction.label}-${transaction.hash}`}
                  className="rounded-xl border border-orange-100 bg-[var(--color-cream)] p-3"
                >
                  <p className="text-[10px] font-black uppercase tracking-wide text-stone-400">
                    {transaction.label}
                  </p>
                  <p className="mt-1 break-all font-mono text-xs font-bold leading-5 text-stone-700">
                    {transaction.hash}
                  </p>
                </div>
              ))}
            </div>
          ) : validHash ? (
            <div className="mt-4 rounded-xl border border-orange-100 bg-[var(--color-cream)] p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-stone-400">
                Transaction hash
              </p>
              <p className="mt-1 break-all font-mono text-xs font-bold leading-5 text-stone-700">
                {txHash}
              </p>
            </div>
          ) : null}

          {!pending && validTransactions.length > 0 ? (
            <div className="mt-3 grid gap-2">
              {validTransactions.map((transaction) => (
                <a
                  key={`link-${transaction.label}-${transaction.hash}`}
                  href={`https://sepolia.etherscan.io/tx/${transaction.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--color-orange)] px-4 py-2.5 text-center text-sm font-black text-white transition hover:bg-orange-600"
                >
                  View {transaction.label} {"\u2197"}
                </a>
              ))}
            </div>
          ) : !pending && validHash ? (
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-[var(--color-orange)] px-4 py-2.5 text-sm font-black text-white transition hover:bg-orange-600"
            >
              {actionLabel} {"\u2197"}
            </a>
          ) : null}
        </div>
        <style jsx global>{`
          @keyframes blockchain-success-in {
            from {
              opacity: 0;
              transform: translate3d(0, 18px, 0) scale(0.98);
            }
            to {
              opacity: 1;
              transform: translate3d(0, 0, 0) scale(1);
            }
          }
        `}</style>
      </aside>
    </div>
  );
}
