import { Suspense } from "react";
import Link from "next/link";
import DonorReportForm from "../../components/DonorReportForm";
import { DonorSupportRequestList } from "@/app/components/DonorSupportRequestList";

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
    question: "Why is my donation shown as preview data?",
    answer:
      "The current donor UI is ready for presentation. Real donation records will appear after the donation smart contract and backend history are connected.",
  },
  {
    question: "Who checks milestone proof?",
    answer:
      "Milestone proof is intended to be reviewed by admin before campaign funds are released.",
  },
  {
    question: "Can I report a shelter or campaign?",
    answer:
      "Yes. The report flow is represented here as a donor support request and can later be connected to an admin review queue.",
  },
];

function FaqItem({ answer, question }: { answer: string; question: string }) {
  return (
    <details className="group bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3">
        <span className="text-sm font-semibold text-stone-950">{question}</span>
        <span className="text-[var(--color-orange)] transition group-open:rotate-180">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </summary>
      <p className="px-4 pb-3 text-sm leading-6 text-stone-600">{answer}</p>
    </details>
  );
}

export default function DonorHelpPage() {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
          Help & Support
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-stone-950 sm:text-3xl">
          Donor help center
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          Ask questions, report campaign concerns, or check how donation and
          milestone review should work once live data is connected.
        </p>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Suspense
          fallback={
            <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-stone-600">
                Loading report form...
              </p>
            </div>
          }
        >
          <DonorReportForm />
        </Suspense>

        <div className="space-y-5">
          <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
                  Report status
                </p>
                <h2 className="mt-1 text-xl font-black text-stone-950">
                  Submitted reports
                </h2>
              </div>
              <p className="text-xs font-medium text-stone-500">
                Supabase queue
              </p>
            </div>
            <DonorSupportRequestList />
          </div>

          <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
              Common topics
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {helpTopics.map((topic) => (
                <article
                  key={topic.title}
                  className="rounded-xl border border-orange-100 bg-orange-50/25 p-3"
                >
                  <h3 className="text-sm font-black text-stone-950">
                    {topic.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    {topic.description}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
              Q&A
            </p>
            <div className="mt-4 divide-y divide-orange-100 overflow-hidden rounded-xl border border-orange-100">
              {faqs.map((item) => (
                <FaqItem
                  key={item.question}
                  question={item.question}
                  answer={item.answer}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
