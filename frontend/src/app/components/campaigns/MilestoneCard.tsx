"use client";

import { ReactNode, useMemo, useState } from "react";
import type { CampaignMilestone } from "./campaign-types";
import { StatusBadge } from "./StatusBadge";

export type ProofFile = {
  name: string;
  type: string;
  dataUrl: string;
};

type MilestoneCardProps = {
  milestone: CampaignMilestone;
  index: number;
  showRequirement?: boolean;
  showProof?: boolean;
  proofAction?: ReactNode;
  children?: ReactNode;
};

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M7 3h7l4 4v14H7V3Zm7 0v5h5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function parseProofFiles(proofUrl: string | null) {
  if (!proofUrl) {
    return [];
  }

  try {
    const parsed = JSON.parse(proofUrl);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((file) => ({
        name: String(file.name ?? ""),
        type: String(file.type ?? ""),
        dataUrl: String(file.dataUrl ?? ""),
      }))
      .filter((file) => file.name && file.dataUrl);
  } catch {
    return [
      {
        name: "Proof file",
        type: "",
        dataUrl: proofUrl,
      },
    ];
  }
}

function isPdfProof(file: ProofFile) {
  return (
    file.type === "application/pdf" ||
    file.dataUrl.startsWith("data:application/pdf")
  );
}

function getProofState(milestone: CampaignMilestone, hasProof: boolean) {
  if (milestone.status === "approved") {
    return {
      label: "Proof approved",
      description: "This milestone proof has been approved.",
      className: "border-emerald-100 bg-emerald-50/70 text-emerald-800",
    };
  }

  if (milestone.status === "submitted") {
    return {
      label: "Proof submitted for review",
      description: "Admin will review the uploaded proof before release.",
      className: "border-sky-100 bg-sky-50/70 text-sky-800",
    };
  }

  if (milestone.status === "rejected") {
    return {
      label: "Proof rejected",
      description:
        milestone.rejection_reason ||
        "Review the requirement and upload revised proof.",
      className: "border-red-100 bg-red-50/70 text-red-800",
    };
  }

  return {
    label: hasProof ? "Proof uploaded" : "No proof uploaded yet",
    description: hasProof
      ? "Proof files are attached to this milestone."
      : "No proof has been submitted for this milestone.",
    className: "border-orange-100 bg-white/75 text-stone-700",
  };
}

export function MilestoneCard({
  milestone,
  index,
  showRequirement = true,
  showProof = false,
  proofAction,
  children,
}: MilestoneCardProps) {
  const [previewFile, setPreviewFile] = useState<ProofFile | null>(null);
  const existingProofFiles = useMemo(
    () => parseProofFiles(milestone.proof_url),
    [milestone.proof_url],
  );
  const proofState = getProofState(milestone, existingProofFiles.length > 0);

  return (
    <>
      <article className="overflow-hidden rounded-2xl border border-orange-100 bg-[linear-gradient(135deg,var(--color-white),rgba(var(--color-cream-rgb),0.42))] shadow-sm shadow-orange-100">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-orange-50 text-sm font-black text-[var(--color-orange)] ring-1 ring-orange-100">
                {index + 1}
              </span>
              <div>
                <h3 className="text-lg font-black text-stone-950">
                  {milestone.title}
                </h3>
                <p className="mt-1 text-sm font-bold leading-6 text-stone-600">
                  {milestone.description}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
              <StatusBadge status={milestone.status} />
              <span className="rounded-full border border-orange-100 bg-white px-3 py-1 text-xs font-black text-[var(--color-orange)]">
                {Number(milestone.percentage)}%
              </span>
            </div>
          </div>

          {showRequirement ? (
            <div className="mt-4 rounded-2xl border border-orange-100 bg-white/82 px-4 py-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">
                Requirement
              </p>
              <p className="mt-1 text-sm font-bold leading-6 text-stone-700">
                {milestone.requirement}
              </p>
            </div>
          ) : null}

          {showProof ? (
            <div
              className={[
                "mt-4 rounded-2xl border px-4 py-3",
                proofState.className,
              ].join(" ")}
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-black">{proofState.label}</p>
                  <p className="mt-1 text-sm font-bold leading-6 opacity-85">
                    {proofState.description}
                  </p>
                </div>
                {existingProofFiles.length > 0 ? (
                  <span className="shrink-0 rounded-full border border-current/20 bg-white/70 px-3 py-1 text-xs font-black">
                    {existingProofFiles.length} file
                    {existingProofFiles.length === 1 ? "" : "s"}
                  </span>
                ) : null}
              </div>

              {existingProofFiles.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {existingProofFiles.map((file, fileIndex) => (
                    <button
                      key={`${file.name}-${fileIndex}`}
                      type="button"
                      onClick={() => setPreviewFile(file)}
                      className="inline-flex items-center gap-2 rounded-full border border-current/15 bg-white px-3 py-1.5 text-xs font-black transition hover:bg-white/70"
                    >
                      <FileIcon />
                      {file.name}
                    </button>
                  ))}
                </div>
              ) : null}

              {proofAction}
            </div>
          ) : null}

          {children}
        </div>
      </article>

      {previewFile ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Proof file preview"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-orange-100 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-orange)]">
                  Proof Preview
                </p>
                <h3 className="truncate text-base font-black text-stone-950">
                  {previewFile.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="shrink-0 rounded-full bg-stone-950 px-4 py-2 text-sm font-black text-white transition hover:bg-[var(--color-orange)]"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 bg-stone-50 p-3">
              {isPdfProof(previewFile) ? (
                <iframe
                  src={previewFile.dataUrl}
                  title={previewFile.name}
                  className="h-[72vh] w-full rounded-xl border border-orange-100 bg-white"
                />
              ) : (
                <div className="grid h-[72vh] place-items-center overflow-auto rounded-xl border border-orange-100 bg-white p-3">
                  <img
                    src={previewFile.dataUrl}
                    alt={previewFile.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
