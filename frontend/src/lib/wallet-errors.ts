type ErrorLike = {
  code?: unknown;
  message?: unknown;
  shortMessage?: unknown;
  details?: unknown;
  cause?: unknown;
};

export function isWalletRejection(error: unknown): boolean {
  const visited = new Set<unknown>();
  let current: unknown = error;

  while (current && !visited.has(current)) {
    visited.add(current);
    const candidate = current as ErrorLike;
    if (candidate.code === 4001 || candidate.code === "4001") return true;

    const text = [candidate.message, candidate.shortMessage, candidate.details]
      .filter((value): value is string => typeof value === "string")
      .join(" ")
      .toLowerCase();
    if (
      text.includes("user rejected") ||
      text.includes("user denied") ||
      text.includes("rejected the request") ||
      text.includes("request rejected")
    ) {
      return true;
    }

    current = candidate.cause;
  }

  return false;
}
