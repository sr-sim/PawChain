import Link from "next/link";
import { decodeEventLog, formatEther, type Hash } from "viem";
import { campaignContractAbi } from "@/lib/campaign-contract-abi";
import { getPawChainPublicClient } from "@/lib/campaign-blockchain";
import { getLatestEthMyrRate } from "@/lib/currency";
import { getDashboardProfile } from "@/lib/dashboard-access";
import {
  getShelterPortalData,
  sepoliaTxUrl,
  shortAddress,
} from "@/lib/shelter-portal";

type PageProps = { searchParams?: Promise<{ walletAddress?: string }> };

function formatLiveMyr(value: number) {
  return `≈ live MYR ${new Intl.NumberFormat("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

function formatRefundDate(value?: string | null) {
  if (!value) return "Date unavailable";
  return new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default async function ShelterRefundsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { userId } = await getDashboardProfile("shelter", params?.walletAddress);
  const { campaigns, donations } = await getShelterPortalData(userId);
  const { rate: liveEthMyrRate } = await getLatestEthMyrRate();
  const campaignMap = new Map(
    campaigns.map((campaign) => [campaign.id, campaign]),
  );
  const refundDonations = donations.filter(
    (donation) =>
      donation.refund_tx_hash || donation.status.toLowerCase().includes("refund"),
  );
  const publicClient = getPawChainPublicClient();
  const refundRows = await Promise.all(
    refundDonations.map(async (donation) => {
      let refundWei = donation.amount_wei
        ? BigInt(donation.amount_wei)
        : BigInt(0);

      if (donation.refund_tx_hash) {
        try {
          const receipt = await publicClient.getTransactionReceipt({
            hash: donation.refund_tx_hash as Hash,
          });
          const refundLog = receipt.logs
            .map((log) => {
              try {
                return decodeEventLog({
                  abi: campaignContractAbi,
                  data: log.data,
                  topics: log.topics,
                });
              } catch {
                return null;
              }
            })
            .find((log) => log?.eventName === "RefundClaimed");

          if (refundLog?.eventName === "RefundClaimed") {
            refundWei = refundLog.args.amount;
          }
        } catch {
          // Use the original on-chain donation amount as the display fallback.
        }
      }

      return { ...donation, refundEth: Number(formatEther(refundWei)) };
    }),
  );

  const totalRefundedEth = refundRows.reduce(
    (total, refund) => total + refund.refundEth,
    0,
  );
  const affectedCampaigns = new Set(
    refundRows.map((refund) => refund.campaign_id),
  ).size;
  const refundedDonors = new Set(refundRows.map((refund) => refund.donor_id)).size;
  const verifiedRefunds = refundRows.filter(
    (refund) => Boolean(refund.refund_tx_hash),
  ).length;
  const latestRefund = refundRows[0];
  const latestRefundHash = latestRefund?.refund_tx_hash ?? null;
  const latestRefundUrl = sepoliaTxUrl(latestRefundHash);

  return (
    <div className="space-y-5 py-6">
      <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
              Fund protection
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-stone-950 sm:text-3xl">
              Refund ledger
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Monitor refunds claimed by donors from your expired or cancelled
              campaigns, with on-chain transaction proof for every completed claim.
            </p>
          </div>
          <Link
            href="/Shelter/campaigns"
            className="inline-flex w-fit items-center justify-center rounded-xl bg-[var(--color-orange)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            View my campaigns
          </Link>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-[0_22px_60px_rgba(120,72,0,0.09)]">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
          <div className="p-5 sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">
              Refund overview
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-stone-500">
                  Total returned to donors
                </p>
                <h2 className="mt-1 text-4xl font-black tracking-tight text-stone-950">
                  {totalRefundedEth.toLocaleString("en-MY", {
                    maximumFractionDigits: 6,
                  })} ETH
                </h2>
                <p className="mt-1 text-sm font-semibold text-stone-500">
                  {formatLiveMyr(totalRefundedEth * liveEthMyrRate)}
                </p>
              </div>
              <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                {verifiedRefunds} verified tx
              </span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                ["Refund claims", refundRows.length],
                ["Donors refunded", refundedDonors],
                ["Campaigns affected", affectedCampaigns],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl bg-orange-50/45 p-4 ring-1 ring-orange-100"
                >
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-stone-400">
                    {label}
                  </p>
                  <p className="mt-1 text-2xl font-black text-stone-950">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-orange-100 bg-orange-50/25 p-5 sm:p-6 lg:border-l lg:border-t-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">
                  Blockchain proof
                </p>
                <h2 className="mt-1 text-xl font-black text-stone-950">
                  Refund verification
                </h2>
              </div>
              <span className="rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-black text-[var(--color-orange)]">
                Sepolia
              </span>
            </div>
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-orange-100 bg-white p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold text-stone-500">
                    Confirmed refund claims
                  </span>
                  <span className="text-lg font-black text-stone-950">
                    {verifiedRefunds}
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-orange-100 bg-white p-4">
                <p className="text-sm font-semibold text-stone-500">
                  Latest refund transaction
                </p>
                {latestRefundUrl && latestRefundHash ? (
                  <a
                    href={latestRefundUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex font-mono text-sm font-black text-[var(--color-orange)] transition hover:text-stone-950"
                  >
                    {shortAddress(latestRefundHash)} ↗
                  </a>
                ) : (
                  <p className="mt-2 text-sm font-black text-stone-950">
                    No transaction yet
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
              Shelter refund ledger
            </p>
            <h2 className="mt-1 text-xl font-black text-stone-950">
              Donor refund history
            </h2>
          </div>
          <p className="text-xs font-semibold text-stone-500">
            Read-only contract records
          </p>
        </div>

        {refundRows.length > 0 ? (
          <div className="mt-4 overflow-hidden rounded-xl border border-orange-100">
            <div className="hidden grid-cols-[1.3fr_1fr_1fr_0.9fr_7rem] gap-3 border-b border-orange-100 bg-orange-50/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-stone-400 lg:grid">
              <span>Campaign</span>
              <span>Donor</span>
              <span>Refund amount</span>
              <span>Transaction</span>
              <span className="text-center">Status</span>
            </div>
            <div className="divide-y divide-orange-100">
              {refundRows.map((row) => {
                const campaign = campaignMap.get(row.campaign_id);
                const refundTxHash = row.refund_tx_hash ?? row.tx_hash;
                const refundTxUrl = sepoliaTxUrl(refundTxHash);
                const reason =
                  campaign?.campaign_status === "closed"
                    ? "Campaign expired or closed"
                    : "Campaign refund enabled";

                return (
                  <article
                    key={row.id}
                    className="grid gap-4 px-4 py-4 text-sm transition hover:bg-orange-50/25 lg:grid-cols-[1.3fr_1fr_1fr_0.9fr_7rem] lg:items-center"
                  >
                    <div>
                      <Link
                        href={`/Shelter/campaigns/${row.campaign_id}`}
                        className="font-black text-stone-950 transition hover:text-[var(--color-orange)]"
                      >
                        {campaign?.title ?? "Campaign"}
                      </Link>
                      <p className="mt-1 text-xs font-semibold text-stone-500">
                        {reason}
                      </p>
                    </div>
                    <div>
                      <p className="font-bold text-stone-950">
                        {row.donor_name || "Anonymous donor"}
                      </p>
                      <p className="mt-1 font-mono text-xs text-stone-500">
                        {shortAddress(row.donor_wallet_address)}
                      </p>
                    </div>
                    <div>
                      <p className="font-black text-stone-950">
                        {row.refundEth.toLocaleString("en-MY", {
                          maximumFractionDigits: 6,
                        })} ETH
                      </p>
                      <p className="mt-1 text-xs font-bold text-stone-400">
                        {formatLiveMyr(row.refundEth * liveEthMyrRate)}
                      </p>
                    </div>
                    <div>
                      {refundTxUrl ? (
                        <a
                          href={refundTxUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-xs font-black text-[var(--color-orange)] transition hover:text-stone-950"
                        >
                          {shortAddress(refundTxHash)} ↗
                        </a>
                      ) : (
                        <span className="text-stone-400">Unavailable</span>
                      )}
                      <p className="mt-1 text-xs font-semibold text-stone-500">
                        {formatRefundDate(row.refunded_at ?? row.created_at)}
                      </p>
                    </div>
                    <div className="lg:text-center">
                      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">
                        Refunded
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-orange-200 bg-orange-50/30 p-10 text-center">
            <p className="font-black text-stone-950">No refund records</p>
            <p className="mt-2 text-sm font-semibold text-stone-500">
              Refunds claimed by donors from your campaigns will appear here.
            </p>
          </div>
        )}

        <p className="mt-4 border-t border-orange-100 pt-4 text-xs font-semibold leading-5 text-stone-500">
          Refund eligibility and amounts are determined by each campaign smart
          contract. This shelter view does not create or edit refund records.
        </p>
      </section>
    </div>
  );
}
