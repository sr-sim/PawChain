"use client";

import { useEffect, useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useChainId, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { formatEther, isAddress, type Address } from "viem";
import { campaignContractAbi } from "@/lib/campaign-contract-abi";
import { demoEthMyrRate, getPawChainId } from "@/lib/campaign-blockchain";

function formatMyr(value: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function RefundClaimButton({
  campaignId,
  contractAddress,
}: {
  campaignId: string;
  contractAddress: string | null;
}) {
  const { address } = useAppKitAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [ethMyrRate, setEthMyrRate] = useState(demoEthMyrRate);
  const validContract =
    contractAddress && isAddress(contractAddress) ? contractAddress : undefined;
  const { data: refundable, refetch } = useReadContract({
    address: validContract,
    abi: campaignContractAbi,
    functionName: "getRefundableAmount",
    args: address && isAddress(address) ? [address as Address] : undefined,
    query: { enabled: Boolean(validContract && address) },
  });

  useEffect(() => {
    let isMounted = true;

    async function loadEthMyrRate() {
      try {
        const response = await fetch("/api/currency/eth-myr", {
          cache: "no-store",
        });
        const result = await response.json();
        const rate = Number(result.rate);

        if (isMounted && response.ok && Number.isFinite(rate) && rate > 0) {
          setEthMyrRate(rate);
        }
      } catch {
        // Keep the fallback estimate when the live API is unavailable.
      }
    }

    loadEthMyrRate();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!refundable || refundable <= BigInt(0)) {
    return null;
  }

  const refundableEth = Number(formatEther(refundable));
  const refundableMyr = refundableEth * ethMyrRate;

  async function claimRefund() {
    if (!address || !validContract || !publicClient) return;
    setBusy(true);
    setMessage("");
    try {
      if (chainId !== getPawChainId()) {
        throw new Error(`Switch your wallet to PawChain ${getPawChainId()}.`);
      }
      const txHash = await writeContractAsync({
        address: validContract,
        abi: campaignContractAbi,
        functionName: "claimRefund",
      });
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });
      if (receipt.status !== "success") {
        throw new Error("Refund transaction failed.");
      }
      const response = await fetch("/api/donor/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, campaignId, txHash }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message ?? "Unable to record refund.");
      }
      setMessage("Refund claimed.");
      await refetch();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Refund failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => void claimRefund()}
        className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50"
      >
        {busy
          ? "Claiming..."
          : `Claim ${refundableEth.toFixed(6)} ETH refund`}
      </button>
      <p className="mt-1 text-xs font-semibold text-stone-500">
        Approx. {formatMyr(refundableMyr)}
      </p>
      {message ? <p className="mt-1 text-xs font-semibold">{message}</p> : null}
    </div>
  );
}
