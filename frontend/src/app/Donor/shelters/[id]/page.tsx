import Link from "next/link";
import { notFound } from "next/navigation";
import { getShelters } from "../../campaignData";

function VerifiedBadge() {
  return (
    <span className="inline-grid h-6 w-6 shrink-0 place-items-center rounded-full bg-orange-100 text-[var(--color-orange)] ring-1 ring-orange-200">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path d="m8 12 2.5 2.5L16 9" />
        <path d="M12 3 4.5 6v5c0 4.7 3.2 8.1 7.5 10 4.3-1.9 7.5-5.3 7.5-10V6L12 3Z" />
      </svg>
    </span>
  );
}

function ShelterImage({
  imageClass,
}: {
  imageClass: string;
}) {
  return (
    <div
      className={[
        "relative min-h-52 overflow-hidden rounded-2xl bg-gradient-to-br",
        imageClass,
      ].join(" ")}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.95),transparent_30%),radial-gradient(circle_at_80%_70%,rgba(255,138,0,0.18),transparent_34%)]" />
    </div>
  );
}

export default async function DonorShelterProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shelter = getShelters().find((item) => item.id === id);

  if (!shelter) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <Link
        href="/Donor/discover"
        aria-label="Back to browse"
        className="inline-grid h-8 w-8 place-items-center text-[var(--color-orange)] transition hover:text-orange-600"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M19 12H5" />
          <path d="m11 6-6 6 6 6" />
        </svg>
      </Link>

      <section className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
        <ShelterImage imageClass={shelter.imageClass} />
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
                Shelter profile
              </p>
              <h1 className="mt-2 flex items-center gap-2 text-2xl font-black tracking-tight text-stone-950 sm:text-3xl">
                <span>{shelter.name}</span>
                <VerifiedBadge />
              </h1>
              <p className="mt-2 text-sm font-semibold text-[var(--color-orange)]">
                {shelter.location}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm sm:min-w-96">
              <div className="rounded-xl bg-orange-50/50 p-3">
                <p className="font-semibold text-stone-950">{shelter.verifiedSince}</p>
                <p className="text-xs font-medium text-stone-500">Verified</p>
              </div>
              <div className="rounded-xl bg-orange-50/50 p-3">
                <p className="font-semibold text-stone-950">{shelter.animalsHelped}</p>
                <p className="text-xs font-medium text-stone-500">Helped</p>
              </div>
              <div className="rounded-xl bg-orange-50/50 p-3">
                <p className="font-semibold text-stone-950">{shelter.campaigns.length}</p>
                <p className="text-xs font-medium text-stone-500">Campaigns</p>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-orange-100 p-4">
            <h2 className="text-base font-black text-stone-950">
              Background story
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              {shelter.story}
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
            Ongoing campaigns
          </p>
          <h2 className="mt-1 text-xl font-black text-stone-950">
            Campaigns by {shelter.name}
          </h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {shelter.campaigns.map((campaign) => (
            <article
              key={campaign.id}
              className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-lg font-black text-stone-950">
                    {campaign.title}
                  </h3>
                </div>
                <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  {campaign.status}
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-stone-600">
                {campaign.story}
              </p>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-semibold text-stone-500">
                  <span>Raised</span>
                  <span>
                    {campaign.raised}% of {campaign.goal}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-orange-100">
                  <div
                    className="donor-progress-fill h-full rounded-full bg-[var(--color-orange)]"
                    style={{ width: `${campaign.raised}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-orange-50/50 p-3">
                  <p className="font-semibold text-stone-950">
                    {campaign.daysLeft} days left
                  </p>
                  <p className="text-xs font-medium text-stone-500">
                    {campaign.duration} campaign
                  </p>
                </div>
                <div className="rounded-xl bg-orange-50/50 p-3">
                  <p className="font-semibold text-stone-950">
                    {campaign.milestones.length}
                  </p>
                  <p className="text-xs font-medium text-stone-500">
                    Milestones
                  </p>
                </div>
              </div>

              <Link
                href="/Donor/donate"
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[var(--color-orange)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                Donate
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
