"use client";

export function PrintReceiptButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex w-fit items-center justify-center rounded-xl border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-stone-900 transition hover:border-[var(--color-orange)] hover:bg-orange-50"
    >
      Print receipt
    </button>
  );
}
