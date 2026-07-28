import Link from "next/link";
import { getDashboardProfile } from "@/lib/dashboard-access";
import { formatMYR, getShelterPortalData, sepoliaTxUrl, shortAddress } from "@/lib/shelter-portal";

type PageProps = { searchParams?: Promise<{ walletAddress?: string; campaign?: string; status?: string }> };

export default async function ShelterDonationsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { userId } = await getDashboardProfile("shelter", params?.walletAddress);
  const { campaigns, donations } = await getShelterPortalData(userId);
  const campaignMap = new Map(campaigns.map((campaign) => [campaign.id, campaign]));
  const visible = donations.filter((donation) =>
    (!params?.campaign || donation.campaign_id === params.campaign) &&
    (!params?.status || donation.status === params.status),
  );
  const total = visible
    .filter((item) => !["failed", "refunded"].includes(item.status.toLowerCase()))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <div className="space-y-5 py-6">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">Transactions</p>
        <h1 className="mt-1 text-3xl font-black">Donations Received</h1>
        <p className="mt-2 text-sm font-semibold text-stone-600">Every confirmed donation recorded for your campaigns.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        {[["Total received", formatMYR(total)], ["Transactions", String(visible.length)], ["Campaigns supported", String(new Set(visible.map((item) => item.campaign_id)).size)]].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-orange-100 bg-white p-5 shadow-[0_8px_24px_rgba(111,69,20,0.05)]"><p className="text-xs font-black uppercase text-stone-500">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>
        ))}
      </section>

      <section className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-[0_12px_36px_rgba(111,69,20,0.07)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-[#FFFCC9]/40 text-[11px] font-black uppercase tracking-wide text-stone-500"><tr><th className="px-5 py-4">Donor</th><th>Campaign</th><th>Amount</th><th>Date</th><th>Transaction</th><th className="pr-5">Status</th></tr></thead>
            <tbody className="divide-y divide-orange-100">
              {visible.map((donation) => {
                const txUrl = sepoliaTxUrl(donation.tx_hash);
                return (
                  <tr key={donation.id} className="transition hover:bg-orange-50/35">
                    <td className="px-5 py-4"><p className="font-black text-stone-950">{donation.donor_name?.trim() || "Anonymous donor"}</p><p className="mt-1 font-mono text-[10px] font-semibold text-stone-400">{shortAddress(donation.donor_id)}</p></td>
                    <td><Link href={`/Shelter/campaigns/${donation.campaign_id}`} className="font-black hover:text-[var(--color-orange)]">{campaignMap.get(donation.campaign_id)?.title ?? "Campaign"}</Link></td>
                    <td className="font-black">{formatMYR(donation.amount)}</td>
                    <td className="font-semibold text-stone-500">{new Intl.DateTimeFormat("en-MY", { dateStyle: "medium" }).format(new Date(donation.created_at))}</td>
                    <td>{txUrl ? <a href={txUrl} target="_blank" rel="noreferrer" className="font-mono text-xs font-black text-[var(--color-orange)] hover:underline">{shortAddress(donation.tx_hash)} Open</a> : "-"}</td>
                    <td className="pr-5"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black capitalize text-emerald-700 ring-1 ring-emerald-200">{donation.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!visible.length ? <div className="p-10 text-center text-sm font-bold text-stone-500">No donation transactions are available for this wallet yet.</div> : null}
        <div className="border-t border-orange-100 bg-[#FFFCC9]/30 px-5 py-3 text-xs font-bold text-stone-600">Donor names come from their PawChain profile. Wallet-only donations without an available name appear as Anonymous donor.</div>
      </section>
    </div>
  );
}
