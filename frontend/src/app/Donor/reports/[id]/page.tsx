import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

type ReportPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    walletAddress?: string;
  }>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusClass(status: string) {
  if (status === "resolved") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "rejected") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (status === "reviewing") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

export default async function DonorReportDetailPage({
  params,
  searchParams,
}: ReportPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const walletAddress = query?.walletAddress;
  const supabase = createAdminClient();

  if (!walletAddress) {
    notFound();
  }

  const { data: donorProfile } = await supabase
    .from("profiles")
    .select("id")
    .ilike("wallet_address", walletAddress)
    .eq("role", "donor")
    .maybeSingle();

  if (!donorProfile) {
    notFound();
  }

  const { data: report } = await supabase
    .from("donor_support_requests")
    .select(
      "id, donor_id, campaign_id, shelter_id, request_type, subject, message, status, admin_response, created_at, updated_at",
    )
    .eq("id", id)
    .eq("donor_id", donorProfile.id)
    .maybeSingle();

  if (!report) {
    notFound();
  }

  const { data: campaign } = report.campaign_id
    ? await supabase
        .from("campaigns")
        .select("id, title")
        .eq("id", report.campaign_id)
        .maybeSingle()
    : { data: null };

  const { data: shelterApplication } = report.shelter_id
    ? await supabase
        .from("shelter_applications")
        .select("shelter_name")
        .eq("user_id", report.shelter_id)
        .maybeSingle()
    : { data: null };

  const helpHref = `/Donor/help?walletAddress=${encodeURIComponent(walletAddress)}`;

  return (
    <div className="space-y-5">
      <Link
        href={helpHref}
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
              {report.id} - Updated {formatDate(report.updated_at)}
            </p>
          </div>
          <span
            className={[
              "w-fit rounded-full border px-3 py-1 text-xs font-semibold capitalize",
              statusClass(report.status),
            ].join(" ")}
          >
            {report.status}
          </span>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-stone-950">Report summary</h2>
          <div className="mt-4 divide-y divide-orange-100 overflow-hidden rounded-xl border border-orange-100">
            {[
              ["Target campaign", campaign?.title ?? "Not linked"],
              ["Target shelter", shelterApplication?.shelter_name ?? "Not linked"],
              ["Request type", report.request_type.replaceAll("_", " ")],
              ["Status", report.status],
              ["Submitted", formatDate(report.created_at)],
              ["Latest update", formatDate(report.updated_at)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="grid gap-2 bg-orange-50/20 px-3 py-3 text-sm sm:grid-cols-[9rem_1fr]"
              >
                <p className="font-medium text-stone-500">{label}</p>
                <p className="font-semibold capitalize text-stone-950">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-orange-100 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
              Message
            </p>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-stone-600">
              {report.message}
            </p>
          </div>
          {report.admin_response ? (
            <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-600">
                Admin response
              </p>
              <p className="mt-2 text-sm leading-6 text-emerald-800">
                {report.admin_response}
              </p>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-stone-950">Review timeline</h2>
          <div className="mt-4 space-y-3">
            {[
              ["Submitted", "Donor submitted report to admin queue."],
              [
                "Admin review",
                report.status === "pending"
                  ? "Waiting for admin to review this request."
                  : "Admin has started reviewing this request.",
              ],
              [
                "Resolution",
                report.admin_response
                  ? "Admin response is available above."
                  : "Admin response or enforcement action will appear here.",
              ],
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
