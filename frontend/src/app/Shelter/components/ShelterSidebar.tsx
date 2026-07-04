"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

const SIDEBAR_EXPANDED_WIDTH = "18rem";
const SIDEBAR_COLLAPSED_WIDTH = "5.5rem";

const shelterNavigation = [
  { name: "Dashboard", href: "/Shelter/dashboard", icon: DashboardIcon },
  { name: "Create Campaign", href: "/Shelter/campaigns/create", icon: PlusIcon },
  { name: "Campaign Hub", href: "/Shelter/campaigns", icon: CampaignsIcon },
  { name: "Profile", href: "/Shelter/profile", icon: ProfileIcon },
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
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div
        className={[
          "min-h-[105px] border-b border-orange-100 py-5 transition-all duration-300 ease-out",
          collapsed ? "px-3 text-center" : "px-5",
        ].join(" ")}
      >
        <p
          className={[
            "text-xs font-black uppercase tracking-[0.16em] text-[var(--color-orange)] transition-opacity duration-200",
            collapsed ? "sr-only" : "opacity-100",
          ].join(" ")}
        >
          Shelter Portal
        </p>
        <h2
          className={[
            "mt-1 overflow-hidden text-xl font-black text-stone-950 transition-all duration-300 ease-out",
            collapsed ? "max-h-0 opacity-0" : "max-h-14 opacity-100",
          ].join(" ")}
        >
          Manage your shelter
        </h2>
        {collapsed ? (
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 text-sm font-black text-[var(--color-orange)] ring-1 ring-orange-100">
            SP
          </span>
        ) : null}
      </div>

      <nav
        className={[
          "flex-1 space-y-2 py-4 transition-all duration-300 ease-out",
          collapsed ? "px-3" : "px-3",
        ].join(" ")}
        aria-label="Shelter portal"
      >
        {shelterNavigation.map((item) => {
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
                  ? "bg-[var(--color-orange)] text-white shadow-lg shadow-orange-200/70"
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
      </nav>
    </div>
  );
}

export function ShelterSidebar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--shelter-sidebar-width",
      collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH,
    );

    return () => {
      document.documentElement.style.removeProperty("--shelter-sidebar-width");
    };
  }, [collapsed]);

  return (
    <>
      <button
        type="button"
        aria-label="Open shelter navigation"
        aria-expanded={drawerOpen}
        onClick={() => setDrawerOpen(true)}
        className="fixed left-4 top-20 z-40 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-100 bg-white text-stone-950 shadow-lg shadow-orange-200/50 transition hover:-translate-y-0.5 hover:bg-orange-50 lg:hidden"
      >
        <ToggleIcon open={drawerOpen} />
      </button>

      <aside
        className={[
          "fixed bottom-0 left-0 top-[65px] z-30 hidden overflow-visible border-r border-orange-100 bg-white/90 shadow-[18px_0_46px_rgba(155,86,20,0.08)] backdrop-blur-xl transition-[width] duration-300 ease-out lg:block",
          collapsed ? "w-[5.5rem]" : "w-72",
        ].join(" ")}
      >
        <div className="flex justify-end px-3 pt-4">
          <button
            type="button"
            aria-label={collapsed ? "Expand shelter navigation" : "Collapse shelter navigation"}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((current) => !current)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-orange-100 bg-white text-stone-950 shadow-lg shadow-orange-200/50 transition hover:-translate-y-0.5 hover:bg-orange-50"
          >
            <span
              className={[
                "text-lg font-black leading-none transition-transform duration-300",
                collapsed ? "rotate-180" : "rotate-0",
              ].join(" ")}
              aria-hidden="true"
            >
              {"<"}
            </span>
          </button>
        </div>
        <SidebarContent collapsed={collapsed} />
      </aside>

      <div
        className={[
          "fixed inset-0 z-[60] transition lg:hidden",
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
            "relative h-full w-[min(20rem,calc(100vw-2rem))] overflow-y-auto border-r border-orange-100 bg-white shadow-2xl shadow-stone-950/20 transition-transform duration-300 ease-out",
            drawerOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          <div className="flex justify-end px-4 pt-4">
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
