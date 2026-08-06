"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppKitAccount } from "@reown/appkit/react";
import { AdminSidebar } from "@/app/Admin/components/AdminSidebar";
import { DashboardTopBar } from "@/app/components/DashboardTopBar";

type SupportRequest = {
  id: string;
  request_type: string;
  campaign_id: string | null;
  campaign_title: string | null;
  shelter_id: string | null;
  shelter_name: string | null;
  donor_name: string | null;
  donor_email: string | null;
  subject: string;
  message: string;
  status: string;
  admin_response: string | null;
  created_at: string;
  updated_at: string;
  campaign: {
    id: string;
    title: string;
    description: string;
    image_url: string | null;
    goal_amount: number;
    current_amount: number;
    urgency_level: string;
    campaign_status: string;
  } | null;
};

const humanize = (value: string) => value.replaceAll("_", " ");

const formatDate = (value: string) => new Intl.DateTimeFormat("en-MY", {
  day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
}).format(new Date(value));

export default function AdminHelpSupportPage() {
  const { address, isConnected } = useAppKitAccount();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [campaignRequest, setCampaignRequest] = useState<SupportRequest | null>(null);
  const dismissedStorageKey = address
    ? `pawchain:admin-support-dismissed:${address.toLowerCase()}`
    : "";

  const dismissRequest = (requestId: string) => {
    if (!dismissedStorageKey) return;
    const dismissed = new Set<string>(
      JSON.parse(window.localStorage.getItem(dismissedStorageKey) || "[]") as string[],
    );
    dismissed.add(requestId);
    window.localStorage.setItem(dismissedStorageKey, JSON.stringify([...dismissed]));
    setRequests((current) => current.filter((item) => item.id !== requestId));
  };

  useEffect(() => {
    if (!address || !isConnected) { setRequests([]); setLoading(false); return; }
    let active = true;
    const load = async () => {
      setLoading(true); setError("");
      try {
        const response = await fetch(`/api/admin/support-requests?walletAddress=${encodeURIComponent(address)}`, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message ?? "Unable to load reports.");
        if (active) {
          const dismissed = new Set<string>(
            JSON.parse(window.localStorage.getItem(dismissedStorageKey) || "[]") as string[],
          );
          setRequests(
            (Array.isArray(result.requests) ? result.requests : []).filter(
              (item: SupportRequest) => !dismissed.has(item.id),
            ),
          );
        }
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Unable to load reports.");
      } finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [address, dismissedStorageKey, isConnected]);

  return <>
    <DashboardTopBar role="Admin" isMenuOpen={sidebarOpen} onMenuClick={() => setSidebarOpen((value) => !value)} />
    <AdminSidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
    <main className={`min-h-screen bg-[var(--color-cream)] pt-16 transition-[padding] ${sidebarOpen ? "lg:pl-64" : ""}`}>
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-7 sm:px-8">
        <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">Help &amp; Support</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-950">Donor reports</h1>
          <p className="mt-2 text-sm text-stone-600">Review reported campaigns and contact the reporting donor when more information is needed.</p>
        </section>
        {error ? <p className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <section className="space-y-3">
          {loading ? <div className="rounded-2xl border border-orange-100 bg-white p-8 text-center text-sm font-semibold text-stone-500">Loading reports...</div> : requests.length ? requests.map((item) => (
            <article key={item.id} className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h2 className="font-black text-stone-950">{item.subject}</h2><p className="mt-1 text-xs font-medium text-stone-400">{formatDate(item.created_at)}</p></div>
                <button type="button" onClick={() => dismissRequest(item.id)} aria-label={`Remove report ${item.id} from this view`} title="Remove card" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-red-100 bg-white text-stone-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></svg>
                </button>
              </div>
              <dl className="mt-4 grid gap-3 rounded-xl bg-orange-50/40 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div><dt className="font-bold text-stone-500">Request type</dt><dd className="mt-1 font-semibold capitalize text-stone-950">{humanize(item.request_type)}</dd></div>
                <div><dt className="font-bold text-stone-500">Campaign</dt><dd className="mt-1 font-semibold text-stone-950">{item.campaign_title ?? "Not linked"}</dd></div>
                <div><dt className="font-bold text-stone-500">Shelter</dt><dd className="mt-1 font-semibold text-stone-950">{item.shelter_name ?? "Not linked"}</dd></div>
                <div><dt className="font-bold text-stone-500">Report reference</dt><dd className="mt-1 break-all font-semibold text-stone-950">{item.id}</dd></div>
                <div><dt className="font-bold text-stone-500">Donor contact</dt><dd className="mt-1 font-semibold text-stone-950">{item.donor_name ?? "Donor"}<br />{item.donor_email ? <a className="text-orange-600 hover:underline" href={`mailto:${item.donor_email}`}>{item.donor_email}</a> : "Email unavailable"}</dd></div>
                <div><dt className="font-bold text-stone-500">Submitted</dt><dd className="mt-1 font-semibold text-stone-950">{formatDate(item.created_at)}</dd></div>
                <div><dt className="font-bold text-stone-500">Last updated</dt><dd className="mt-1 font-semibold text-stone-950">{formatDate(item.updated_at)}</dd></div>
              </dl>
              <div className="mt-4"><h3 className="text-xs font-bold uppercase tracking-wide text-stone-500">Donor message</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">{item.message}</p></div>
              {item.admin_response ? <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4"><h3 className="text-xs font-bold uppercase tracking-wide text-emerald-700">Admin response</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">{item.admin_response}</p></div> : null}
              {item.campaign ? <Link href={`/Admin/campaign-management?campaignId=${encodeURIComponent(item.campaign.id)}${address ? `&walletAddress=${encodeURIComponent(address)}` : ""}`} className="mt-4 inline-flex rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600">View details</Link> : null}
            </article>
          )) : <div className="rounded-2xl border border-orange-100 bg-white p-8 text-center"><h2 className="font-black text-stone-950">No donor reports</h2><p className="mt-2 text-sm text-stone-500">New reports will appear here.</p></div>}
        </section>
      </div>
    </main>
    {campaignRequest?.campaign ? <div className="fixed inset-0 z-[80] grid place-items-center bg-stone-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="campaign-dialog-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setCampaignRequest(null); }}>
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-orange-100 bg-white shadow-2xl">
        {campaignRequest.campaign.image_url ? <img src={campaignRequest.campaign.image_url} alt="" className="h-56 w-full object-cover" /> : null}
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">Reported campaign</p><h2 id="campaign-dialog-title" className="mt-1 text-2xl font-black text-stone-950">{campaignRequest.campaign.title}</h2></div>
            <button type="button" onClick={() => setCampaignRequest(null)} aria-label="Close campaign details" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-stone-200 text-xl text-stone-500 hover:bg-stone-50">×</button>
          </div>
          <div className="mt-4 grid gap-3 rounded-xl bg-orange-50/50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div><p className="font-bold text-stone-500">Status</p><p className="mt-1 font-semibold capitalize text-stone-950">{humanize(campaignRequest.campaign.campaign_status)}</p></div>
            <div><p className="font-bold text-stone-500">Urgency</p><p className="mt-1 font-semibold capitalize text-stone-950">{campaignRequest.campaign.urgency_level}</p></div>
            <div><p className="font-bold text-stone-500">Raised</p><p className="mt-1 font-semibold text-stone-950">RM {Number(campaignRequest.campaign.current_amount ?? 0).toLocaleString("en-MY")}</p></div>
            <div><p className="font-bold text-stone-500">Goal</p><p className="mt-1 font-semibold text-stone-950">RM {Number(campaignRequest.campaign.goal_amount ?? 0).toLocaleString("en-MY")}</p></div>
          </div>
          <div className="mt-5"><h3 className="font-black text-stone-950">Campaign description</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-600">{campaignRequest.campaign.description}</p></div>
          <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50 p-4"><h3 className="font-black text-stone-950">Related donor report</h3><p className="mt-2 text-sm font-semibold text-stone-700">{campaignRequest.subject}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-600">{campaignRequest.message}</p><p className="mt-3 break-all text-xs font-medium text-stone-500">Reference: {campaignRequest.id}</p></div>
        </div>
      </div>
    </div> : null}
  </>;
}
