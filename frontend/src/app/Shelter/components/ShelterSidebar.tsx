"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";

const shelterNavigationGroups = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard", href: "/Shelter/dashboard", icon: DashboardIcon },
    ],
  },
  {
    label: "Campaign Features",
    items: [
      { name: "Campaigns", href: "/Shelter/campaigns", icon: CampaignsIcon },
      { name: "Create Campaign", href: "/Shelter/campaigns/create", icon: PlusIcon },
    ],
  },
  {
    label: "Fund Features",
    items: [
      { name: "Donations", href: "/Shelter/donations", icon: CoinsIcon },
      { name: "Withdraw Funds", href: "/Shelter/withdrawals", icon: WalletIcon },
      { name: "Refunds", href: "/Shelter/refunds", icon: RefundIcon },
    ],
  },
  {
    label: "Account Features",
    items: [
      { name: "Notifications", href: "/Shelter/notifications", icon: NotificationIcon },
      { name: "Profile", href: "/Shelter/profile", icon: ProfileIcon },
    ],
  },
];

function isActiveRoute(pathname: string, href: string) {
  if (href === "/Shelter/campaigns") {
    return (
      pathname === href ||
      (pathname.startsWith(`${href}/`) &&
        !pathname.startsWith("/Shelter/campaigns/create"))
    );
  }

  if (href === "/Shelter/campaigns/create") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavIcon({ children }: { children: ReactNode }) {
  return (
    <span className="grid h-5 w-5 shrink-0 place-items-center" aria-hidden="true">
      {children}
    </span>
  );
}

function DashboardIcon() {
  return (
    <NavIcon>
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
        <path
          d="M3.5 4.5h5v5h-5v-5Zm8 0h5v5h-5v-5Zm-8 8h5v3h-5v-3Zm8 0h5v3h-5v-3Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    </NavIcon>
  );
}

function CampaignsIcon() {
  return (
    <NavIcon>
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
        <path
          d="M4 14.5V6.7l8.4-2.2v12L4 14.5Zm8.4-7.8h2.1a2.5 2.5 0 0 1 0 5h-2.1"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="m6.2 15 1 2"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    </NavIcon>
  );
}

function PlusIcon() {
  return (
    <NavIcon>
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
        <path
          d="M10 4v12M4 10h12"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    </NavIcon>
  );
}

function ProfileIcon() {
  return (
    <NavIcon>
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
        <path
          d="M10 10.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm-5.5 6c.8-2.5 2.7-4 5.5-4s4.7 1.5 5.5 4"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </NavIcon>
  );
}

function CoinsIcon() {
  return (
    <NavIcon>
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
        <ellipse cx="10" cy="6" rx="5.5" ry="2.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4.5 6v4c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5V6m-11 4v4c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-4" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    </NavIcon>
  );
}

function WalletIcon() {
  return (
    <NavIcon>
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
        <path d="M3.5 5.5h12.8v10H3.5v-10Zm0 2h12.8M13 10h4v3h-4a1.5 1.5 0 0 1 0-3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </NavIcon>
  );
}

function RefundIcon() {
  return (
    <NavIcon>
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
        <path d="M5.3 7.1H2.8V4.6M3.2 7a7 7 0 1 1-.1 5.8M6.8 9.5h6.4M10 6.8v6.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </NavIcon>
  );
}

function NotificationIcon() {
  return (
    <NavIcon>
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
        <path
          d="M5.2 8.2a4.8 4.8 0 0 1 9.6 0v3.1l1.4 2.3H3.8l1.4-2.3V8.2Zm3 7.3a2 2 0 0 0 3.6 0"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </NavIcon>
  );
}

function ToggleIcon({ open }: { open: boolean }) {
  return (
    <span className="relative h-5 w-5" aria-hidden="true">
      <span
        className={[
          "absolute left-0 top-1/2 block h-0.5 w-5 rounded-full bg-current transition-transform duration-300",
          open ? "-translate-y-1/2 rotate-45" : "-translate-y-2",
        ].join(" ")}
      />
      <span
        className={[
          "absolute left-0 top-1/2 block h-0.5 w-5 -translate-y-1/2 rounded-full bg-current transition-opacity duration-300",
          open ? "opacity-0" : "opacity-100",
        ].join(" ")}
      />
      <span
        className={[
          "absolute left-0 top-1/2 block h-0.5 w-5 rounded-full bg-current transition-transform duration-300",
          open ? "-translate-y-1/2 -rotate-45" : "translate-y-1.5",
        ].join(" ")}
      />
    </span>
  );
}

function SidebarContent({
  collapsed = false,
  onNavigate,
  onToggleCollapsed,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
  onToggleCollapsed?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {onToggleCollapsed ? (
        <div className={collapsed ? "flex justify-center px-3 pt-4" : "flex justify-end px-5 pt-4"}>
          <button
            type="button"
            aria-label={collapsed ? "Expand shelter navigation" : "Collapse shelter navigation"}
            aria-expanded={!collapsed}
            onClick={onToggleCollapsed}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-orange-100 bg-white text-stone-700 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-50 hover:text-[var(--color-orange)]"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
              <path
                d={collapsed ? "m8 5 5 5-5 5" : "m12 5-5 5 5 5"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      ) : null}

      <nav
        className="flex-1 overflow-y-auto px-3 py-4 transition-all duration-300 ease-out"
        aria-label="Shelter portal"
      >
        {shelterNavigationGroups.map((group, groupIndex) => (
          <section
            key={group.label}
            aria-labelledby={collapsed ? undefined : `shelter-nav-${groupIndex}`}
            className={groupIndex === 0 ? "" : collapsed ? "mt-3 border-t border-orange-100 pt-3" : "mt-5"}
          >
            {!collapsed ? (
              <h2
                id={`shelter-nav-${groupIndex}`}
                className="mb-2 px-4 text-[0.68rem] font-black uppercase tracking-[0.16em] text-stone-400"
              >
                {group.label}
              </h2>
            ) : null}

            <div className="space-y-2">
              {group.items.map((item) => {
                const active = isActiveRoute(pathname, item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    aria-label={collapsed ? item.name : undefined}
                    title={collapsed ? item.name : undefined}
                    onClick={onNavigate}
                    className={[
                      "group relative flex min-h-11 items-center rounded-2xl text-sm font-black transition-all duration-300 ease-out",
                      collapsed ? "justify-center px-0 py-3" : "gap-3 px-4 py-3",
                      active
                        ? "bg-orange-50 text-[var(--color-orange)] shadow-sm ring-1 ring-orange-100"
                        : "text-stone-800 hover:bg-orange-50 hover:text-stone-950",
                    ].join(" ")}
                  >
                    <Icon />
                    <span
                      className={[
                        "overflow-hidden whitespace-nowrap transition-all duration-300 ease-out",
                        collapsed ? "w-0 opacity-0" : "w-auto opacity-100",
                      ].join(" ")}
                    >
                      {item.name}
                    </span>
                    {collapsed ? (
                      <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 rounded-xl border border-orange-100 bg-white px-3 py-2 text-xs font-black text-stone-950 opacity-0 shadow-lg shadow-orange-200/50 transition-opacity duration-200 group-hover:opacity-100">
                        {item.name}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>
    </div>
  );
}

export function ShelterSidebar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Open shelter navigation"
        aria-expanded={drawerOpen}
        onClick={() => setDrawerOpen(true)}
        className="fixed left-4 top-20 z-[90] inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-100 bg-white text-stone-950 shadow-lg shadow-orange-200/50 transition hover:-translate-y-0.5 hover:bg-orange-50 md:hidden"
      >
        <ToggleIcon open={drawerOpen} />
      </button>

      <aside
        className={[
          "relative z-30 hidden shrink-0 self-stretch border-r border-orange-100 bg-white shadow-[18px_0_46px_rgba(155,86,20,0.08)] transition-[width] duration-300 ease-out md:block",
          collapsed ? "w-[5.5rem]" : "w-56",
        ].join(" ")}
      >
        <div className="sticky top-16 flex h-[calc(100dvh-4rem)] flex-col overflow-visible">
          <SidebarContent
            collapsed={collapsed}
            onToggleCollapsed={() => setCollapsed((current) => !current)}
          />
        </div>
      </aside>

      <div
        className={[
          "fixed inset-0 z-[60] transition md:hidden",
          drawerOpen ? "pointer-events-auto" : "pointer-events-none",
        ].join(" ")}
        aria-hidden={!drawerOpen}
        inert={!drawerOpen}
      >
        <button
          type="button"
          aria-label="Close shelter navigation"
          className={[
            "absolute inset-0 bg-stone-950/35 backdrop-blur-sm transition-opacity duration-300",
            drawerOpen ? "opacity-100" : "opacity-0",
          ].join(" ")}
          onClick={() => setDrawerOpen(false)}
        />
        <aside
          className={[
            "relative flex h-full w-[min(20rem,calc(100vw-2rem))] flex-col overflow-y-auto border-r border-orange-100 bg-white shadow-2xl shadow-stone-950/20 transition-transform duration-300 ease-out",
            drawerOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          <div className="flex shrink-0 justify-end px-4 pt-4">
            <button
              type="button"
              aria-label="Close shelter navigation"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 text-stone-950 transition hover:bg-orange-100"
            >
              <ToggleIcon open={drawerOpen} />
            </button>
          </div>
          <SidebarContent onNavigate={() => setDrawerOpen(false)} />
        </aside>
      </div>
    </>
  );
}
