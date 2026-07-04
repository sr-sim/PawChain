"use client";

import { useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

const reportTargets = ["Campaign", "Shelter", "Donation", "Other"];
const concernTypes = [
  "Suspicious shelter behaviour",
  "Fake campaign information",
  "Possible misuse of funds",
  "Milestone proof concern",
  "Donation transaction issue",
];
const relatedItems = [
  "Medical Recovery Fund",
  "Emergency Food Support",
  "Warm Kennel Upgrade",
  "Shelter profile concern",
  "Not sure",
];

export default function DonorReportForm() {
  const searchParams = useSearchParams();
  const presetType = searchParams.get("type");
  const presetCampaign = searchParams.get("campaign");
  const [target, setTarget] = useState("Campaign");
  const [concernType, setConcernType] = useState(concernTypes[0]);
  const [relatedItem, setRelatedItem] = useState(
    presetCampaign ? "Medical Recovery Fund" : relatedItems[0],
  );
  const [message, setMessage] = useState("");
  const [txHash, setTxHash] = useState("");
  const [confirmReview, setConfirmReview] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const reportReference = useMemo(() => {
    return presetType === "report" ? "RPT-2026-014" : "DRQ-2026-008";
  }, [presetType]);

  function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
            Report center
          </p>
          <h2 className="mt-1 text-xl font-black text-stone-950">
            Report a campaign or shelter
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Send suspicious activity, fake campaign details, fund misuse
            concerns, or donation issues to the admin review queue.
          </p>
        </div>
        {submitted ? (
          <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Prepared
          </span>
        ) : null}
      </div>

      {submitted ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-black text-emerald-800">
            Report prepared for admin review
          </p>
          <p className="mt-2 text-sm leading-6 text-emerald-700">
            Reference {reportReference} is ready to be saved once the backend
            report table is connected.
          </p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-600">
                Concern
              </dt>
              <dd className="mt-1 font-semibold text-emerald-950">
                {concernType}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-600">
                Related item
              </dt>
              <dd className="mt-1 font-semibold text-emerald-950">
                {relatedItem}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
          >
            Edit report
          </button>
        </div>
      ) : (
        <form onSubmit={submitReport} className="mt-4 space-y-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              Report target
            </span>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {reportTargets.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTarget(item)}
                  className={[
                    "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                    target === item
                      ? "border-[var(--color-orange)] bg-orange-50 text-[var(--color-orange)]"
                      : "border-orange-100 bg-white text-stone-700 hover:border-orange-200 hover:bg-orange-50/60",
                  ].join(" ")}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                Concern type
              </span>
              <select
                value={concernType}
                onChange={(event) => setConcernType(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-orange-100 bg-white px-3 text-sm font-semibold text-stone-900 outline-none transition focus:border-[var(--color-orange)] focus:ring-2 focus:ring-orange-100"
              >
                {concernTypes.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                Related campaign or shelter
              </span>
              <select
                value={relatedItem}
                onChange={(event) => setRelatedItem(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-orange-100 bg-white px-3 text-sm font-semibold text-stone-900 outline-none transition focus:border-[var(--color-orange)] focus:ring-2 focus:ring-orange-100"
              >
                {relatedItems.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              Transaction hash, optional
            </span>
            <input
              value={txHash}
              onChange={(event) => setTxHash(event.target.value)}
              placeholder="Paste donation transaction hash if related"
              className="mt-2 h-11 w-full rounded-xl border border-orange-100 bg-white px-3 font-mono text-xs font-semibold text-stone-900 outline-none transition placeholder:font-sans placeholder:font-medium focus:border-[var(--color-orange)] focus:ring-2 focus:ring-orange-100"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              Details
            </span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              required
              placeholder="Describe what looks suspicious, what proof is missing, or why the campaign should be reviewed."
              className="mt-2 w-full resize-none rounded-xl border border-orange-100 bg-white px-3 py-3 text-sm font-medium leading-6 text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-[var(--color-orange)] focus:ring-2 focus:ring-orange-100"
            />
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-orange-100 bg-orange-50/30 p-3">
            <input
              type="checkbox"
              checked={confirmReview}
              onChange={(event) => setConfirmReview(event.target.checked)}
              required
              className="mt-1 h-4 w-4 rounded border-orange-200 text-[var(--color-orange)] focus:ring-orange-200"
            />
            <span className="text-sm leading-6 text-stone-600">
              I understand this report will be reviewed by admin and may require
              follow-up proof after backend connection.
            </span>
          </label>

          <button
            type="submit"
            disabled={!confirmReview || message.trim().length === 0}
            className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--color-orange)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            Submit report
          </button>
          <p className="text-center text-xs font-medium text-stone-500">
            Frontend preview. Later this can write to a Supabase report table
            and notify admin.
          </p>
        </form>
      )}
    </div>
  );
}
