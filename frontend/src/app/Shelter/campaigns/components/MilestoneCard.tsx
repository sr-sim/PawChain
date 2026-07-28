"use client";

import { ChangeEvent, useState } from "react";
import { useChainId, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { isAddress, keccak256, toBytes } from "viem";
import type { CampaignMilestone } from "@/app/components/campaigns/campaign-types";
import {
  MilestoneCard as SharedMilestoneCard,
  type ProofFile,
} from "@/app/components/campaigns/MilestoneCard";
import { campaignContractAbi } from "@/lib/campaign-contract-abi";
import { getPawChainId } from "@/lib/campaign-blockchain";

type ShelterMilestoneCardProps = {
  milestone: CampaignMilestone;
  index: number;
  campaignId?: string;
  walletAddress?: string;
  contractAddress?: string | null;
  goalEth?: number;
  ethMyrRate?: number;
  cumulativePercentage?: number;
  canUploadProof?: boolean;
  showProofUpload?: boolean;
  showWithdrawAction?: boolean;
  onProofSubmitted?: (milestone: CampaignMilestone) => void;
  onWithdrawalCompleted?: () => void;
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
  contractAddress,
  goalEth = 0,
  ethMyrRate = 0,
  cumulativePercentage = 0,
  canUploadProof = false,
  showProofUpload = true,
  showWithdrawAction = false,
  onProofSubmitted,
  onWithdrawalCompleted,
}: ShelterMilestoneCardProps) {
  const [selectedFiles, setSelectedFiles] = useState<ProofFile[]>([]);
  const [previewFile, setPreviewFile] = useState<ProofFile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const validContractAddress =
    contractAddress && isAddress(contractAddress) ? contractAddress : undefined;
  const onChainIndex = milestone.on_chain_index;
  const {
    data: onChainMilestone,
    refetch: refetchOnChainMilestone,
  } = useReadContract({
    address: validContractAddress,
    abi: campaignContractAbi,
    functionName: "getMilestone",
    args:
      onChainIndex === null || onChainIndex === undefined
        ? undefined
        : [BigInt(onChainIndex)],
    query: {
      enabled:
        Boolean(validContractAddress) &&
        onChainIndex !== null &&
        onChainIndex !== undefined,
      },
  });
  const onChainStatus = onChainMilestone
    ? Number(onChainMilestone.status)
    : null;
  // Proof is valid only after the milestone funds have been withdrawn
  // (Released), or when the admin rejected an earlier proof submission.
  // Never fall back to the older rule that allowed an Active milestone to
  // upload proof while it was still collecting funds.
  const proofAllowedOnChain = onChainStatus === 6 || onChainStatus === 3;
  const showUploader =
    canUploadProof &&
    showProofUpload &&
    proofAllowedOnChain;
  const canWithdraw =
    canUploadProof && showWithdrawAction && onChainStatus === 5;

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
    if (
      !validContractAddress ||
      onChainIndex === null ||
      onChainIndex === undefined ||
      !publicClient
    ) {
      setError("This milestone is not linked to an active contract.");
      return;
    }
    if (chainId !== getPawChainId()) {
      setError(`Switch your wallet to PawChain ${getPawChainId()}.`);
      return;
    }

    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const proofCID = keccak256(toBytes(JSON.stringify(selectedFiles)));
      const txHash = await writeContractAsync({
        address: validContractAddress,
        abi: campaignContractAbi,
        functionName: "submitMilestoneProof",
        args: [BigInt(onChainIndex), proofCID],
      });
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });
      if (receipt.status !== "success") {
        throw new Error("Proof transaction failed.");
      }

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
            proofCID,
            txHash,
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
      await refetchOnChainMilestone();
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

  async function handleWithdraw() {
    if (
      !campaignId ||
      !walletAddress ||
      !validContractAddress ||
      onChainIndex === null ||
      onChainIndex === undefined ||
      !publicClient
    ) {
      setError("This milestone is not ready for withdrawal.");
      return;
    }
    if (chainId !== getPawChainId()) {
      setError(`Switch your wallet to PawChain ${getPawChainId()}.`);
      return;
    }

    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const txHash = await writeContractAsync({
        address: validContractAddress,
        abi: campaignContractAbi,
        functionName: "withdrawMilestone",
        args: [BigInt(onChainIndex)],
      });
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });
      if (receipt.status !== "success") {
        throw new Error("Fund release transaction failed.");
      }

      const response = await fetch(
        `/api/shelter/campaigns/${campaignId}/milestones/${milestone.id}/release`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress, txHash }),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message ?? "Unable to record fund release.");
      }

      setMessage("Milestone funds released successfully.");
      await refetchOnChainMilestone();
      onWithdrawalCompleted?.();
    } catch (withdrawError) {
      setError(
        withdrawError instanceof Error
          ? withdrawError.message
          : "Unable to release milestone funds.",
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
        showProof={showProofUpload}
        proofAction={
          showProofUpload && canUploadProof ? (
            <div className="mt-4 rounded-2xl border border-dashed border-orange-200 bg-white/72 p-4 text-stone-950">
              {showUploader ? (
                <>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-black">Submit proof</p>
                  <p className="mt-1 text-sm font-bold leading-6 text-stone-600">
                    Choose one or more image/PDF files. Every selected file can be previewed before submission.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSubmitProof}
                  disabled={selectedFiles.length < 1 || isSubmitting}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-stone-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-200/70 transition hover:-translate-y-0.5 hover:bg-[var(--color-orange)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <UploadIcon />
                  {isSubmitting
                    ? "Submitting..."
                    : selectedFiles.length > 1
                      ? `Submit ${selectedFiles.length} Proofs`
                      : "Submit Proof"}
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
                <div className="mt-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-black text-stone-500">
                      {selectedFiles.length} selected file{selectedFiles.length === 1 ? "" : "s"}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFiles([]);
                        setPreviewFile(null);
                        setError("");
                      }}
                      className="rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-black text-red-600 transition hover:bg-red-50"
                    >
                      Discard all uploads
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {selectedFiles.map((file, fileIndex) => (
                    <div
                      key={`${file.name}-${fileIndex}`}
                      className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() => setPreviewFile(file)}
                        className="group block w-full text-left"
                        aria-label={`Preview ${file.name}`}
                      >
                        <span className="grid h-28 place-items-center overflow-hidden bg-stone-50">
                          {isPdfProof(file) ? (
                            <span className="flex flex-col items-center gap-2 text-stone-500">
                              <FileIcon />
                              <span className="text-xs font-black">PDF document</span>
                            </span>
                          ) : (
                            <img
                              src={file.dataUrl}
                              alt={file.name}
                              className="h-full w-full object-cover transition group-hover:scale-105"
                            />
                          )}
                        </span>
                        <span className="block truncate px-3 py-2 text-xs font-black text-stone-700 group-hover:text-[var(--color-orange)]">
                          {file.name}
                        </span>
                      </button>
                      <div className="flex items-center justify-between gap-2 border-t border-orange-100 px-3 py-2">
                        <button type="button" onClick={() => setPreviewFile(file)} className="text-xs font-black text-[var(--color-orange)]">Preview</button>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedFiles((current) =>
                              current.filter(
                                (_, currentIndex) => currentIndex !== fileIndex,
                              ),
                            )
                          }
                          className="text-xs font-black text-red-600"
                          aria-label={`Remove ${file.name}`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              ) : null}
                </>
              ) : showProofUpload && canUploadProof ? (
                <div className="rounded-xl bg-stone-50 px-4 py-3 text-sm font-bold leading-6 text-stone-600">
                  {onChainStatus === 5
                    ? "Proof submission is locked until you withdraw this fully funded milestone from the Withdraw Funds page."
                    : onChainStatus === 1
                      ? `Proof submission is locked until this milestone reaches its ${cumulativePercentage}% funding target and its funds are withdrawn.`
                      : onChainStatus === 0
                        ? "Proof submission is locked until the previous milestone is completed and this milestone is fully funded and withdrawn."
                        : onChainStatus === 2
                          ? "Proof has been submitted and is waiting for admin review."
                          : onChainStatus === 7
                            ? "This milestone and its proof review are complete."
                            : "Checking the on-chain milestone status before enabling proof submission."}
                </div>
              ) : null}
            </div>
          ) : null
        }
      >
        {showWithdrawAction ? (
          <div
            className={`mt-4 overflow-hidden rounded-2xl border p-4 sm:p-5 ${
              canWithdraw
                ? "border-emerald-200 bg-[linear-gradient(135deg,#ECFDF5,#FFFFFF)] shadow-sm shadow-emerald-100"
                : "border-orange-100 bg-white"
            }`}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-lg font-black ${
                    canWithdraw
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-orange-50 text-[var(--color-orange)]"
                  }`}
                  aria-hidden="true"
                >
                  {canWithdraw ? "✓" : "↗"}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-400">
                    Withdrawal status
                  </p>
                  <h4 className="mt-1 text-lg font-black text-stone-950">
                    {canWithdraw
                      ? "Milestone funds are ready"
                      : onChainStatus === 6
                        ? "Funds already withdrawn"
                        : onChainStatus === 1
                          ? "Milestone is still collecting funds"
                          : onChainStatus === 0
                            ? "Milestone is locked"
                            : onChainStatus === 2
                              ? "Proof is under admin review"
                              : onChainStatus === 3
                                ? "Revised proof is required"
                                : onChainStatus === 7
                                  ? "Milestone completed"
                                  : "Checking withdrawal availability"}
                  </h4>
                  <p className="mt-1 text-sm font-semibold leading-6 text-stone-500">
                    {canWithdraw
                      ? `Withdraw Milestone ${index + 1}'s allocation to the verified shelter wallet.`
                      : onChainStatus === 6
                        ? "The allocation was transferred. Continue from Campaign Details to submit proof."
                        : onChainStatus === 1
                          ? `Withdrawal unlocks when donations reach the ${cumulativePercentage}% cumulative target.`
                          : onChainStatus === 0
                            ? "Complete the previous milestone before this allocation can be funded."
                            : "The smart contract has not marked this allocation as withdrawable."}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-2 lg:items-end">
                <div className="rounded-xl border border-current/10 bg-white/80 px-4 py-2 text-left lg:text-right">
                  <p className="text-[10px] font-black uppercase tracking-wide text-stone-400">
                    Milestone allocation
                  </p>
                  <p className="mt-1 text-sm font-black text-stone-950">
                    {(goalEth * Number(milestone.percentage || 0) / 100).toLocaleString("en-MY", { maximumFractionDigits: 8 })} ETH
                  </p>
                  {walletAddress ? (
                    <p className="mt-1 font-mono text-[10px] font-bold text-stone-400">
                      To {walletAddress.slice(0, 7)}...{walletAddress.slice(-5)}
                    </p>
                  ) : null}
                </div>
                {canWithdraw ? (
                  <button
                    type="button"
                    onClick={handleWithdraw}
                    disabled={isSubmitting}
                    className="inline-flex min-w-52 items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-200 transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting
                      ? "Confirming withdrawal..."
                      : `Withdraw Milestone ${index + 1}`}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-orange-100 bg-white p-3"><p className="text-[10px] font-black uppercase tracking-wide text-stone-400">Funds (ETH)</p><p className="mt-1 text-sm font-black text-stone-950">{(goalEth * Number(milestone.percentage || 0) / 100).toLocaleString("en-MY", { maximumFractionDigits: 8 })} ETH</p></div>
          <div className="rounded-xl border border-orange-100 bg-white p-3"><p className="text-[10px] font-black uppercase tracking-wide text-stone-400">Approx. value (MYR)</p><p className="mt-1 text-sm font-black text-stone-950">{new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(goalEth * Number(milestone.percentage || 0) / 100 * ethMyrRate)}</p></div>
          <div className="rounded-xl border border-orange-100 bg-white p-3"><p className="text-[10px] font-black uppercase tracking-wide text-stone-400">Required funding</p><p className="mt-1 text-sm font-black text-stone-950">{cumulativePercentage}%</p></div>
          <div className="rounded-xl border border-orange-100 bg-white p-3"><p className="text-[10px] font-black uppercase tracking-wide text-stone-400">Proof state</p><p className="mt-1 text-sm font-black capitalize text-stone-950">{milestone.status.replaceAll("_", " ")}</p></div>
        </div>
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
