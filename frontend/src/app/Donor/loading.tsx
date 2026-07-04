export default function DonorLoading() {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="h-3 w-32 animate-pulse rounded-full bg-orange-100" />
        <div className="mt-4 h-8 w-72 max-w-full animate-pulse rounded-xl bg-orange-100" />
        <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded-full bg-orange-50" />
      </section>
      <section className="grid gap-3 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm"
          >
            <div className="h-3 w-24 animate-pulse rounded-full bg-orange-100" />
            <div className="mt-4 h-7 w-20 animate-pulse rounded-xl bg-orange-100" />
            <div className="mt-3 h-3 w-32 animate-pulse rounded-full bg-orange-50" />
          </div>
        ))}
      </section>
      <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
        <div className="h-48 animate-pulse rounded-xl bg-orange-50" />
      </section>
    </div>
  );
}
