"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { campaigns } from "../campaignData";

const trackedDonations = [
  {
    id: "DON-1007",
    campaignId: "medical-recovery",
    amount: "RM 350.00",
    date: "18 Jun 2026",
    txHash: "0xa71f2c8d9e3b4450b8a62f407ad58c1f3389db17346ed9c8ac49f8073e0b9182",
    status: "Confirmed",
    releaseStatus: "Under review",
    usage: [
      { label: "Vet consultation", amount: "RM 120.00", status: "Released" },
      { label: "Treatment deposit", amount: "RM 180.00", status: "Under review" },
      { label: "Recovery supplies", amount: "RM 50.00", status: "Locked" },
    ],
    milestones: [
      { title: "Vet quotation uploaded", status: "Approved", percentage: 25 },
      { title: "Treatment payment proof", status: "Under review", percentage: 45 },
      { title: "Recovery progress update", status: "Waiting", percentage: 30 },
    ],
  },
  {
    id: "DON-1004",
    campaignId: "food-support",
    amount: "RM 200.00",
    date: "02 Jun 2026",
    txHash: "0x6b0f1ad9349338e58a25311197c063f1dd8739c8bcdb86a29f25b62de0532aaf",
    status: "Confirmed",
    releaseStatus: "Funds released",
    usage: [
      { label: "Food supplier invoice", amount: "RM 80.00", status: "Released" },
      { label: "First delivery proof", amount: "RM 70.00", status: "Released" },
      { label: "Monthly feeding report", amount: "RM 50.00", status: "Locked" },
    ],
    milestones: [
      { title: "Food supplier invoice", status: "Approved", percentage: 30 },
      { title: "First delivery proof", status: "Approved", percentage: 30 },
      { title: "Monthly feeding report", status: "Waiting", percentage: 40 },
    ],
  },
  {
    id: "DON-1001",
    campaignId: "kennel-upgrade",
    amount: "RM 150.00",
    date: "21 May 2026",
    txHash: "0xd10944a47f12c1f96c51fc9dfd68f731e66fc884bdc3cb50870a62e247cfba93",
    status: "Confirmed",
    releaseStatus: "Pending proof",
    usage: [
      { label: "Equipment purchase", amount: "RM 90.00", status: "Released" },
      { label: "Kennel setup photos", amount: "RM 45.00", status: "Pending proof" },
      { label: "Final safety check", amount: "RM 15.00", status: "Locked" },
    ],
    milestones: [
      { title: "Equipment purchase", status: "Approved", percentage: 40 },
      { title: "Kennel setup photos", status: "Pending proof", percentage: 35 },
      { title: "Final safety check", status: "Waiting", percentage: 25 },
    ],
  },
];

const trackingFilters = ["All", "Funds released", "Under review", "Pending proof"];

const statusStyles: Record<string, string> = {
  Approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Released: "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Funds released": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Under review": "border-amber-200 bg-amber-50 text-amber-700",
  "Pending proof": "border-slate-200 bg-slate-50 text-slate-600",
  Locked: "border-slate-200 bg-slate-50 text-slate-600",
  Waiting: "border-slate-200 bg-slate-50 text-slate-600",
};

function getCampaign(campaignId: string) {
  return campaigns.find((campaign) => campaign.id === campaignId);
}

function shortHash(hash: string) {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={[
        "inline-flex min-w-[7.25rem] justify-center rounded-full border px-2.5 py-1 text-center text-[0.68rem] font-semibold whitespace-nowrap",
        statusStyles[status] ?? "bg-slate-100 text-slate-600",
      ].join(" ")}
    >
      {status}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-orange-100">
      <div
        className="donor-progress-fill h-full rounded-full bg-[var(--color-orange)]"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export default function DonorTrackingPage() {
  const [filter, setFilter] = useState("All");
  const [selectedProof, setSelectedProof] = useState<{
    campaign: string;
    title: string;
    status: string;
    percentage: number;
  } | null>(null);
  const totalDonated = "RM 700.00";
  const confirmedCount = trackedDonations.length;
  const releasedCount = trackedDonations.filter(
    (donation) => donation.releaseStatus === "Funds released",
  ).length;
  const reviewCount = trackedDonations.filter(
    (donation) => donation.releaseStatus === "Under review",
  ).length;
  const filteredDonations = useMemo(() => {
    if (filter === "All") {
      return trackedDonations;
    }

    return trackedDonations.filter((donation) => donation.releaseStatus === filter);
  }, [filter]);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
              Tracking
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-stone-950 sm:text-3xl">
              Donation tracking and fund transparency
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Review every donation, transaction hash, fund release, and
              milestone update for campaigns you have supported.
            </p>
          </div>
          <Link
            href="/Donor/discover"
            className="inline-flex w-fit items-center justify-center rounded-xl bg-[var(--color-orange)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            Support another campaign
          </Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {[
          { label: "Total donated", value: totalDonated, detail: "Confirmed on-chain" },
          { label: "Past donations", value: String(confirmedCount), detail: "With transaction hashes" },
          { label: "Funds released", value: String(releasedCount), detail: "Approved milestones" },
          { label: "Under review", value: String(reviewCount), detail: "Waiting for proof approval" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
              {stat.label}
            </p>
            <p className="mt-2 text-2xl font-black text-stone-950">
              {stat.value}
            </p>
            <p className="mt-1 text-xs font-medium text-stone-500">
              {stat.detail}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
              Donation ledger
            </p>
            <h2 className="mt-1 text-xl font-black text-stone-950">
              Past donations and blockchain hashes
            </h2>
          </div>
          <p className="text-xs font-medium text-stone-500">
            Local preview data until live donation records are connected.
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-orange-100 bg-orange-50/20 p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {trackingFilters.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={[
                  "rounded-xl border px-3 py-2 text-xs font-semibold transition",
                  filter === item
                    ? "border-[var(--color-orange)] bg-white text-[var(--color-orange)]"
                    : "border-orange-100 bg-white/70 text-stone-600 hover:border-orange-200",
                ].join(" ")}
              >
                {item}
              </button>
            ))}
          </div>
          <p className="text-xs font-semibold text-stone-500">
            Showing {filteredDonations.length} of {trackedDonations.length} donations
          </p>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-orange-100">
          <div className="hidden grid-cols-[0.75fr_1.25fr_0.7fr_0.95fr_0.95fr] gap-4 bg-orange-50/55 px-4 py-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-stone-500 lg:grid">
            <span>ID</span>
            <span>Campaign</span>
            <span>Amount</span>
            <span>Tx hash</span>
            <span>Status</span>
          </div>
          <div className="divide-y divide-orange-100">
            {filteredDonations.map((donation) => {
              const campaign = getCampaign(donation.campaignId);

              return (
                <article
                  key={donation.id}
                  className="grid gap-3 px-4 py-3 text-sm lg:grid-cols-[0.75fr_1.25fr_0.7fr_0.95fr_0.95fr] lg:items-center"
                >
                  <div>
                    <p className="font-semibold text-stone-950">{donation.id}</p>
                    <p className="mt-1 text-xs font-medium text-stone-500">
                      {donation.date}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-stone-950">
                      {campaign?.title ?? "Campaign"}
                    </p>
                    <p className="mt-1 text-xs font-medium text-stone-500">
                      {campaign?.shelter ?? "-"}
                    </p>
                  </div>
                  <p className="font-semibold text-stone-950">{donation.amount}</p>
                  <a
                    href={`https://etherscan.io/tx/${donation.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs font-semibold text-[var(--color-orange)] transition hover:text-stone-950"
                  >
                    {shortHash(donation.txHash)}
                  </a>
                  <div className="flex flex-wrap gap-2">
                    <StatusPill status={donation.status} />
                    <StatusPill status={donation.releaseStatus} />
                    <a
                      href={`data:text/plain;charset=utf-8,Donation%20receipt%0AID:%20${donation.id}%0ACampaign:%20${encodeURIComponent(campaign?.title ?? "Campaign")}%0AAmount:%20${encodeURIComponent(donation.amount)}%0ATx:%20${donation.txHash}`}
                      download={`${donation.id}-receipt.txt`}
                      className="inline-flex min-w-[7.25rem] justify-center rounded-full border border-orange-200 bg-white px-2.5 py-1 text-[0.68rem] font-semibold text-[var(--color-orange)] transition hover:bg-orange-50"
                    >
                      Download
                    </a>
                    <Link
                      href={`/Donor/receipt/${donation.id}`}
                      className="inline-flex min-w-[7.25rem] justify-center rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[0.68rem] font-semibold text-[var(--color-orange)] transition hover:bg-white"
                    >
                      Receipt
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
            Fund usage
          </p>
          <h2 className="mt-1 text-xl font-black text-stone-950">
            How donated funds are being used
          </h2>

          <div className="mt-4 space-y-3">
            {filteredDonations.map((donation) => {
              const campaign = getCampaign(donation.campaignId);

              return (
                <article
                  key={`${donation.id}-usage`}
                  className="rounded-xl border border-orange-100 bg-white p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-stone-950">
                        {campaign?.title ?? "Campaign"}
                      </h3>
                      <p className="mt-1 text-xs font-semibold text-stone-500">
                        Donation {donation.id} - {donation.amount}
                      </p>
                    </div>
                    <StatusPill status={donation.releaseStatus} />
                  </div>

                  <div className="mt-3 divide-y divide-orange-100 overflow-hidden rounded-xl border border-orange-100">
                    {donation.usage.map((item) => (
                      <div
                        key={`${donation.id}-${item.label}`}
                        className="grid gap-2 bg-orange-50/25 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_6.5rem_7.25rem] sm:items-center"
                      >
                        <p className="text-sm font-medium text-stone-800">
                          {item.label}
                        </p>
                        <p className="text-sm font-semibold text-stone-950 sm:text-right">
                          {item.amount}
                        </p>
                        <StatusPill status={item.status} />
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
            Milestone progress
          </p>
          <h2 className="mt-1 text-xl font-black text-stone-950">
            Donated campaign milestone monitor
          </h2>

          <div className="mt-4 space-y-3">
            {filteredDonations.map((donation) => {
              const campaign = getCampaign(donation.campaignId);
              const approvedPercent = donation.milestones
                .filter((milestone) => milestone.status === "Approved")
                .reduce((total, milestone) => total + milestone.percentage, 0);

              return (
                <article
                  key={`${donation.id}-milestones`}
                  className="rounded-xl border border-orange-100 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-stone-950">
                        {campaign?.title ?? "Campaign"}
                      </h3>
                      <p className="mt-1 text-xs font-semibold text-stone-500">
                        {approvedPercent}% released by approved milestones
                      </p>
                    </div>
                    <StatusPill status={donation.releaseStatus} />
                  </div>

                  <div className="mt-3">
                    <ProgressBar value={approvedPercent} />
                  </div>

                  <div className="mt-3 divide-y divide-orange-100 overflow-hidden rounded-xl border border-orange-100">
                    {donation.milestones.map((milestone, index) => (
                      <div
                        key={`${donation.id}-${milestone.title}`}
                        className="grid gap-3 bg-orange-50/25 px-3 py-2.5 sm:grid-cols-[1.75rem_minmax(0,1fr)_7.25rem] sm:items-center"
                      >
                        <span className="grid h-7 w-7 place-items-center rounded-lg bg-white text-xs font-black text-[var(--color-orange)] ring-1 ring-orange-100">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-stone-950">
                            {milestone.title}
                          </p>
                          <p className="mt-1 text-xs font-medium text-stone-500">
                            {milestone.percentage}% fund release checkpoint
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedProof({
                              campaign: campaign?.title ?? "Campaign",
                              title: milestone.title,
                              status: milestone.status,
                              percentage: milestone.percentage,
                            })
                          }
                          className="text-left"
                        >
                          <StatusPill status={milestone.status} />
                        </button>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {selectedProof ? (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-stone-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
                  Proof detail
                </p>
                <h2 className="mt-1 text-xl font-black text-stone-950">
                  {selectedProof.title}
                </h2>
                <p className="mt-1 text-sm font-medium text-stone-500">
                  {selectedProof.campaign}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProof(null)}
                className="grid h-9 w-9 place-items-center rounded-xl text-stone-500 transition hover:bg-orange-50 hover:text-[var(--color-orange)]"
              >
                <span className="sr-only">Close proof detail</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
                  <path d="M6 6l12 12" />
                  <path d="M18 6 6 18" />
                </svg>
              </button>
            </div>
            <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50/25 p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-stone-500">
                  Release checkpoint
                </span>
                <span className="text-sm font-black text-stone-950">
                  {selectedProof.percentage}%
                </span>
              </div>
              <div className="mt-3">
                <ProgressBar value={selectedProof.percentage} />
              </div>
              <div className="mt-4 flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-stone-500">
                  Review status
                </span>
                <StatusPill status={selectedProof.status} />
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-orange-100 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
                  Evidence
                </p>
                <p className="mt-2 text-sm font-semibold text-stone-950">
                  Invoice, photo, and admin notes preview
                </p>
              </div>
              <div className="rounded-xl border border-orange-100 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
                  Action
                </p>
                <p className="mt-2 text-sm font-semibold text-stone-950">
                  Opens proof file after storage is connected
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
