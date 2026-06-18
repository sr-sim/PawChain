import { ConnectWallet } from "./ConnectWallet";

type DashboardTopBarProps = {
  role: string;
};

export function DashboardTopBar({ role }: DashboardTopBarProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-orange-200/70 bg-[linear-gradient(90deg,rgba(255,250,241,0.97),rgba(255,255,255,0.94)_48%,rgba(255,239,199,0.96))] shadow-[0_14px_42px_rgba(155,86,20,0.1)] backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-orange-300/45 ring-1 ring-white/80">
            <img
              src="/images/logo.png"
              alt="PawChain logo"
              className="h-full w-full object-contain"
            />
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-black leading-5 text-stone-950 sm:text-lg">
              PawChain
            </p>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">
              {role} Dashboard
            </p>
          </div>
        </div>
        <ConnectWallet />
      </div>
    </header>
  );
}
