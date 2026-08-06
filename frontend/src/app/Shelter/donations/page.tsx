import Link from "next/link";
import { decodeEventLog, formatEther, type Hash } from "viem";
import { campaignContractAbi } from "@/lib/campaign-contract-abi";
import { getPawChainPublicClient } from "@/lib/campaign-blockchain";
import { getLatestEthMyrRate } from "@/lib/currency";
import { getDashboardProfile } from "@/lib/dashboard-access";
import { getShelterPortalData, sepoliaTxUrl, shortAddress } from "@/lib/shelter-portal";

type PageProps = { searchParams?: Promise<{ walletAddress?: string; campaign?: string; status?: string }> };

function donationAmountEth(
  amountWei: string | null,
  amount: number | string,
  currency: string,
  liveEthMyrRate: number,
) {
  if (amountWei) {
    try {
      return Number(formatEther(BigInt(amountWei)));
    } catch {
      // Fall through for legacy donation records without a valid wei value.
    }
  }

  const storedAmount = Number(amount || 0);
  if (!Number.isFinite(storedAmount)) return 0;
  return currency.toUpperCase() === "ETH"
    ? storedAmount
    : storedAmount / liveEthMyrRate;
}

function formatEth(value: number) {
  return `${new Intl.NumberFormat("en-MY", {
    maximumFractionDigits: 6,
  }).format(value)} ETH`;
}

function formatLiveMyr(value: number) {
  return `≈ live MYR ${new Intl.NumberFormat("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

export default async function ShelterDonationsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { userId } = await getDashboardProfile("shelter", params?.walletAddress);
  const { campaigns, donations } = await getShelterPortalData(userId);
  const { rate: liveEthMyrRate } = await getLatestEthMyrRate();
  const campaignMap = new Map(campaigns.map((campaign) => [campaign.id, campaign]));
  const campaignDonations = donations.filter(
    (donation) => !params?.campaign || donation.campaign_id === params.campaign,
  );
  const publicClient = getPawChainPublicClient();
  const transactionGroups = await Promise.all(
    campaignDonations.map(async (donation) => {
      const amountEth = donationAmountEth(
        donation.amount_wei,
        donation.amount,
        donation.currency,
        liveEthMyrRate,
      );
      const originalStatus = donation.status.toLowerCase().includes("refund")
        ? "confirmed"
        : donation.status.toLowerCase();
      const records = [{
        key: `${donation.id}:donation`,
        donation,
        amountEth,
        date: donation.created_at,
        txHash: donation.tx_hash,
        status: originalStatus,
        statusLabel: originalStatus === "confirmed" ? "Confirmed" : donation.status,
      }];

      if (donation.refund_tx_hash) {
        let refundEth = amountEth;
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
            refundEth = Number(formatEther(refundLog.args.amount));
          }
        } catch {
          // Use the donation amount only as a fallback for legacy records.
        }

        records.push({
          key: `${donation.id}:refund`,
          donation,
          amountEth: refundEth,
          date: donation.refunded_at ?? donation.created_at,
          txHash: donation.refund_tx_hash,
          status: "refunded",
          statusLabel: "Refunded",
        });
      }

      return records;
    }),
  );
  const transactionRecords = transactionGroups
    .flat()
    .filter((record) => !params?.status || record.status === params.status)
    .sort(
      (first, second) =>
        new Date(second.date).getTime() - new Date(first.date).getTime(),
    );
  const totalEth = campaignDonations
    .filter(
      (item) =>
        item.status.toLowerCase() !== "failed",
    )
    .reduce(
      (sum, item) =>
        sum +
        donationAmountEth(
          item.amount_wei,
          item.amount,
          item.currency,
          liveEthMyrRate,
        ),
      0,
    );

  return (
    <div className="space-y-5 py-6">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">Transactions</p>
        <h1 className="mt-1 text-3xl font-black">Donations Received</h1>
        <p className="mt-2 text-sm font-semibold text-stone-600">Every confirmed donation recorded for your campaigns.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-[0_8px_24px_rgba(111,69,20,0.05)]">
          <p className="text-xs font-black uppercase text-stone-500">Total received</p>
          <p className="mt-2 text-2xl font-black">{formatEth(totalEth)}</p>
          <p className="mt-1 text-xs font-bold text-stone-500">
            {formatLiveMyr(totalEth * liveEthMyrRate)}
          </p>
        </div>
        {[
          ["Transactions", String(transactionRecords.length)],
          [
            "Campaigns supported",
            String(new Set(transactionRecords.map((item) => item.donation.campaign_id)).size),
          ],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-orange-100 bg-white p-5 shadow-[0_8px_24px_rgba(111,69,20,0.05)]">
            <p className="text-xs font-black uppercase text-stone-500">{label}</p>
            <p className="mt-2 text-2xl font-black">{value}</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-[0_12px_36px_rgba(111,69,20,0.07)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-[#FFFCC9]/40 text-[11px] font-black uppercase tracking-wide text-stone-500"><tr><th className="px-5 py-4">Donor</th><th>Campaign</th><th>Amount</th><th>Date</th><th>Transaction</th><th className="pr-5">Status</th></tr></thead>
            <tbody className="divide-y divide-orange-100">
              {transactionRecords.map((record) => {
                const { donation } = record;
                const txUrl = sepoliaTxUrl(record.txHash);
                const refunded = record.status === "refunded";
                return (
                  <tr key={record.key} className="transition hover:bg-orange-50/35">
                    <td className="px-5 py-4"><p className="font-black text-stone-950">{donation.donor_name?.trim() || "Anonymous donor"}</p><p className="mt-1 font-mono text-[10px] font-semibold text-stone-400">{shortAddress(donation.donor_wallet_address)}</p></td>
                    <td><Link href={`/Shelter/campaigns/${donation.campaign_id}`} className="font-black hover:text-[var(--color-orange)]">{campaignMap.get(donation.campaign_id)?.title ?? "Campaign"}</Link></td>
                    <td>
                      <p className="font-black text-stone-950">{formatEth(record.amountEth)}</p>
                      <p className="mt-1 text-xs font-bold text-stone-500">
                        {formatLiveMyr(record.amountEth * liveEthMyrRate)}
                      </p>
                    </td>
                    <td className="font-semibold text-stone-500">{new Intl.DateTimeFormat("en-MY", { dateStyle: "medium" }).format(new Date(record.date))}</td>
                    <td>{txUrl ? <a href={txUrl} target="_blank" rel="noreferrer" aria-label={`View ${record.status} transaction ${record.txHash} on Sepolia Etherscan`} className="font-mono text-xs font-black text-[var(--color-orange)] hover:underline">{shortAddress(record.txHash)} ↗</a> : "-"}</td>
                    <td className="pr-5">
                      <span
                        className={[
                          "rounded-full px-2.5 py-1 text-xs font-black capitalize ring-1",
                          refunded
                            ? "bg-red-50 text-red-700 ring-red-200"
                            : record.status === "confirmed"
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                              : "bg-stone-100 text-stone-700 ring-stone-200",
                        ].join(" ")}
                      >
                        {record.statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!transactionRecords.length ? <div className="p-10 text-center text-sm font-bold text-stone-500">No donation transactions are available for this wallet yet.</div> : null}
      </section>
    </div>
  );
}
