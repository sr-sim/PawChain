"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatEther } from "viem";
import { useAppKitAccount } from "@reown/appkit/react";
import { DashboardTopBar } from "@/app/components/DashboardTopBar";
import { AdminSidebar } from "@/app/Admin/components/AdminSidebar";
import { EthMyrMarketCard } from "@/app/components/EthMyrMarketCard";
import { TransactionLinks } from "@/app/components/TransactionLinks";
import type {
  FinancialTransaction,
  FinancialTransactionType,
} from "@/lib/financial-transactions";
import { useEthMyrRate } from "@/lib/use-eth-myr-rate";

type Summary = {
  donationMyr: number;
  refundMyr: number;
  fundReleaseMyr: number;
  donationWei: string;
  refundWei: string;
  fundReleaseWei: string;
  transactionCount: number;
};

type ApiResponse = {
  transactions: FinancialTransaction[];
  summary: Summary;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  latestCursor: string;
  message?: string;
};

const initialSummary: Summary = {
  donationMyr: 0,
  refundMyr: 0,
  fundReleaseMyr: 0,
  donationWei: "0",
  refundWei: "0",
  fundReleaseWei: "0",
  transactionCount: 0,
};

const typeLabels: Record<FinancialTransactionType, string> = {
  donation: "Donation",
  refund: "Refund",
  fund_release: "Fund release",
};

const typeStyles: Record<FinancialTransactionType, string> = {
  donation: "border-emerald-200 bg-emerald-50 text-emerald-700",
  refund: "border-sky-200 bg-sky-50 text-sky-700",
  fund_release: "border-orange-200 bg-orange-50 text-orange-700",
};

function money(value: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 2,
  }).format(value);
}

function eth(value: string) {
  return `${Number(formatEther(BigInt(value || "0"))).toLocaleString("en-MY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  })} ETH`;
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function shortWallet(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export default function AdminTransactionsPage() {
  const { address, isConnected } = useAppKitAccount();
  const {
    rate: ethMyrRate,
    weiToMyr,
    source: rateSource,
    updatedAt: rateUpdatedAt,
    loading: rateLoading,
    history: rateHistory,
  } = useEthMyrRate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [summary, setSummary] = useState(initialSummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [donationQueue, setDonationQueue] = useState<FinancialTransaction[]>([]);
  const [activeDonation, setActiveDonation] =
    useState<FinancialTransaction | null>(null);
  const cursorRef = useRef("");
  const initializedRef = useRef(false);
  const seenHashesRef = useRef(new Set<string>());

  const loadTransactions = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        walletAddress: address,
        page: String(page),
        pageSize: "25",
        type,
        status,
      });
      if (search.trim()) params.set("search", search.trim());
      if (dateFrom) params.set("dateFrom", new Date(dateFrom).toISOString());
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        params.set("dateTo", end.toISOString());
      }
      const response = await fetch(`/api/admin/transactions?${params}`);
      const result = (await response.json()) as ApiResponse;
      if (!response.ok) throw new Error(result.message || "Unable to load transactions.");
      setTransactions(result.transactions);
      setSummary(result.summary);
      setTotalPages(result.pagination.totalPages);
      setTotal(result.pagination.total);
      if (!initializedRef.current) {
        cursorRef.current = result.latestCursor;
        for (const item of result.transactions) {
          seenHashesRef.current.add(item.txHash.toLowerCase());
        }
        initializedRef.current = true;
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load transactions.");
    } finally {
      setLoading(false);
    }
  }, [address, page, type, status, search, dateFrom, dateTo]);

  const poll = useCallback(async () => {
    if (!address || !initializedRef.current || document.hidden) return;
    const params = new URLSearchParams({
      walletAddress: address,
      since: cursorRef.current,
      pageSize: "100",
    });
    try {
      const response = await fetch(`/api/admin/transactions?${params}`);
      const result = (await response.json()) as ApiResponse;
      if (!response.ok) return;
      cursorRef.current = result.latestCursor || cursorRef.current;
      const fresh = result.transactions.filter((item) => {
        const hash = item.txHash.toLowerCase();
        if (seenHashesRef.current.has(hash)) return false;
        seenHashesRef.current.add(hash);
        return true;
      });
      const donations = fresh
        .filter((item) => item.transactionType === "donation")
        .sort(
          (a, b) =>
            new Date(a.occurredAt).getTime() -
            new Date(b.occurredAt).getTime(),
        );
      if (donations.length) setDonationQueue((current) => [...current, ...donations]);
      if (fresh.length) void loadTransactions();
    } catch {
      // Keep the current page stable and retry on the next poll.
    }
  }, [address, loadTransactions]);

  useEffect(() => {
    if (address && isConnected) void loadTransactions();
    else {
      setTransactions([]);
      setLoading(false);
    }
  }, [address, isConnected, loadTransactions]);

  useEffect(() => {
    if (!address || !initializedRef.current) return;
    const interval = window.setInterval(() => void poll(), 3000);
    const onVisibility = () => {
      if (!document.hidden) void poll();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [address, poll]);

  useEffect(() => {
    if (activeDonation || donationQueue.length === 0) return;
    setActiveDonation(donationQueue[0]);
    setDonationQueue((current) => current.slice(1));
  }, [activeDonation, donationQueue]);

  useEffect(() => {
    if (!activeDonation) return;
    const timer = window.setTimeout(() => setActiveDonation(null), 4000);
    return () => window.clearTimeout(timer);
  }, [activeDonation]);

  useEffect(() => {
    setPage(1);
  }, [search, type, status, dateFrom, dateTo]);

  return (
    <>
      <DashboardTopBar
        role="Admin"
        onMenuClick={() => setSidebarOpen((value) => !value)}
        isMenuOpen={sidebarOpen}
      />
      <AdminSidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      <main className={`min-h-screen bg-[var(--color-cream)] pt-16 transition-[padding] ${sidebarOpen ? "lg:pl-64" : ""}`}>
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-7 sm:px-8">
          <header className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Financial ledger</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-950">Transactions</h1>
              <p className="mt-1 text-sm text-stone-500">Verified donations, refunds, and milestone fund releases on Sepolia.</p>
              <div className="mt-3 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-bold text-emerald-700 shadow-sm">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 motion-reduce:animate-none" />
                Live · updates every 3 seconds
              </div>
            </div>
            <div className="w-full shrink-0 md:w-[26rem] lg:w-[32rem]">
              <EthMyrMarketCard
                rate={ethMyrRate}
                source={rateSource}
                updatedAt={rateUpdatedAt}
                loading={rateLoading}
                history={rateHistory}
              />
            </div>
          </header>

          <section className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Blockchain transactions",
                value: String(summary.transactionCount),
                secondary: "Donation, refund, and fund-release records",
              },
              {
                label: "Donations received",
                value: eth(summary.donationWei),
                secondary: `≈ ${money(weiToMyr(summary.donationWei))}`,
              },
              {
                label: "Refunds returned to donors",
                value: eth(summary.refundWei),
                secondary: `≈ ${money(weiToMyr(summary.refundWei))}`,
              },
              {
                label: "Milestone funds released",
                value: eth(summary.fundReleaseWei),
                secondary: `≈ ${money(weiToMyr(summary.fundReleaseWei))}`,
              },
            ].map(({ label, value, secondary }, index) => (
              <div key={label} className="relative overflow-hidden rounded-2xl border border-orange-100 bg-white px-4 py-3.5 shadow-[0_10px_28px_rgba(97,55,17,0.06)]">
                <span
                  className={`absolute inset-y-0 left-0 w-1 ${
                    index === 0
                      ? "bg-stone-800"
                      : index === 1
                        ? "bg-[var(--color-orange)]"
                        : index === 2
                          ? "bg-[var(--color-gold)]"
                          : "bg-orange-300"
                  }`}
                />
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-stone-500">{label}</p>
                <p className="mt-1.5 text-xl font-black tracking-tight text-stone-950">{value}</p>
                <p className="mt-0.5 text-[11px] font-medium text-stone-400">{secondary}</p>
              </div>
            ))}
          </section>

          <section className="overflow-hidden rounded-[1.4rem] border border-orange-100 bg-white shadow-[0_14px_38px_rgba(97,55,17,0.07)]">
            <div className="border-b border-orange-100 bg-orange-50/35 p-4 sm:p-5">
              <div className="mb-3">
                <h2 className="text-base font-black text-stone-950">Financial transaction records</h2>
                <p className="mt-0.5 text-xs font-medium text-stone-500">Search and verify confirmed on-chain financial activity. MYR estimates use the {rateSource === "coingecko" ? "live CoinGecko" : "configured fallback"} rate.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(190px,0.75fr)_210px_155px_150px_150px]">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search hash, wallet, or campaign" className="rounded-xl border border-orange-100 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
              <select value={type} onChange={(event) => setType(event.target.value)} className="rounded-xl border border-orange-100 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-orange-400">
                <option value="all">All transaction types</option>
                <option value="donation">Donations</option>
                <option value="refund">Refunds</option>
                <option value="fund_release">Fund releases</option>
              </select>
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-orange-100 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-orange-400">
                <option value="all">All statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="rounded-xl border border-orange-100 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-orange-400" aria-label="From date" />
              <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="rounded-xl border border-orange-100 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-orange-400" aria-label="To date" />
              </div>
            </div>

            {error ? (
              <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
                <p className="text-sm font-bold">{error}</p>
              </div>
            ) : null}
            {sidebarOpen ? (
              <p className="hidden border-b border-orange-100 bg-orange-50/40 px-5 py-2 text-[11px] font-semibold text-stone-500 lg:block">
                Scroll horizontally to view all transaction fields and evidence →
              </p>
            ) : null}
            <div className="overflow-x-auto">
              <div className="hidden min-w-[1120px] grid-cols-[130px_minmax(190px,1.2fr)_minmax(190px,1fr)_150px_165px_minmax(180px,1fr)] gap-4 border-b border-orange-100 bg-[rgba(var(--color-cream-rgb),0.55)] px-5 py-3 text-[11px] font-black uppercase tracking-wider text-stone-500 lg:grid">
                <span>Type</span><span>Campaign</span><span>Wallet</span><span>Amount</span><span>Occurred</span><span>Evidence</span>
              </div>
              <div className="divide-y divide-orange-100 lg:min-w-[1120px]">
              {loading ? (
                <p className="p-10 text-center text-sm font-semibold text-stone-500">Loading verified transactions…</p>
              ) : transactions.length ? (
                transactions.map((item) => (
                  <article key={item.id} className="grid gap-3 px-5 py-4 transition hover:bg-orange-50/35 lg:grid-cols-[130px_minmax(190px,1.2fr)_minmax(190px,1fr)_150px_165px_minmax(180px,1fr)] lg:items-center lg:gap-4">
                    <span className={`w-fit rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${typeStyles[item.transactionType]}`}>{typeLabels[item.transactionType]}</span>
                    <div className="min-w-0"><p className="truncate text-sm font-semibold text-stone-900">{item.campaignTitle}</p>{item.milestoneTitle ? <p className="mt-0.5 truncate text-xs text-stone-500">{item.milestoneTitle}</p> : null}</div>
                    <span className="font-mono text-xs text-stone-600">{shortWallet(item.walletAddress)}</span>
                    <div>
                      <p className="text-sm font-bold text-stone-900">{eth(item.amountWei)}</p>
                      <p className="mt-0.5 text-[11px] font-medium text-stone-400">≈ {money(weiToMyr(item.amountWei))} <span className="whitespace-nowrap">(current rate)</span></p>
                      <p className={`mt-0.5 text-[10px] font-bold uppercase ${item.verifiedOnChain ? "text-emerald-600" : "text-stone-400"}`}>{item.verifiedOnChain ? "Verified on-chain" : item.status}</p>
                    </div>
                    <span className="text-xs font-medium text-stone-500">{dateTime(item.occurredAt)}</span>
                    <div>
                      <TransactionLinks transactions={[{ label: "View tx", hash: item.txHash }]} emptyMessage={false} />
                      {item.verifiedOnChain ? <p className="mt-1 text-[10px] font-medium text-stone-400">Block #{item.blockNumber.toLocaleString("en-US")} · Log {item.logIndex}</p> : null}
                    </div>
                  </article>
                ))
              ) : (
                <p className="p-12 text-center text-sm font-semibold text-stone-500">No financial transactions match these filters.</p>
              )}
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t border-orange-100 bg-orange-50/25 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-medium text-stone-500">{total} records</p>
              <div className="flex items-center gap-2">
                <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-orange-200 bg-white px-3 py-2 text-xs font-bold transition hover:bg-orange-50 disabled:opacity-40">Previous</button>
                <span className="text-xs font-semibold text-stone-600">Page {page} of {totalPages}</span>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-orange-200 bg-white px-3 py-2 text-xs font-bold transition hover:bg-orange-50 disabled:opacity-40">Next</button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {activeDonation ? (
        <aside className="animate-[admin-donation-in_350ms_ease-out] fixed bottom-6 right-6 z-[120] w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-emerald-200 bg-white p-4 shadow-2xl motion-reduce:animate-none" role="status" aria-live="polite">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-lg text-emerald-700">↓</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">New donation confirmed</p><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 motion-reduce:animate-none" /></div>
              <p className="mt-1 text-lg font-bold text-stone-950">{eth(activeDonation.amountWei)}</p>
              <p className="text-xs font-medium text-stone-400">≈ {money(weiToMyr(activeDonation.amountWei))} <span className="whitespace-nowrap">(current rate)</span></p>
              <p className="mt-1 truncate text-sm font-medium text-stone-600">{activeDonation.campaignTitle}</p>
              <p className="mt-1 font-mono text-xs text-stone-400">{shortWallet(activeDonation.walletAddress)}</p>
              <div className="mt-3"><TransactionLinks transactions={[{ label: "View donation tx", hash: activeDonation.txHash }]} emptyMessage={false} /></div>
            </div>
          </div>
        </aside>
      ) : null}
      <style jsx global>{`
        @keyframes admin-donation-in {
          from { opacity: 0; transform: translate3d(0, 18px, 0) scale(.98); }
          to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
        }
      `}</style>
    </>
  );
}
