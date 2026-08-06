"use client";

import { useId } from "react";
import type { EthMyrHistoryPoint } from "@/app/components/EthMyrMarketCard";
import { useEthMyrRate } from "@/lib/use-eth-myr-rate";

function formatMYR(value: number, fractionDigits = 2) {
  return `live MYR ${new Intl.NumberFormat("en-MY", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)}`;
}

function formatAxis(value: number) {
  return new Intl.NumberFormat("en-MY", { maximumFractionDigits: 0 }).format(value);
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(timestamp));
}

function MarketChart({ history }: { history: EthMyrHistoryPoint[] }) {
  const gradientId = useId().replaceAll(":", "");

  if (history.length < 2) {
    return (
      <div className="grid h-44 place-items-center rounded-2xl bg-stone-50 text-sm font-bold text-stone-400">
        Market history is currently unavailable
      </div>
    );
  }

  const width = 700;
  const height = 180;
  const plotWidth = 625;
  const topPadding = 10;
  const bottomPadding = 24;
  const rates = history.map((point) => point.rate);
  const minimumRate = Math.min(...rates);
  const maximumRate = Math.max(...rates);
  const padding = Math.max((maximumRate - minimumRate) * 0.16, maximumRate * 0.006);
  const axisMinimum = minimumRate - padding;
  const axisMaximum = maximumRate + padding;
  const spread = axisMaximum - axisMinimum || 1;
  const plotHeight = height - topPadding - bottomPadding;
  const coordinates = history.map((point, index) => ({
    x: (index / (history.length - 1)) * plotWidth,
    y: topPadding + (1 - (point.rate - axisMinimum) / spread) * plotHeight,
  }));
  const linePoints = coordinates.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPoints = `0,${height - bottomPadding} ${linePoints} ${plotWidth},${height - bottomPadding}`;
  const axisValues = [axisMaximum, (axisMaximum + axisMinimum) / 2, axisMinimum];
  const timeIndexes = [0, Math.floor((history.length - 1) / 3), Math.floor(((history.length - 1) * 2) / 3), history.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-full min-h-52 w-full overflow-visible"
      role="img"
      aria-label="ETH to MYR exchange-rate chart for the last 24 hours"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      {axisValues.map((value, index) => {
        const y = topPadding + (index / 2) * plotHeight;
        return (
          <g key={value}>
            <line x1="0" y1={y} x2={plotWidth} y2={y} stroke="#eee8df" strokeWidth="1" />
            <text x={plotWidth + 14} y={y + 4} fill="#78716c" fontSize="11" fontWeight="700">
              {formatAxis(value)}
            </text>
          </g>
        );
      })}
      <polygon points={areaPoints} fill={`url(#${gradientId})`} />
      <polyline
        points={linePoints}
        fill="none"
        stroke="#059669"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {timeIndexes.map((index, labelIndex) => {
        const point = coordinates[index];
        const anchor = labelIndex === 0 ? "start" : labelIndex === timeIndexes.length - 1 ? "end" : "middle";
        return (
          <text
            key={`${history[index].timestamp}-${labelIndex}`}
            x={point.x}
            y={height - 4}
            textAnchor={anchor}
            fill="#78716c"
            fontSize="10"
            fontWeight="700"
          >
            {labelIndex === timeIndexes.length - 1 ? "NOW" : formatTime(history[index].timestamp)}
          </text>
        );
      })}
    </svg>
  );
}

export function ShelterEthMyrMarketCard() {
  const { rate, source, updatedAt, loading, history } = useEthMyrRate(60_000);
  const rates = history.map((point) => point.rate);
  const startRate = rates[0] ?? rate;
  const latestRate = rates.at(-1) ?? rate;
  const change = startRate > 0 ? ((latestRate - startRate) / startRate) * 100 : 0;
  const minimum = rates.length ? Math.min(...rates) : rate;
  const maximum = rates.length ? Math.max(...rates) : rate;

  return (
    <section className="flex h-full min-w-0 flex-col overflow-hidden rounded-3xl border border-orange-100 bg-white p-5 shadow-[0_16px_45px_rgba(111,69,20,0.08)] sm:p-6" aria-label="Current ETH to MYR market rate">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-orange-50 ring-1 ring-orange-100">
              <img src="/images/ethereum-logo.svg" alt="Ethereum" className="h-5 w-5 object-contain" />
            </span>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-stone-500">ETH / MYR rate</p>
            <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-[var(--color-orange)]">
              Live market
            </span>
          </div>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-stone-950 sm:text-3xl">
            {loading ? "Loading live rate..." : `1 ETH ≈ ${formatMYR(rate)}`}
          </h2>
          <p className="mt-1 text-xs font-semibold text-stone-400">
            {source === "coingecko" ? "Live market estimate" : "Configured fallback estimate"}
            {updatedAt
              ? ` · Updated ${new Intl.DateTimeFormat("en-MY", {
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(updatedAt))}`
              : ""}
          </p>
        </div>
        <a
          href="https://www.coingecko.com/"
          target="_blank"
          rel="noreferrer"
          className="rounded-lg px-2 py-1 text-xs font-black text-emerald-700 transition hover:bg-emerald-50"
        >
          Powered by CoinGecko ↗
        </a>
      </div>

      <div className="mt-5 grid flex-1 gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(12rem,3fr)] lg:items-stretch">
        <div className="flex min-w-0 items-center border-t border-orange-100 pt-3">
          <MarketChart history={history} />
        </div>
        <aside className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <div className="flex flex-col justify-center rounded-2xl border border-orange-100 bg-orange-50/30 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-stone-400">24h change</p>
            <p className={`mt-2 w-fit rounded-full px-3 py-1.5 text-xl font-black ${change >= 0 ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200" : "bg-red-50 text-red-600 ring-1 ring-red-200"}`}>
              {change >= 0 ? "+" : ""}{change.toFixed(2)}%
            </p>
          </div>
          <div className="flex flex-col justify-center rounded-2xl border border-orange-100 bg-orange-50/30 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-stone-400">Today&apos;s range</p>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-3"><span className="font-bold text-stone-500">High</span><span className="font-black text-stone-950">{formatMYR(maximum)}</span></div>
              <div className="flex items-center justify-between gap-3"><span className="font-bold text-stone-500">Low</span><span className="font-black text-stone-950">{formatMYR(minimum)}</span></div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
