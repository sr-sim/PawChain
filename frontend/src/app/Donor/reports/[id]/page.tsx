import Link from "next/link";

const reports = [
  {
    id: "RPT-2026-014",
    subject: "Medical Recovery Fund proof concern",
    target: "Medical Recovery Fund",
    concern: "Milestone proof concern",
    status: "Under admin review",
    updated: "Today, 11:15 AM",
    message:
      "Donor requested admin to review whether the latest invoice proof matches the requested treatment milestone.",
  },
  {
    id: "RPT-2026-009",
    subject: "Shelter spending clarification",
    target: "Emergency Food Support",
    concern: "Possible misuse of funds",
    status: "Reply received",
    updated: "24 Jun 2026",
    message:
      "Admin reply preview is available after the report is connected to the support queue.",
  },
];

export default async function DonorReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = reports.find((item) => item.id === id) ?? reports[0];

  return (
    <div className="space-y-5">
      <Link
        href="/Donor/help"
        className="inline-flex items-center rounded-xl border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-[var(--color-orange)] transition hover:border-[var(--color-orange)] hover:bg-orange-50"
      >
        Back to help
      </Link>

      <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
          Report detail
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-black text-stone-950 sm:text-3xl">
              {report.subject}
            </h1>
            <p className="mt-2 text-sm font-semibold text-stone-500">
              {report.id} - {report.updated}
            </p>
          </div>
          <span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            {report.status}
          </span>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-stone-950">Report summary</h2>
          <div className="mt-4 divide-y divide-orange-100 overflow-hidden rounded-xl border border-orange-100">
            {[
              ["Target", report.target],
              ["Concern type", report.concern],
              ["Status", report.status],
              ["Latest update", report.updated],
            ].map(([label, value]) => (
              <div
                key={label}
                className="grid gap-2 bg-orange-50/20 px-3 py-3 text-sm sm:grid-cols-[9rem_1fr]"
              >
                <p className="font-medium text-stone-500">{label}</p>
                <p className="font-semibold text-stone-950">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-orange-100 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
              Message
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              {report.message}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-stone-950">Review timeline</h2>
          <div className="mt-4 space-y-3">
            {[
              ["Submitted", "Donor submitted report to admin queue."],
              ["Admin review", "Admin checks campaign, shelter, and proof records."],
              ["Resolution", "Admin response or enforcement action appears here."],
            ].map(([title, description], index) => (
              <div
                key={title}
                className="grid gap-3 rounded-xl border border-orange-100 bg-orange-50/25 p-3 sm:grid-cols-[2rem_1fr]"
              >
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-white text-xs font-black text-[var(--color-orange)] ring-1 ring-orange-100">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-stone-950">
                    {title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-stone-600">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
