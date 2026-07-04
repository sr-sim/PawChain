import type { ReactNode } from "react";
import { DashboardTopBar } from "@/app/components/DashboardTopBar";
import { ShelterSidebar } from "./ShelterSidebar";

type ShelterLayoutProps = {
  children: ReactNode;
};

export function ShelterLayout({ children }: ShelterLayoutProps) {
  return (
    <>
      <DashboardTopBar role="Shelter" />
      <ShelterSidebar />
      <main className="min-h-screen bg-[var(--color-cream)] px-4 pb-8 pt-[65px] text-stone-950 transition-[padding] duration-300 ease-out sm:px-8 lg:pl-[calc(var(--shelter-sidebar-width)+2rem)]">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </>
  );
}
