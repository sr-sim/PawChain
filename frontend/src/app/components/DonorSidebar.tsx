"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationSections = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/Donor/dashboard",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 13h7V4H4v9Z" />
            <path d="M13 20h7V4h-7v16Z" />
            <path d="M4 20h7v-5H4v5Z" />
          </svg>
        ),
      },
      {
        label: "Discover",
        href: "/Donor/discover",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m21 21-4.3-4.3" />
            <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Giving",
    items: [
      {
        label: "Donate",
        href: "/Donor/donate",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 21s-7-4.4-9.2-9A5.4 5.4 0 0 1 12 6.2 5.4 5.4 0 0 1 21.2 12C19 16.6 12 21 12 21Z" />
          </svg>
        ),
      },
      {
        label: "Donation Tracking",
        href: "/Donor/tracking",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 19V5" />
            <path d="M4 19h16" />
            <path d="m7 15 4-4 3 3 5-7" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        label: "Account & Profile",
        href: "/Donor/profile",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
          </svg>
        ),
      },
      {
        label: "Settings",
        href: "/Donor/settings",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
            <path d="M19.4 15a1.8 1.8 0 0 0 .36 2l.05.05a2.1 2.1 0 1 1-2.97 2.97l-.05-.05a1.8 1.8 0 0 0-2-.36 1.8 1.8 0 0 0-1.1 1.65V21a2.1 2.1 0 1 1-4.2 0v-.08A1.8 1.8 0 0 0 8.4 19.3a1.8 1.8 0 0 0-2 .36l-.05.05a2.1 2.1 0 1 1-2.97-2.97l.05-.05a1.8 1.8 0 0 0 .36-2A1.8 1.8 0 0 0 2.15 13H2a2.1 2.1 0 1 1 0-4.2h.08A1.8 1.8 0 0 0 3.7 7.6a1.8 1.8 0 0 0-.36-2l-.05-.05a2.1 2.1 0 1 1 2.97-2.97l.05.05a1.8 1.8 0 0 0 2 .36H8.4A1.8 1.8 0 0 0 9.5 1.35V1a2.1 2.1 0 1 1 4.2 0v.08A1.8 1.8 0 0 0 14.8 2.7a1.8 1.8 0 0 0 2-.36l.05-.05a2.1 2.1 0 1 1 2.97 2.97l-.05.05a1.8 1.8 0 0 0-.36 2V7.6A1.8 1.8 0 0 0 21.05 8.7H21a2.1 2.1 0 1 1 0 4.2h-.08A1.8 1.8 0 0 0 19.4 15Z" />
          </svg>
        ),
      },
      {
        label: "Help & Support",
        href: "/Donor/help",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 18h.01" />
            <path d="M9.1 9a3 3 0 1 1 4.8 2.4c-.9.6-1.4 1.2-1.4 2.3v.3" />
            <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" />
          </svg>
        ),
      },
      {
        label: "NFT Badges",
        href: "/Donor/badges",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 3 4.5 6v5c0 4.7 3.2 8.1 7.5 10 4.3-1.9 7.5-5.3 7.5-10V6L12 3Z" />
            <path d="M9 12.5 11 14l4-5" />
          </svg>
        ),
      },
    ],
  },
];

type DonorSidebarProps = {
  isOpen: boolean;
  onNavigate?: () => void;
  walletAddress?: string;
};

function withWalletAddress(href: string, walletAddress?: string) {
  if (!walletAddress) {
    return href;
  }

  return `${href}?walletAddress=${encodeURIComponent(walletAddress)}`;
}

export function DonorSidebar({
  isOpen,
  onNavigate,
  walletAddress,
}: DonorSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Donor navigation"
      className={[
        "donor-chain-sidebar fixed bottom-0 left-0 top-16 z-40 overflow-hidden border-r border-orange-100 bg-white/94 shadow-[14px_0_36px_rgba(155,86,20,0.06)] backdrop-blur-2xl transition-[width] duration-300",
        isOpen ? "w-64" : "w-0",
      ].join(" ")}
    >
      <div className="donor-nav-rail flex h-full w-full min-w-64 flex-col overflow-x-hidden px-4 py-4">
        <nav className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden">
          {navigationSections.map((section) => (
            <div key={section.label}>
              <p className="mb-1.5 px-2 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {section.label}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={withWalletAddress(item.href, walletAddress)}
                      aria-current={isActive ? "page" : undefined}
                      onClick={onNavigate}
                      className={[
                        "donor-nav-row flex min-h-10 items-center gap-3 rounded-lg border px-3 py-2 text-sm font-semibold",
                        "focus:outline-none focus-visible:ring-1 focus-visible:ring-orange-200",
                        isActive
                          ? "border-orange-200 bg-orange-50/65 text-[var(--color-orange)] shadow-[inset_3px_0_0_var(--color-orange),0_10px_24px_rgba(255,138,0,0.10)]"
                          : "border-transparent text-slate-700 hover:border-orange-100 hover:bg-orange-50/60 hover:text-stone-950",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "grid h-4.5 w-4.5 shrink-0 place-items-center [&>svg]:h-full [&>svg]:w-full [&>svg]:stroke-current [&>svg]:stroke-2 [&>svg]:stroke-linecap-round [&>svg]:stroke-linejoin-round",
                          isActive ? "text-[var(--color-orange)]" : "text-slate-500",
                        ].join(" ")}
                      >
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-4 border-t border-orange-100 pt-3">
          <Link
            href="/"
            onClick={onNavigate}
            className="donor-nav-row flex min-h-10 items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-slate-700 hover:border-orange-100 hover:bg-orange-50/70 hover:text-stone-950 focus:outline-none focus-visible:ring-1 focus-visible:ring-orange-200"
          >
            <span className="grid h-5 w-5 shrink-0 place-items-center text-slate-500 [&>svg]:h-full [&>svg]:w-full [&>svg]:stroke-current [&>svg]:stroke-2 [&>svg]:stroke-linecap-round [&>svg]:stroke-linejoin-round">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M10 17l-5-5 5-5" />
                <path d="M5 12h12" />
                <path d="M14 4h5v16h-5" />
              </svg>
            </span>
            <span>Logout</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
