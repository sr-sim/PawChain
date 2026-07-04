"use client";

import { ChangeEvent, useState } from "react";
import type { CampaignMilestone } from "@/app/components/campaigns/campaign-types";
import {
  MilestoneCard as SharedMilestoneCard,
  type ProofFile,
} from "@/app/components/campaigns/MilestoneCard";

type ShelterMilestoneCardProps = {
  milestone: CampaignMilestone;
  index: number;
  campaignId?: string;
  walletAddress?: string;
  canUploadProof?: boolean;
  onProofSubmitted?: (milestone: CampaignMilestone) => void;
};

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M12 15V4m0 0 4 4m-4-4-4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Unable to read proof file."));
    reader.readAsDataURL(file);
  });
}

function isAllowedProofFile(file: File) {
  return file.type.startsWith("image/") || file.type === "application/pdf";
}

function isPdfProof(file: ProofFile) {
  return (
    file.type === "application/pdf" ||
    file.dataUrl.startsWith("data:application/pdf")
  );
}

export function MilestoneCard({
  milestone,
  index,
  campaignId,
  walletAddress,
  canUploadProof = false,
  onProofSubmitted,
}: ShelterMilestoneCardProps) {
  const [selectedFiles, setSelectedFiles] = useState<ProofFile[]>([]);
  const [previewFile, setPreviewFile] = useState<ProofFile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const showUploader =
    canUploadProof &&
    (milestone.status === "pending" || milestone.status === "rejected");

  async function handleProofChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (files.length < 1) {
      setSelectedFiles([]);
      return;
    }

    const invalidFile = files.find((file) => !isAllowedProofFile(file));

    if (invalidFile) {
      setError("Proof files must be images or PDFs.");
      setSelectedFiles([]);
      return;
    }

    try {
      const proofFiles = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          type: file.type,
          dataUrl: await fileToDataUrl(file),
        })),
      );

      setSelectedFiles((current) => [...current, ...proofFiles]);
      event.target.value = "";
      setError("");
      setMessage("");
    } catch (readError) {
      setError(
        readError instanceof Error
          ? readError.message
          : "Unable to read proof files.",
      );
    }
  }

  async function handleSubmitProof() {
    if (!campaignId || !walletAddress) {
      setError("Connect your shelter wallet before uploading proof.");
      return;
    }

    if (selectedFiles.length < 1) {
      setError("Upload at least one proof file.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/shelter/campaigns/${campaignId}/milestones/${milestone.id}/proof`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            walletAddress,
            proofFiles: selectedFiles,
          }),
        },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Unable to submit proof.");
      }

      onProofSubmitted?.(result.milestone);
      setSelectedFiles([]);
      setMessage("Proof submitted for review.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit proof.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <SharedMilestoneCard
        milestone={milestone}
        index={index}
        showProof
        proofAction={
          showUploader ? (
            <div className="mt-4 rounded-2xl border border-dashed border-orange-200 bg-white/72 p-4 text-stone-950">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-black">Submit proof</p>
                  <p className="mt-1 text-sm font-bold leading-6 text-stone-600">
                    Choose one or more image/PDF files. Select again to add more.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSubmitProof}
                  disabled={selectedFiles.length < 1 || isSubmitting}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-stone-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-200/70 transition hover:-translate-y-0.5 hover:bg-[var(--color-orange)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <UploadIcon />
                  {isSubmitting ? "Submitting..." : "Submit Proof"}
                </button>
              </div>

              <input
                type="file"
                accept="image/*,application/pdf"
                multiple
                onChange={handleProofChange}
                className="mt-3 w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm font-bold text-stone-700 file:mr-4 file:rounded-full file:border-0 file:bg-stone-950 file:px-4 file:py-2 file:text-sm file:font-black file:text-white"
              />

              {selectedFiles.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedFiles.map((file, fileIndex) => (
                    <span
                      key={`${file.name}-${fileIndex}`}
                      className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-white px-2 py-1.5 text-xs font-black text-stone-700"
                    >
                      <button
                        type="button"
                        onClick={() => setPreviewFile(file)}
                        className="inline-flex items-center gap-2 rounded-full px-1 transition hover:text-[var(--color-orange)]"
                        aria-label={`Preview ${file.name}`}
                      >
                        <FileIcon />
                        {file.name}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedFiles((current) =>
                            current.filter(
                              (_, currentIndex) => currentIndex !== fileIndex,
                            ),
                          )
                        }
                        className="rounded-full px-1 text-stone-400 transition hover:bg-orange-50 hover:text-red-600"
                        aria-label={`Remove ${file.name}`}
                      >
                        x
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null
        }
      >
        {error ? (
          <p className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </p>
        ) : null}

        {message ? (
          <p className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {message}
          </p>
        ) : null}
      </SharedMilestoneCard>

      {previewFile ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Selected proof preview"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-orange-100 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-orange)]">
                  Preview Before Submit
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
