import type { ReactNode } from "react";
import { ShelterSidebar } from "./ShelterSidebar";
import { ShelterTopBar } from "./ShelterTopBar";

type ShelterLayoutProps = {
  children: ReactNode;
};

export function ShelterLayout({ children }: ShelterLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--color-cream)] text-stone-950">
      <ShelterTopBar />
      <div className="flex min-h-[calc(100vh-4rem)] items-start">
        <ShelterSidebar />
        <main className="min-w-0 flex-1 px-4 pb-8 sm:px-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
