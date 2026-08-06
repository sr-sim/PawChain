"use client";

import { useState } from "react";
import DonorReportForm from "./DonorReportForm";
import {
  DonorSupportRequestList,
  type DonorSupportRequestSummary,
} from "./DonorSupportRequestList";

type HelpTopic = {
  title: string;
  description: string;
};

type FaqItemData = {
  question: string;
  answer: string;
};

function FaqItem({ answer, question }: FaqItemData) {
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

export function DonorHelpReportSection({
  faqs,
  helpTopics,
}: {
  faqs: FaqItemData[];
  helpTopics: HelpTopic[];
}) {
  const [requests, setRequests] = useState<DonorSupportRequestSummary[]>([]);

  function addSubmittedRequest(request: DonorSupportRequestSummary) {
    setRequests((current) => [
      request,
      ...current.filter((item) => item.id !== request.id),
    ]);
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
      <DonorReportForm onSubmitted={addSubmittedRequest} />

      <div className="space-y-5">
        <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-orange)]">
              Reports
            </p>
            <h2 className="mt-1 text-xl font-black text-stone-950">
              Submitted reports
            </h2>
          </div>
          <DonorSupportRequestList
            externalRequests={requests}
            onRequestsLoaded={setRequests}
          />
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
  );
}
