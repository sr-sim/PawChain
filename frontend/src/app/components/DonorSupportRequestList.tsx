"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type SupportRequest = {
  id: string;
  subject: string;
  status: string;
  request_type: string;
  created_at: string;
  updated_at: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function statusClass(status: string) {
  if (status === "resolved") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "rejected") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (status === "reviewing") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

export function DonorSupportRequestList() {
  const searchParams = useSearchParams();
  const walletAddress = searchParams.get("walletAddress") ?? "";
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadRequests() {
      setIsLoading(true);
      setErrorMessage("");

      if (!walletAddress) {
        setRequests([]);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/donor/support-requests?walletAddress=${encodeURIComponent(walletAddress)}`,
          { cache: "no-store" },
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message ?? "Unable to load reports.");
        }

        if (isMounted) {
          setRequests(Array.isArray(result.requests) ? result.requests : []);
        }
      } catch (error) {
        if (isMounted) {
          setRequests([]);
          setErrorMessage(
            error instanceof Error ? error.message : "Unable to load reports.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadRequests();

    return () => {
      isMounted = false;
    };
  }, [walletAddress]);

  if (!walletAddress) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-orange-200 bg-orange-50/30 p-5 text-center">
        <p className="text-sm font-semibold text-stone-600">
          Connect wallet to view your submitted reports.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50/30 p-5 text-center">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-orange-100 border-t-[var(--color-orange)]" />
        <p className="mt-3 text-sm font-semibold text-stone-600">
          Loading reports...
        </p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
        {errorMessage}
      </p>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-orange-200 bg-orange-50/30 p-5 text-center">
        <p className="text-sm font-black text-stone-950">
          No reports submitted yet
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-stone-600">
          Submitted help requests and campaign reports will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 divide-y divide-orange-100 overflow-hidden rounded-xl border border-orange-100">
      {requests.map((request) => (
        <article
          key={request.id}
          className="grid gap-2 bg-orange-50/20 px-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
        >
          <div>
            <p className="text-sm font-semibold text-stone-950">
              {request.subject}
            </p>
            <p className="mt-1 text-xs font-medium text-stone-500">
              {request.request_type.replaceAll("_", " ")} -{" "}
              {formatDate(request.updated_at ?? request.created_at)}
            </p>
          </div>
          <span
            className={[
              "inline-flex min-w-32 justify-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize",
              statusClass(request.status),
            ].join(" ")}
          >
            {request.status}
          </span>
          <Link
            href={`/Donor/reports/${request.id}?walletAddress=${encodeURIComponent(walletAddress)}`}
            className="text-xs font-semibold text-[var(--color-orange)] transition hover:text-stone-950 sm:col-span-2"
          >
            View report detail
          </Link>
        </article>
      ))}
    </div>
  );
}
