"use client";

export default function DonorError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-orange-100 bg-white p-6 text-center shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
        Donor page error
      </p>
      <h1 className="mt-2 text-2xl font-black text-stone-950">
        This page could not load
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
        The donor screen is still available, but this view needs to be retried.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 rounded-xl bg-[var(--color-orange)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
      >
        Try again
      </button>
    </div>
  );
}
