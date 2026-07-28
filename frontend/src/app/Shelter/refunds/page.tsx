import Link from "next/link";
import { getDashboardProfile } from "@/lib/dashboard-access";
import { formatMYR, getShelterPortalData, sepoliaTxUrl, shortAddress } from "@/lib/shelter-portal";

type PageProps = { searchParams?: Promise<{ walletAddress?: string }> };

export default async function ShelterRefundsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { userId } = await getDashboardProfile("shelter", params?.walletAddress);
  const { campaigns, donations } = await getShelterPortalData(userId);
  const campaignMap = new Map(campaigns.map((campaign) => [campaign.id, campaign]));
  const refundRows = donations.filter((donation) => donation.status.toLowerCase().includes("refund"));
  return <div className="space-y-5 py-6">
    <header><p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">Fund protection</p><h1 className="mt-1 text-3xl font-black">Refunds</h1><p className="mt-2 text-sm font-semibold text-stone-600">Read-only history of donor refunds for expired or cancelled campaigns.</p></header>
    <section className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-[0_12px_36px_rgba(111,69,20,0.07)]"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#FFFCC9]/40 text-[11px] font-black uppercase tracking-wide text-stone-500"><tr><th className="px-5 py-4">Campaign</th><th>Reason</th><th>Refund amount</th><th>Donor</th><th>Transaction</th><th className="pr-5">Status</th></tr></thead><tbody className="divide-y divide-orange-100">{refundRows.map((row) => { const campaign = campaignMap.get(row.campaign_id); return <tr key={row.id}><td className="px-5 py-4"><Link href={`/Shelter/campaigns/${row.campaign_id}`} className="font-black hover:text-[var(--color-orange)]">{campaign?.title ?? "Campaign"}</Link></td><td className="font-semibold text-stone-600">{campaign?.campaign_status === "closed" ? "Campaign expired or closed" : "Campaign refund enabled"}</td><td className="font-black">{formatMYR(row.amount)}</td><td className="font-bold">{shortAddress(row.donor_id)}</td><td>{sepoliaTxUrl(row.tx_hash) ? <a href={sepoliaTxUrl(row.tx_hash)!} target="_blank" rel="noreferrer" className="font-mono text-xs font-black text-[var(--color-orange)]">{shortAddress(row.tx_hash)} ↗</a> : "-"}</td><td className="pr-5"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">Refunded</span></td></tr>; })}</tbody></table></div>{!refundRows.length ? <div className="p-10 text-center"><p className="font-black">No refund records</p><p className="mt-2 text-sm font-semibold text-stone-500">Refunds claimed by donors will appear here from existing donation records.</p></div> : null}<div className="border-t border-orange-100 bg-[#FFFCC9]/30 px-5 py-3 text-xs font-bold text-stone-600">Refunds are determined by campaign contract state. This page does not create manual refund records.</div></section>
  </div>;
}
