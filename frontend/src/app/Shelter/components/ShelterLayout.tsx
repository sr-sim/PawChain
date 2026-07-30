import type { ReactNode } from "react";
import { ShelterSidebar } from "./ShelterSidebar";
import { ShelterTopBar } from "./ShelterTopBar";
import styles from "./ShelterLayout.module.css";

type ShelterLayoutProps = {
  children: ReactNode;
};

export function ShelterLayout({ children }: ShelterLayoutProps) {
  return (
    <div className={`${styles.portal} min-h-screen bg-[var(--color-cream)] text-stone-950`}>
      <ShelterTopBar />
      <div className="flex min-h-[calc(100vh-4rem)] items-start">
        <ShelterSidebar />
        <main className="min-w-0 w-full flex-1 px-4 pb-10 sm:px-6 lg:px-8 2xl:px-10">
          <div className="mx-auto w-full max-w-[1700px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
