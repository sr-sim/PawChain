import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintReceiptButton } from "@/app/components/PrintReceiptButton";
import { getDonorDonationById } from "@/lib/donor-donations";
import {
  getAddressExplorerUrl,
  getExplorerNetworkName,
  getTransactionExplorerUrl,
  shortAddress,
} from "@/lib/block-explorer";

type ReceiptPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    walletAddress?: string;
  }>;
};

const statusStyles: Record<string, string> = {
  Confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Pending: "border-amber-200 bg-amber-50 text-amber-700",
  Failed: "border-red-200 bg-red-50 text-red-700",
  Refunded: "border-sky-200 bg-sky-50 text-sky-700",
};

function shortHash(value: string) {
  return `${value.slice(0, 12)}...${value.slice(-10)}`;
}

function formatAmount(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatEth(value: number) {
  return `${value.toLocaleString("en-MY", {
    maximumFractionDigits: 6,
  })} ETH`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function DonorReceiptPage({
  params,
  searchParams,
}: ReceiptPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const walletAddress = query?.walletAddress;
  const receipt = await getDonorDonationById(id, walletAddress);

  if (!receipt) {
    notFound();
  }

  const trackingHref = walletAddress
    ? `/Donor/tracking?walletAddress=${encodeURIComponent(walletAddress)}`
    : "/Donor/tracking";
  const explorerUrl = getTransactionExplorerUrl(receipt.txHash);
  const refundExplorerUrl = receipt.refundTxHash
    ? getTransactionExplorerUrl(receipt.refundTxHash)
    : "";
  const contractUrl = receipt.contractAddress
    ? getAddressExplorerUrl(receipt.contractAddress)
    : "";
  const receiptAmount = receipt.amountEth > 0
    ? formatEth(receipt.amountEth)
    : formatAmount(receipt.amount, receipt.currency);
  const receiptAmountEstimate = receipt.amountEth > 0
    ? formatAmount(receipt.amount, receipt.currency)
    : "";

  return (
    <div className="space-y-5">
      <Link
        href={trackingHref}
        className="inline-flex items-center rounded-xl border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-[var(--color-orange)] transition hover:border-[var(--color-orange)] hover:bg-orange-50"
      >
        Back to tracking
      </Link>

      <section className="donor-tech-hero rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
          Donation receipt
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-stone-950 sm:text-3xl">
              Receipt confirmed
            </h1>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              {receipt.campaignTitle} - {receiptAmount}
              {receiptAmountEstimate ? ` (${receiptAmountEstimate})` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PrintReceiptButton />
            <span
              className={[
                "w-fit rounded-full border px-3 py-1 text-xs font-semibold",
                statusStyles[receipt.status] ??
                  "border-slate-200 bg-slate-50 text-slate-600",
              ].join(" ")}
            >
              {receipt.status}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-black text-stone-950">
              Receipt details
            </h2>
            <Link
              href={`/Donor/campaigns/${receipt.campaignId}`}
              className="w-fit rounded-xl border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-[var(--color-orange)] transition hover:border-[var(--color-orange)] hover:bg-orange-50"
            >
              View campaign
            </Link>
          </div>
          <div className="mt-4 divide-y divide-orange-100 overflow-hidden rounded-xl border border-orange-100">
            {[
              ["Receipt ID", receipt.id],
              ["Campaign", receipt.campaignTitle],
              ["Shelter", receipt.shelterName],
              ["Amount", receiptAmount],
              ...(receiptAmountEstimate
                ? ([["MYR value", receiptAmountEstimate]] as [string, string][])
                : []),
              ["Network", getExplorerNetworkName()],
              ["Date", formatDate(receipt.createdAt)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="grid gap-2 bg-orange-50/20 px-3 py-3 text-sm sm:grid-cols-[10rem_1fr]"
              >
                <p className="font-medium text-stone-500">{label}</p>
                <p className="break-all font-semibold text-stone-950">{value}</p>
              </div>
            ))}
            <div className="grid gap-2 bg-orange-50/20 px-3 py-3 text-sm sm:grid-cols-[10rem_1fr]">
              <p className="font-medium text-stone-500">Campaign contract</p>
              {contractUrl && receipt.contractAddress ? (
                <a
                  href={contractUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all font-semibold text-[var(--color-orange)] transition hover:text-stone-950"
                >
                  {shortAddress(receipt.contractAddress)}
                </a>
              ) : (
                <p className="break-all font-semibold text-stone-950">
                  Contract not recorded
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-stone-950">Blockchain proof</h2>
          <div className="mt-4 rounded-xl border border-orange-100 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
              Transaction hash
            </p>
            <p className="mt-2 break-all text-sm font-semibold text-stone-950">
              {receipt.txHash}
            </p>
            {explorerUrl ? (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-black text-[var(--color-orange)] transition hover:border-[var(--color-orange)] hover:bg-orange-100"
              >
                View transaction on Etherscan
              </a>
            ) : null}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-orange-100 bg-orange-50/25 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
                Wallet
              </p>
              <p className="mt-1 break-all text-sm font-semibold text-stone-950">
                {walletAddress ?? "-"}
              </p>
            </div>
            <div className="rounded-xl border border-orange-100 bg-orange-50/25 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
                Verification
              </p>
              <p className="mt-1 text-sm font-semibold text-stone-950">
                Donor record matched
              </p>
            </div>
          </div>
          {receipt.refundTxHash ? (
            <div className="mt-4 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                    Refund proof
                  </p>
                  <h3 className="mt-1 text-lg font-black text-stone-950">
                    Contract refund received
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-stone-600">
                    {receipt.refundAmountEth > 0
                      ? `+${formatEth(receipt.refundAmountEth)}`
                      : "Refund confirmed"}
                  </p>
                  {receipt.refundAmountEth > 0 ? (
                    <p className="mt-1 text-xs font-semibold text-stone-500">
                      {formatAmount(receipt.refundAmount, receipt.currency)}
                    </p>
                  ) : null}
                  {receipt.refundedAt ? (
                    <p className="mt-1 text-xs font-semibold text-stone-500">
                      {formatDate(receipt.refundedAt)}
                    </p>
                  ) : null}
                </div>
                {refundExplorerUrl ? (
                  <a
                    href={refundExplorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-fit rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-emerald-700 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50"
                  >
                    View refund on Etherscan
                  </a>
                ) : null}
              </div>
              <div className="mt-3 rounded-xl border border-emerald-100 bg-white/75 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
                  Refund transaction hash
                </p>
                <p className="mt-2 break-all text-sm font-semibold text-stone-950">
                  {receipt.refundTxHash}
                </p>
                <p className="mt-2 text-xs font-semibold leading-5 text-stone-500">
                  MetaMask may show 0 ETH for the claim call. Etherscan shows
                  the actual refund under internal transfers from the campaign
                  contract.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
