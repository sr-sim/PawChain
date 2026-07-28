"use client";

import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Campaign } from "../Donor/campaignData";

type ReportCampaign = Campaign & {
  source?: "supabase";
};

const reportTargets = ["Campaign", "Shelter", "Donation", "Other"];
const concernTypes = [
  "Suspicious shelter behaviour",
  "Fake campaign information",
  "Possible misuse of funds",
  "Milestone proof concern",
  "Donation transaction issue",
];

export default function DonorReportForm() {
  const searchParams = useSearchParams();
  const presetType = searchParams.get("type");
  const presetCampaign = searchParams.get("campaign");
  const walletAddress = searchParams.get("walletAddress") ?? "";
  const [campaigns, setCampaigns] = useState<ReportCampaign[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);
  const [campaignLoadError, setCampaignLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [target, setTarget] = useState("Campaign");
  const [concernType, setConcernType] = useState(concernTypes[0]);
  const [relatedCampaignId, setRelatedCampaignId] = useState(presetCampaign ?? "");
  const [message, setMessage] = useState("");
  const [txHash, setTxHash] = useState("");
  const [confirmReview, setConfirmReview] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedRequestId, setSubmittedRequestId] = useState("");
  const selectedCampaign = campaigns.find(
    (campaign) => campaign.id === relatedCampaignId,
  );

  const reportReference = useMemo(() => {
    return presetType === "report" ? "RPT-2026-014" : "DRQ-2026-008";
  }, [presetType]);

  useEffect(() => {
    let isMounted = true;

    async function loadCampaigns() {
      setIsLoadingCampaigns(true);
      setCampaignLoadError("");

      try {
        const response = await fetch("/api/donor/campaigns", {
          cache: "no-store",
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message ?? "Unable to load campaigns.");
        }

        if (!isMounted) {
          return;
        }

        const liveCampaigns = Array.isArray(result.campaigns)
          ? (result.campaigns as ReportCampaign[])
          : [];

        setCampaigns(liveCampaigns);
        setRelatedCampaignId((current) =>
          liveCampaigns.some((campaign) => campaign.id === current)
            ? current
            : liveCampaigns[0]?.id ?? "",
        );
      } catch (error) {
        if (isMounted) {
          setCampaigns([]);
          setCampaignLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load active campaigns.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingCampaigns(false);
        }
      }
    }

    loadCampaigns();

    return () => {
      isMounted = false;
    };
  }, []);

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/donor/support-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress,
          target,
          concernType,
          campaignId: selectedCampaign?.id ?? null,
          shelterId: selectedCampaign?.shelterId ?? null,
          message,
          txHash,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Unable to submit report.");
      }

      setSubmittedRequestId(result.request?.id ?? "");
      setSubmitted(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Unable to submit report.",
      );
    } finally {
      setIsSubmitting(false);
    }
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
            Submitted
          </span>
        ) : null}
      </div>

      {submitted ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-black text-emerald-800">
            Report submitted for admin review
          </p>
          <p className="mt-2 text-sm leading-6 text-emerald-700">
            Reference {submittedRequestId || reportReference} has been saved in
            PawChain and is ready for admin review.
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
                {selectedCampaign
                  ? `${selectedCampaign.title} / ${selectedCampaign.shelter}`
                  : "Not linked to a campaign"}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setSubmittedRequestId("");
            }}
            className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
          >
            Submit another report
          </button>
        </div>
      ) : (
        <form onSubmit={submitReport} className="mt-4 space-y-4">
          {!walletAddress ? (
            <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
              Connect your donor wallet before submitting a report.
            </p>
          ) : null}

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
                  suppressHydrationWarning
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
                suppressHydrationWarning
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
                value={relatedCampaignId}
                onChange={(event) => setRelatedCampaignId(event.target.value)}
                suppressHydrationWarning
                className="mt-2 h-11 w-full rounded-xl border border-orange-100 bg-white px-3 text-sm font-semibold text-stone-900 outline-none transition focus:border-[var(--color-orange)] focus:ring-2 focus:ring-orange-100"
              >
                {isLoadingCampaigns ? (
                  <option value="">Loading active campaigns...</option>
                ) : null}
                {!isLoadingCampaigns && campaigns.length === 0 ? (
                  <option value="">No active campaigns available</option>
                ) : null}
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.title} / {campaign.shelter}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {campaignLoadError ? (
            <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {campaignLoadError}
            </p>
          ) : null}

          {selectedCampaign ? (
            <div className="rounded-xl border border-orange-100 bg-orange-50/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                Real report context
              </p>
              <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <p className="font-semibold text-stone-950">
                    {selectedCampaign.title}
                  </p>
                  <p className="mt-1 text-xs font-medium text-stone-500">
                    Campaign ID: {selectedCampaign.id}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-stone-950">
                    {selectedCampaign.shelter}
                  </p>
                  <p className="mt-1 text-xs font-medium text-stone-500">
                    Shelter ID: {selectedCampaign.shelterId}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              Transaction hash, optional
            </span>
            <input
              value={txHash}
              onChange={(event) => setTxHash(event.target.value)}
              placeholder="Paste donation transaction hash if related"
              suppressHydrationWarning
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
              suppressHydrationWarning
              className="mt-2 w-full resize-none rounded-xl border border-orange-100 bg-white px-3 py-3 text-sm font-medium leading-6 text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-[var(--color-orange)] focus:ring-2 focus:ring-orange-100"
            />
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-orange-100 bg-orange-50/30 p-3">
            <input
              type="checkbox"
              checked={confirmReview}
              onChange={(event) => setConfirmReview(event.target.checked)}
              required
              suppressHydrationWarning
              className="mt-1 h-4 w-4 rounded border-orange-200 text-[var(--color-orange)] focus:ring-orange-200"
            />
            <span className="text-sm leading-6 text-stone-600">
              I understand this report will be reviewed by admin and may require
              follow-up proof.
            </span>
          </label>

          <button
            type="submit"
            disabled={
              isSubmitting ||
              !walletAddress ||
              !confirmReview ||
              message.trim().length === 0
            }
            suppressHydrationWarning
            className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--color-orange)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            {isSubmitting ? "Submitting..." : "Submit report"}
          </button>
          {submitError ? (
            <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {submitError}
            </p>
          ) : null}
          <p className="text-center text-xs font-medium text-stone-500">
            Saved for admin review.
          </p>
        </form>
      )}
    </div>
  );
}
