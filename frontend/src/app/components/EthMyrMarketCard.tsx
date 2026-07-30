"use client";

export type EthMyrHistoryPoint = {
  timestamp: number;
  rate: number;
};

type EthMyrMarketCardProps = {
  rate: number;
  source: "coingecko" | "fallback";
  updatedAt: string | null;
  loading: boolean;
  history: EthMyrHistoryPoint[];
  className?: string;
};

function formatRate(value: number) {
  return `MYR ${new Intl.NumberFormat("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

function RateChart({ history }: { history: EthMyrHistoryPoint[] }) {
  if (history.length < 2) {
    return (
      <div className="grid h-14 place-items-center rounded-xl bg-stone-50 text-[10px] font-bold text-stone-400">
        Chart unavailable
      </div>
    );
  }

  const width = 220;
  const height = 56;
  const rates = history.map((point) => point.rate);
  const minimum = Math.min(...rates);
  const maximum = Math.max(...rates);
  const spread = maximum - minimum || 1;
  const points = history
    .map((point, index) => {
      const x = (index / (history.length - 1)) * width;
      const y = height - ((point.rate - minimum) / spread) * (height - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const change = ((rates.at(-1)! - rates[0]) / rates[0]) * 100;

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-14 w-full"
        role="img"
        aria-label={`ETH to MYR rate over the last 24 hours, ${change >= 0 ? "up" : "down"} ${Math.abs(change).toFixed(2)} percent`}
      >
        <polyline
          points={points}
          fill="none"
          stroke={change >= 0 ? "#059669" : "#dc2626"}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wide text-stone-400">
        <span>24h ago</span>
        <span className={change >= 0 ? "text-emerald-600" : "text-red-600"}>
          {change >= 0 ? "+" : ""}
          {change.toFixed(2)}%
        </span>
        <span>Now</span>
      </div>
    </div>
  );
}

export function EthMyrMarketCard({
  rate,
  source,
  updatedAt,
  loading,
  history,
  className = "",
}: EthMyrMarketCardProps) {
  return (
    <section
      className={`w-full rounded-2xl border border-orange-100 bg-white/80 p-4 shadow-sm backdrop-blur ${className}`}
      aria-label="Current ETH to MYR market rate"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-stone-400">
            Current ETH/MYR rate
          </p>
          <p className="mt-1 text-lg font-black text-stone-950">
            {loading ? "Loading rate…" : `1 ETH ≈ ${formatRate(rate)}`}
          </p>
          <p className="mt-1 text-[10px] font-bold text-stone-400">
            {source === "coingecko"
              ? "Live market estimate"
              : "Configured fallback estimate"}
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
          aria-label="Open CoinGecko"
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-black text-emerald-700 transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          CoinGecko ↗
        </a>
      </div>
      <div className="mt-3 border-t border-orange-100 pt-2">
        <RateChart history={history} />
      </div>
    </section>
  );
}
