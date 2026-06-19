import { revalidatePath } from "next/cache";
import Link from "next/link";
import { DashboardTopBar } from "@/app/components/DashboardTopBar";
import { createClient } from "@/lib/supabase/server";

type ShelterApplication = {
  id: string;
  user_id: string;
  shelter_name: string;
  registration_id: string;
  contact_phone: string;
  website_url: string | null;
  shelter_address: string;
  organization_description: string;
  proof_document_path: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
};

async function approveShelter(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const applicationId = String(formData.get("applicationId") ?? "");

  if (!user || !applicationId) {
    return;
  }

  await supabase
    .from("shelter_applications")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq("id", applicationId);

  revalidatePath("/Admin/shelter-approved");
}

async function rejectShelter(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const applicationId = String(formData.get("applicationId") ?? "");
  const rejectionReason = String(formData.get("rejectionReason") ?? "").trim();

  if (!user || !applicationId) {
    return;
  }

  await supabase
    .from("shelter_applications")
    .update({
      status: "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: rejectionReason || "Application rejected by admin.",
    })
    .eq("id", applicationId);

  revalidatePath("/Admin/shelter-approved");
}

export default async function ShelterApprovedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };

  const isAdmin = profile?.role === "admin";

  const { data: applications, error } = isAdmin
    ? await supabase
        .from("shelter_applications")
        .select(
          "id, user_id, shelter_name, registration_id, contact_phone, website_url, shelter_address, organization_description, proof_document_path, status, reviewed_at, rejection_reason, created_at",
        )
        .order("created_at", { ascending: false })
    : { data: null, error: null };

  return (
    <>
      <DashboardTopBar role="Admin" />
      <main className="min-h-screen bg-[var(--color-cream)] px-4 pb-8 pt-28 text-stone-950 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/Admin/dashboard"
            className="text-sm font-black text-[var(--color-orange)] transition hover:text-stone-950"
          >
            Back to admin dashboard
          </Link>

          <div className="mt-5">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--color-orange)]">
              Shelter approval
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Review shelter applications
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-stone-600">
              Admin can approve real shelter organizations here. Approved
              shelters can log in and access their Shelter dashboard.
            </p>
          </div>

          {!user ? (
            <div className="mt-6 rounded-2xl border border-orange-100 bg-white p-5 text-sm font-bold shadow-sm">
              Please login as admin first.
            </div>
          ) : !isAdmin ? (
            <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-600 shadow-sm">
              Access denied. This page is only for admin accounts.
            </div>
          ) : error ? (
            <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-600 shadow-sm">
              {error.message}
            </div>
          ) : applications?.length ? (
            <div className="mt-6 grid gap-4">
              {(applications as ShelterApplication[]).map((application) => (
                <article
                  key={application.id}
                  className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-xl font-black">
                        {application.shelter_name}
                      </h2>
                      <p className="mt-1 text-sm font-bold text-stone-500">
                        Submitted{" "}
                        {new Date(application.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-amber-700">
                      {application.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm font-bold text-stone-700 sm:grid-cols-2">
                    <p>Registration ID: {application.registration_id}</p>
                    <p>Phone: {application.contact_phone}</p>
                    <p>Website: {application.website_url || "-"}</p>
                    <p>Document: {application.proof_document_path || "-"}</p>
                    <p className="sm:col-span-2">
                      Address: {application.shelter_address}
                    </p>
                    <p className="sm:col-span-2">
                      Description: {application.organization_description}
                    </p>
                    {application.rejection_reason && (
                      <p className="sm:col-span-2 text-red-600">
                        Rejection reason: {application.rejection_reason}
                      </p>
                    )}
                  </div>

                  {application.status === "pending" && (
                    <div className="mt-5 grid gap-3 lg:grid-cols-[auto_1fr]">
                      <form action={approveShelter}>
                        <input
                          type="hidden"
                          name="applicationId"
                          value={application.id}
                        />
                        <button
                          type="submit"
                          className="rounded-full bg-stone-950 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-orange-200/70 transition hover:-translate-y-0.5 hover:bg-[var(--color-orange)]"
                        >
                          Approve shelter
                        </button>
                      </form>

                      <form
                        action={rejectShelter}
                        className="grid gap-2 sm:grid-cols-[1fr_auto]"
                      >
                        <input
                          type="hidden"
                          name="applicationId"
                          value={application.id}
                        />
                        <input
                          name="rejectionReason"
                          placeholder="Reason if rejected"
                          className="rounded-full border border-orange-100 bg-white px-4 py-2.5 text-sm font-bold outline-none transition focus:border-[var(--color-orange)] focus:ring-4 focus:ring-orange-100"
                        />
                        <button
                          type="submit"
                          className="rounded-full border border-red-100 bg-red-50 px-5 py-2.5 text-sm font-black text-red-600 transition hover:bg-red-100"
                        >
                          Reject
                        </button>
                      </form>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-orange-100 bg-white p-5 text-sm font-bold text-stone-600 shadow-sm">
              No shelter applications yet.
            </div>
          )}
        </div>
      </main>
    </>
  );
}
