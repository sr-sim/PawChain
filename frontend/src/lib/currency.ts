import { demoEthMyrRate } from "@/lib/campaign-blockchain";

const COINGECKO_ETH_MYR_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=myr&include_last_updated_at=true";

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

export async function getLatestEthMyrRate(): Promise<EthMyrRateResult> {
  try {
    const response = await fetch(COINGECKO_ETH_MYR_URL, {
      headers: {
        accept: "application/json",
      },
      next: {
        revalidate: 60,
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
