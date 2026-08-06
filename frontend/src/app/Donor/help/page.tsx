import { Suspense } from "react";
import { DonorHelpReportSection } from "@/app/components/DonorHelpReportSection";

const helpTopics = [
  {
    title: "Donation status",
    description: "Ask why a donation is pending, confirmed, or not visible yet.",
  },
  {
    title: "Milestone proof",
    description: "Request clarification about uploaded proof or fund release timing.",
  },
  {
    title: "Wallet access",
    description: "Get help when your RoleNFT or wallet verification does not load.",
  },
  {
    title: "Report concern",
    description: "Flag suspicious shelter activity, fake campaign details, or misuse concerns.",
  },
];

const faqs = [
  {
    question: "How does donation checkout work?",
    answer:
      "PawChain confirms the wallet transaction first, then saves the donation history and transaction hash for tracking.",
  },
  {
    question: "Who checks milestone proof?",
    answer:
      "Admin reviews shelter milestone proof before the milestone status and fund release information are reflected to donors.",
  },
  {
    question: "Can I report a shelter or campaign?",
    answer: "Yes. Reports are saved in PawChain for review.",
  },
];

export default function DonorHelpPage() {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_20rem] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
              Help & Support
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-stone-950 sm:text-3xl">
              Donor help center
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Ask questions, report campaign concerns, or check how donation and
              milestone review works across PawChain records.
            </p>
          </div>

          <div className="rounded-xl border border-orange-100 bg-orange-50/25 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
              Admin contact
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Direct support for urgent account or campaign concerns.
            </p>
            <a
              href="mailto:pawchain.admin@gmail.com"
              className="mt-3 inline-flex break-all text-sm font-black text-[var(--color-orange)] underline decoration-orange-200 decoration-2 underline-offset-4 transition hover:text-orange-600 hover:decoration-orange-400"
            >
              pawchain.admin@gmail.com
            </a>
          </div>
        </div>
      </section>

      <Suspense
        fallback={
          <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-stone-600">
              Loading report center...
            </p>
          </div>
        }
      >
        <DonorHelpReportSection helpTopics={helpTopics} faqs={faqs} />
      </Suspense>
    </div>
  );
}
