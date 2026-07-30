"use client";

import { useEffect, useState } from "react";
import { formatEther } from "viem";
import { demoEthMyrRate } from "@/lib/campaign-blockchain";

type RateSource = "coingecko" | "fallback";

type RateResponse = {
  rate?: number;
  source?: RateSource;
  updatedAt?: string;
  history?: { timestamp: number; rate: number }[];
};

export function useEthMyrRate(refreshIntervalMs = 0) {
  const [rate, setRate] = useState(demoEthMyrRate);
  const [source, setSource] = useState<RateSource>("fallback");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<
    { timestamp: number; rate: number }[]
  >([]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRate() {
      try {
        const response = await fetch("/api/currency/eth-myr", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Unable to load ETH/MYR rate.");

        const result = (await response.json()) as RateResponse;
        const nextRate = Number(result.rate);
        if (!Number.isFinite(nextRate) || nextRate <= 0) {
          throw new Error("Invalid ETH/MYR rate.");
        }

        setRate(nextRate);
        setSource(result.source === "coingecko" ? "coingecko" : "fallback");
        setUpdatedAt(result.updatedAt ?? null);
        setHistory(
          (result.history ?? []).filter(
            (point) =>
              Number.isFinite(point.timestamp) &&
              Number.isFinite(point.rate) &&
              point.rate > 0,
          ),
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setRate(demoEthMyrRate);
        setSource("fallback");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadRate();
    const interval = refreshIntervalMs > 0
      ? window.setInterval(loadRate, refreshIntervalMs)
      : undefined;

    return () => {
      controller.abort();
      if (interval) window.clearInterval(interval);
    };
  }, [refreshIntervalMs]);

  return {
    rate,
    source,
    updatedAt,
    loading,
    history,
    ethToMyr: (amountEth: number) => amountEth * rate,
    weiToMyr: (amountWei: string) =>
      Number(formatEther(BigInt(amountWei || "0"))) * rate,
  };
}
