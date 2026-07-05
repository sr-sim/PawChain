import Link from "next/link";
import { notFound } from "next/navigation";
import { campaigns } from "../../campaignData";

const receipts = [
  {
    id: "DON-1007",
    campaignId: "medical-recovery",
    amount: "RM 350.00",
    date: "18 Jun 2026",
    wallet: "0x1FE2Ee638b8b12D8b4b0fb92b444557D40bC7611",
    txHash:
      "0xa71f2c8d9e3b4450b8a62f407ad58c1f3389db17346ed9c8ac49f8073e0b9182",
    status: "Under review",
  },
  {
    id: "DON-1004",
    campaignId: "food-support",
    amount: "RM 200.00",
    date: "02 Jun 2026",
    wallet: "0x1FE2Ee638b8b12D8b4b0fb92b444557D40bC7611",
    txHash:
      "0x6b0f1ad9349338e58a25311197c063f1dd8739c8bcdb86a29f25b62de0532aaf",
    status: "Funds released",
  },
  {
    id: "DON-1001",
    campaignId: "kennel-upgrade",
    amount: "RM 150.00",
    date: "21 May 2026",
    wallet: "0x1FE2Ee638b8b12D8b4b0fb92b444557D40bC7611",
    txHash:
      "0xd10944a47f12c1f96c51fc9dfd68f731e66fc884bdc3cb50870a62e247cfba93",
    status: "Pending proof",
  },
];

function shortHash(value: string) {
  return `${value.slice(0, 12)}...${value.slice(-10)}`;
}

export default async function DonorReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const receipt = receipts.find((item) => item.id === id);

  if (!receipt) {
    notFound();
  }

  const campaign = campaigns.find((item) => item.id === receipt.campaignId);

  return (
    <div className="space-y-5">
      <Link
        href="/Donor/tracking"
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
            <h1 className="text-2xl font-black tracking-tight text-stone-950 sm:text-3xl">
              {receipt.id}
            </h1>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              A donor-facing receipt preview for the blockchain donation record.
            </p>
          </div>
          <span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
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
            <button
              type="button"
              className="w-fit rounded-xl border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-[var(--color-orange)] transition hover:border-[var(--color-orange)] hover:bg-orange-50"
            >
              Print receipt
            </button>
          </div>
          <div className="mt-4 divide-y divide-orange-100 overflow-hidden rounded-xl border border-orange-100">
            {[
              ["Campaign", campaign?.title ?? "Campaign"],
              ["Shelter", campaign?.shelter ?? "-"],
              ["Amount", receipt.amount],
              ["Date", receipt.date],
              ["Wallet", receipt.wallet],
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
                    [0, 2, 4, 6, 8, 10, 12, 16, 18, 20, 22, 24].includes(index)
                      ? "bg-stone-900"
                      : "bg-orange-100",
                  ].join(" ")}
                />
              ))}
            </div>
            <p className="mt-3 text-center text-xs font-semibold text-stone-500">
              Transaction verification preview
            </p>
          </div>
          <div className="mt-4 space-y-3">
            {[
              "Wallet signature will confirm donor ownership.",
              "Smart contract record will link the campaign and amount.",
              "Milestone status will update after admin review.",
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
          <button
            type="button"
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-orange)] transition hover:border-[var(--color-orange)] hover:bg-orange-50"
          >
            Copy transaction hash
          </button>
        </div>
      </section>
    </div>
  );
}
