import Link from "next/link";
import { notFound } from "next/navigation";
import { getDonorDonationById } from "@/lib/donor-donations";

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

  return (
    <div className="space-y-5">
      <Link
        href={trackingHref}
        className="inline-flex items-center rounded-xl border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-[var(--color-orange)] transition hover:border-[var(--color-orange)] hover:bg-orange-50"
      >
        Back to tracking
      </Link>

      <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
          Donation receipt
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="break-all text-2xl font-black tracking-tight text-stone-950 sm:text-3xl">
              {receipt.id}
            </h1>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Verified donor receipt generated from the Supabase donation
              history record.
            </p>
          </div>
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
              ["Campaign", receipt.campaignTitle],
              ["Shelter", receipt.shelterName],
              ["Location", receipt.location],
              ["Amount", formatAmount(receipt.amount, receipt.currency)],
              ["Date", formatDate(receipt.createdAt)],
              ["Wallet", walletAddress ?? "-"],
              ["Transaction hash", shortHash(receipt.txHash)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="grid gap-2 bg-orange-50/20 px-3 py-3 text-sm sm:grid-cols-[10rem_1fr]"
              >
                <p className="font-medium text-stone-500">{label}</p>
                <p className="break-all font-semibold text-stone-950">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-stone-950">Verification</h2>
          <div className="mt-4 grid place-items-center rounded-xl border border-orange-100 bg-orange-50/30 p-5">
            <div className="grid h-28 w-28 grid-cols-5 gap-1 rounded-xl bg-white p-3 ring-1 ring-orange-100">
              {Array.from({ length: 25 }).map((_, index) => (
                <span
                  key={index}
                  className={[
                    "rounded-sm",
                    [0, 2, 4, 6, 8, 10, 12, 16, 18, 20, 22, 24].includes(
                      index,
                    )
                      ? "bg-stone-900"
                      : "bg-orange-100",
                  ].join(" ")}
                />
              ))}
            </div>
            <p className="mt-3 text-center text-xs font-semibold text-stone-500">
              Transaction hash linked to donor history
            </p>
          </div>
          <div className="mt-4 space-y-3">
            {[
              "Donation record belongs to the connected donor wallet.",
              "Campaign and shelter context are loaded from Supabase.",
              "Smart contract explorer link can be added after Web3 network is finalized.",
            ].map((item, index) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-xl border border-orange-100 bg-orange-50/25 p-3"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-xs font-black text-[var(--color-orange)] ring-1 ring-orange-100">
                  {index + 1}
                </span>
                <p className="text-sm leading-6 text-stone-600">{item}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-orange-100 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
              Full transaction hash
            </p>
            <p className="mt-2 break-all text-sm font-semibold text-stone-950">
              {receipt.txHash}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
