import { demoEthMyrRate } from "@/lib/campaign-blockchain";

const COINGECKO_ETH_MYR_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=myr&include_last_updated_at=true";
const COINGECKO_ETH_MYR_CHART_URL =
  "https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=myr&days=1";

type CoinGeckoEthMyrResponse = {
  ethereum?: {
    myr?: number;
    last_updated_at?: number;
  };
};

export type EthMyrRateResult = {
  rate: number;
  source: "coingecko" | "fallback";
  updatedAt: string;
  message?: string;
};

export type EthMyrHistoryPoint = {
  timestamp: number;
  rate: number;
};

export async function getEthMyrHistory(): Promise<EthMyrHistoryPoint[]> {
  try {
    const response = await fetch(COINGECKO_ETH_MYR_CHART_URL, {
      headers: { accept: "application/json" },
      next: { revalidate: 300 },
    });
    if (!response.ok) return [];

    const data = (await response.json()) as { prices?: [number, number][] };
    return (data.prices ?? [])
      .filter(
        ([timestamp, rate]) =>
          Number.isFinite(timestamp) && Number.isFinite(rate) && rate > 0,
      )
      .map(([timestamp, rate]) => ({ timestamp, rate }));
  } catch {
    return [];
  }
}

export async function getLatestEthMyrRate(): Promise<EthMyrRateResult> {
  try {
    const response = await fetch(COINGECKO_ETH_MYR_URL, {
      headers: {
        accept: "application/json",
      },
      next: {
        revalidate: 30,
      },
    });

    if (!response.ok) {
      throw new Error(`CoinGecko returned ${response.status}.`);
    }

    const data = (await response.json()) as CoinGeckoEthMyrResponse;
    const rate = Number(data.ethereum?.myr);

    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error("CoinGecko returned an invalid ETH/MYR rate.");
    }

    return {
      rate,
      source: "coingecko",
      updatedAt: data.ethereum?.last_updated_at
        ? new Date(data.ethereum.last_updated_at * 1000).toISOString()
        : new Date().toISOString(),
    };
  } catch (error) {
    return {
      rate: demoEthMyrRate,
      source: "fallback",
      updatedAt: new Date().toISOString(),
      message:
        error instanceof Error
          ? error.message
          : "Unable to load live ETH/MYR rate.",
    };
  }
}
