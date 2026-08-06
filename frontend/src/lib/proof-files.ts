export type ProofFile = {
  name: string;
  type: string;
  dataUrl: string;
};

export function parseProofFiles(proofUrl?: string | null): ProofFile[] {
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
        name: "Proof document",
        type: "",
        dataUrl: proofUrl,
      },
    ];
  }
}
