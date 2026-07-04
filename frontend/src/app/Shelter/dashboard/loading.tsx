import type { ReactNode } from "react";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={[
        "animate-pulse rounded-2xl bg-orange-100/70",
        className,
      ].join(" ")}
    />
  );
}

function SkeletonCard({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
      {children}
    </section>
  );
}

export default function ShelterDashboardLoading() {
  return (
    <div className="space-y-6">
      <SkeletonCard>
        <SkeletonBlock className="h-4 w-36" />
        <SkeletonBlock className="mt-4 h-10 w-full max-w-xl" />
        <SkeletonBlock className="mt-4 h-5 w-full max-w-2xl" />
        <SkeletonBlock className="mt-2 h-5 w-3/4 max-w-xl" />
        <SkeletonBlock className="mt-6 h-24 w-full" />
      </SkeletonCard>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {["funds", "campaigns", "pending", "rejected"].map((item) => (
          <SkeletonCard key={item}>
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="mt-4 h-9 w-20" />
          </SkeletonCard>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        {["notifications", "milestones"].map((item) => (
          <SkeletonCard key={item}>
            <SkeletonBlock className="h-6 w-56" />
            <SkeletonBlock className="mt-5 h-24 w-full" />
          </SkeletonCard>
        ))}
      </div>

      <SkeletonCard>
        <SkeletonBlock className="h-6 w-36" />
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <SkeletonBlock className="h-12 w-full rounded-full" />
          <SkeletonBlock className="h-12 w-full rounded-full" />
          <SkeletonBlock className="h-12 w-full rounded-full" />
        </div>
      </SkeletonCard>
    </div>
  );
}
