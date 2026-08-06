export function formatPercentage(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0);

  if (!Number.isFinite(numeric)) {
    return "0";
  }

  const rounded = Math.round(numeric * 100) / 100;

  return rounded.toLocaleString("en-MY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
