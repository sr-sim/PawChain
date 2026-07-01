import Link from "next/link";
import type { ReactNode } from "react";
import { DashboardTopBar } from "@/app/components/DashboardTopBar";
import { RoleNFTBadge } from "@/app/components/RoleNFTBadge";
import { getDashboardProfile } from "@/lib/dashboard-access";

type DashboardProps = {
  searchParams?: Promise<{
    walletAddress?: string;
  }>;
};

type DashboardStat = {
  label: string;
  value: string;
  icon: ReactNode;
  accent: string;
};

type PlaceholderItem = {
  id: string;
  title: string;
  description: string;
};

const dashboardStats: DashboardStat[] = [
  {
    label: "Total Funds Released",
    value: "RM 0",
    icon: <CoinsIcon />,
    accent: "from-[var(--color-gold)] to-[var(--color-orange)]",
  },
  {
    label: "Active Campaigns",
    value: "0",
    icon: <MegaphoneIcon />,
    accent: "from-[var(--color-orange)] to-[var(--color-peach)]",
  },
  {
    label: "Pending Milestone Reviews",
    value: "0",
    icon: <ClockIcon />,
    accent: "from-[var(--color-peach)] to-[var(--color-gold)]",
  },
  {
    label: "Rejected Milestones",
    value: "0",
    icon: <XCircleIcon />,
    accent: "from-red-400 to-[var(--color-orange)]",
  },
];

const recentNotifications: PlaceholderItem[] = [];
const recentMilestoneSubmissions: PlaceholderItem[] = [];

function IconFrame({ children }: { children: ReactNode }) {
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-orange-50 text-[var(--color-orange)] shadow-inner shadow-orange-100 ring-1 ring-orange-100">
      {children}
    </span>
  );
}

function CoinsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M7 7.5c0-1.4 2.2-2.5 5-2.5s5 1.1 5 2.5S14.8 10 12 10 7 8.9 7 7.5Zm0 0v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 11.5v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MegaphoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M5 14V9l10-3v11L5 14Zm10-6h2a3 3 0 0 1 0 6h-2M7 14l1.5 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5l3 2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-3-12 6 6m0-6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M18 10a6 6 0 0 0-12 0c0 7-2 7-2 7h16s-2 0-2-7Zm-4.3 10a2 2 0 0 1-3.4 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M6 21V4m0 0h11l-2.5 4L17 12H6V4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PawIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M8.2 10.2c1.1 0 2-1.2 2-2.7s-.9-2.7-2-2.7-2 1.2-2 2.7.9 2.7 2 2.7Zm7.6 0c1.1 0 2-1.2 2-2.7s-.9-2.7-2-2.7-2 1.2-2 2.7.9 2.7 2 2.7ZM5 14.2c1 0 1.8-.9 1.8-2s-.8-2-1.8-2-1.8.9-1.8 2 .8 2 1.8 2Zm14 0c1 0 1.8-.9 1.8-2s-.8-2-1.8-2-1.8.9-1.8 2 .8 2 1.8 2Zm-7 6c2.8 0 5-1.2 5-3 0-1.6-2-4.2-5-4.2s-5 2.6-5 4.2c0 1.8 2.2 3 5 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M12 5v14m-7-7h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EmptyState({
  title,
  message,
  icon,
}: {
  title: string;
  message: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-orange-200 bg-[linear-gradient(135deg,rgba(var(--color-cream-rgb),0.72),rgba(var(--color-peach-rgb),0.22))] p-6 text-center shadow-inner shadow-orange-100/70">
      <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-white text-[var(--color-orange)] shadow-lg shadow-orange-200/50 ring-1 ring-orange-100">
        {icon}
      </span>
      <p className="text-sm font-black text-stone-950">{title}</p>
      <p className="mt-2 text-sm font-bold leading-6 text-stone-600">
        {message}
      </p>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-[0_18px_48px_rgba(155,86,20,0.08)] sm:p-6">
      <div className="flex items-center gap-3">
        <IconFrame>{icon}</IconFrame>
        <h2 className="text-xl font-black text-stone-950">{title}</h2>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function ShelterDashboard({
  searchParams,
}: DashboardProps) {
  const params = await searchParams;
  const { userId, profile, accessMode, roleNFT } = await getDashboardProfile(
    "shelter",
    params?.walletAddress,
  );

  const shelterName = profile?.full_name ?? "Shelter";
  const shelterRole = profile?.role ?? "Shelter";
  const walletAddress = profile?.wallet_address ?? "Not connected";
  const quickActions = [
    {
      label: "Create Campaign",
      href: "/Shelter/campaigns",
      icon: <PlusIcon />,
    },
    {
      label: "Update Profile",
      href: "/Shelter/profile",
      icon: <PawIcon />,
    },
    {
      label: "View Milestones",
      href: "/Shelter/milestones",
      icon: <FlagIcon />,
    },
  ];

  return (
    <div className="space-y-6">
      <DashboardTopBar role="Shelter" />
      <section className="overflow-hidden rounded-2xl border border-orange-100 bg-[linear-gradient(135deg,rgba(var(--color-white-rgb),0.98),rgba(var(--color-cream-rgb),0.9)_48%,rgba(var(--color-peach-rgb),0.5))] p-5 shadow-[0_22px_60px_rgba(155,86,20,0.12)] sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative z-10">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">
              Shelter Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-black text-stone-950 sm:text-4xl">
              Welcome back, {shelterName}
            </h1>
            <p className="mt-3 max-w-2xl text-base font-bold leading-7 text-stone-700">
              Track campaign progress, milestone reviews, and released funds
              from your PawChain shelter portal.
            </p>
          </div>

          <div className="relative grid min-h-52 place-items-center rounded-2xl border border-white/80 bg-white/55 p-5 text-[var(--color-orange)] shadow-inner shadow-orange-100/80 lg:w-72">
            <div className="absolute right-5 top-5 h-12 w-12 rounded-full bg-[var(--color-gold)]/25" />
            <div className="absolute bottom-5 left-6 h-8 w-8 rounded-full bg-[var(--color-orange)]/15" />
            <PawIcon className="relative h-24 w-24 drop-shadow-sm" />
          </div>

          <div className="rounded-2xl border border-orange-100 bg-white/78 p-4 text-sm font-bold text-stone-800 shadow-lg shadow-orange-200/30 backdrop-blur lg:min-w-72">
            <p>
              Role: <span className="font-black text-stone-950">{shelterRole}</span>
            </p>
            <div className="mt-3">
              <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-[var(--color-orange)]">
                Wallet
              </p>
              <span className="inline-flex max-w-full rounded-full border border-orange-200 bg-[var(--color-cream)] px-3 py-1.5 text-xs font-black text-stone-950 shadow-inner shadow-orange-100">
                <span className="break-all">{walletAddress}</span>
              </span>
            </div>
            <p className="mt-2 break-all">
              Email:{" "}
              <span className="font-black text-stone-950">
                {profile?.email ?? "-"}
              </span>
            </p>
            <div className="mt-4 border-t border-orange-100 pt-4">
              <RoleNFTBadge role="Shelter" roleNFT={roleNFT} />
            </div>
          </div>
        </div>
      </section>

      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Shelter dashboard stats"
      >
        {dashboardStats.map((stat) => (
          <article
            key={stat.label}
            className="group flex min-h-36 flex-col justify-center overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-[0_16px_42px_rgba(155,86,20,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_58px_rgba(155,86,20,0.16)]"
          >
            <div className={["h-1.5 bg-gradient-to-r", stat.accent].join(" ")} />
            <div className="flex flex-1 items-center gap-4 p-5">
              <IconFrame>{stat.icon}</IconFrame>
              <div>
                <p className="text-sm font-black text-stone-600">{stat.label}</p>
                <p className="mt-2 text-3xl font-black text-stone-950">
                  {stat.value}
                </p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Recent Notifications" icon={<BellIcon />}>
          {recentNotifications.length > 0 ? (
            <div className="space-y-3">
              {recentNotifications.map((notification) => (
                <article
                  key={notification.id}
                  className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4"
                >
                  <h3 className="text-sm font-black text-stone-950">
                    {notification.title}
                  </h3>
                  <p className="mt-2 text-sm font-bold leading-6 text-stone-600">
                    {notification.description}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No notifications yet"
              message="Campaign and milestone updates will appear here when backend notification data is available."
              icon={<BellIcon />}
            />
          )}
        </SectionCard>

        <SectionCard title="Recent Milestone Submissions" icon={<FlagIcon />}>
          {recentMilestoneSubmissions.length > 0 ? (
            <div className="space-y-3">
              {recentMilestoneSubmissions.map((milestone) => (
                <article
                  key={milestone.id}
                  className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4"
                >
                  <h3 className="text-sm font-black text-stone-950">
                    {milestone.title}
                  </h3>
                  <p className="mt-2 text-sm font-bold leading-6 text-stone-600">
                    {milestone.description}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No milestone submissions"
              message="Recent submissions will show here once milestone tracking is connected."
              icon={<FlagIcon />}
            />
          )}
        </SectionCard>
      </div>

      <SectionCard title="Quick Actions" icon={<PawIcon />}>
        <div className="grid gap-3 sm:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex min-h-28 flex-col items-center justify-center gap-3 rounded-2xl border border-orange-100 bg-[linear-gradient(135deg,var(--color-white),rgba(var(--color-cream-rgb),0.68))] px-4 py-5 text-center text-sm font-black text-stone-950 shadow-sm shadow-orange-100 transition duration-300 hover:-translate-y-1 hover:border-[var(--color-orange)] hover:shadow-[0_18px_42px_rgba(255,138,0,0.22)]"
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-50 text-[var(--color-orange)] shadow-inner shadow-orange-100 ring-1 ring-orange-100 transition duration-300 group-hover:bg-[var(--color-orange)] group-hover:text-white">
                {action.icon}
              </span>
              <span>{action.label}</span>
            </Link>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
