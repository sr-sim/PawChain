"use client";

import { useState } from "react";
import { parseProofFiles } from "@/lib/proof-files";

type DonorProofEvidenceProps = {
  proofUrl?: string | null;
};

function isImageProof(type: string, dataUrl: string) {
  return type.startsWith("image/") || dataUrl.startsWith("data:image/");
}

function isVideoProof(type: string, dataUrl: string) {
  return type.startsWith("video/") || dataUrl.startsWith("data:video/");
}

function isPdfProof(type: string, dataUrl: string) {
  return type === "application/pdf" || dataUrl.startsWith("data:application/pdf");
}

export function DonorProofEvidence({ proofUrl }: DonorProofEvidenceProps) {
  const proofFiles = parseProofFiles(proofUrl);
  const [previewImage, setPreviewImage] = useState<{
    name: string;
    src: string;
  } | null>(null);

  if (proofFiles.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 rounded-2xl border border-orange-100 bg-white/82 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-orange)]">
          Shelter proof evidence
        </p>
        <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-black text-[var(--color-orange)] ring-1 ring-orange-100">
          {proofFiles.length} file{proofFiles.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {proofFiles.map((file, index) => {
          const key = `${file.name}-${index}`;

          if (isImageProof(file.type, file.dataUrl)) {
            return (
              <button
                key={key}
                type="button"
                onClick={() =>
                  setPreviewImage({ name: file.name, src: file.dataUrl })
                }
                className="group overflow-hidden rounded-xl border border-orange-100 bg-orange-50/35 text-left transition hover:-translate-y-0.5 hover:border-[var(--color-orange)]"
              >
                <img
                  src={file.dataUrl}
                  alt={file.name}
                  className="h-32 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                />
                <p className="truncate px-3 py-2 text-xs font-black text-stone-700">
                  {file.name}
                </p>
              </button>
            );
          }

          if (isVideoProof(file.type, file.dataUrl)) {
            return (
              <div
                key={key}
                className="overflow-hidden rounded-xl border border-orange-100 bg-orange-50/35"
              >
                <video
                  src={file.dataUrl}
                  controls
                  className="h-32 w-full bg-stone-950 object-cover"
                />
                <p className="truncate px-3 py-2 text-xs font-black text-stone-700">
                  {file.name}
                </p>
              </div>
            );
          }

          return (
            <a
              key={key}
              href={file.dataUrl}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-32 flex-col justify-between rounded-xl border border-orange-100 bg-orange-50/35 p-3 transition hover:-translate-y-0.5 hover:border-[var(--color-orange)] hover:bg-orange-50"
            >
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-stone-500">
                {isPdfProof(file.type, file.dataUrl) ? "PDF proof" : "Proof file"}
              </span>
              <span className="mt-3 line-clamp-2 text-sm font-black text-stone-950">
                {file.name}
              </span>
              <span className="mt-3 text-xs font-black text-[var(--color-orange)]">
                Open proof
              </span>
            </a>
          );
        })}
      </div>

      {previewImage ? (
        <div
          className="fixed inset-0 z-[9999] grid place-items-center bg-stone-950/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Preview ${previewImage.name}`}
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="max-h-[92vh] w-[min(60rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-[0_30px_100px_rgba(0,0,0,0.35)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-orange-100 px-4 py-3">
              <p className="truncate text-sm font-black text-stone-950">
                {previewImage.name}
              </p>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-orange-100 bg-orange-50 text-lg font-black text-[var(--color-orange)] transition hover:bg-orange-100"
                aria-label="Close proof preview"
              >
                ×
              </button>
            </div>
            <div className="grid max-h-[calc(92vh-4rem)] place-items-center overflow-auto bg-orange-50/25 p-3">
              <img
                src={previewImage.src}
                alt={previewImage.name}
                className="max-h-[calc(92vh-6rem)] max-w-full rounded-2xl object-contain shadow-sm"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
