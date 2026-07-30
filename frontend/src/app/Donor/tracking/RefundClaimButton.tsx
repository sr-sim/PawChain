"use client";

import { useEffect, useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useChainId, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { decodeEventLog, formatEther, isAddress, type Address } from "viem";
import { BlockchainSuccessPopup } from "@/app/components/BlockchainSuccessPopup";
import { campaignContractAbi } from "@/lib/campaign-contract-abi";
import { demoEthMyrRate, getPawChainId } from "@/lib/campaign-blockchain";
import {
  getAddressExplorerUrl,
  getExplorerNetworkName,
  getTransactionExplorerUrl,
  shortAddress,
} from "@/lib/block-explorer";

function formatLiveMyr(value: number) {
  return `Approx. live MYR ${value.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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
  const [messageType, setMessageType] = useState<"success" | "error" | "info">(
    "info",
  );
  const [claimedTxHash, setClaimedTxHash] = useState("");
  const [confirmedRefundEth, setConfirmedRefundEth] = useState<number | null>(
    null,
  );
  const [gasFeeEth, setGasFeeEth] = useState<number | null>(null);
  const [ethMyrRate, setEthMyrRate] = useState(demoEthMyrRate);
  const [blockchainPopup, setBlockchainPopup] = useState<{
    status: "pending" | "confirmed" | "failed";
    title: string;
    message: string;
    txHash: string;
  } | null>(null);
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
  const claimTxUrl = claimedTxHash ? getTransactionExplorerUrl(claimedTxHash) : "";
  const confirmedRefundMyr =
    confirmedRefundEth !== null ? confirmedRefundEth * ethMyrRate : null;
  const netReceivedEth =
    confirmedRefundEth !== null && gasFeeEth !== null
      ? Math.max(0, confirmedRefundEth - gasFeeEth)
      : null;
  const netReceivedMyr =
    netReceivedEth !== null ? netReceivedEth * ethMyrRate : null;

  async function claimRefund() {
    if (!address || !validContract || !publicClient) return;
    setBusy(true);
    setMessage("");
    setMessageType("info");
    try {
      if (chainId !== getPawChainId()) {
        throw new Error(`Switch your wallet to PawChain ${getPawChainId()}.`);
      }
      const txHash = await writeContractAsync({
        address: validContract,
        abi: campaignContractAbi,
        functionName: "claimRefund",
      });
      setClaimedTxHash(txHash);
      setBlockchainPopup({
        status: "pending",
        title: "Refund claim submitted",
        message:
          "Your wallet approved the claim. PawChain is waiting for the campaign contract to confirm the refund.",
        txHash,
      });
      setMessage("Refund transaction submitted. Waiting for confirmation...");
      setMessageType("info");
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });
      if (receipt.status !== "success") {
        throw new Error("Refund transaction failed.");
      }
      const refundLog = receipt.logs
        .map((log) => {
          try {
            if (log.address.toLowerCase() !== validContract.toLowerCase()) {
              return null;
            }

            return decodeEventLog({
              abi: campaignContractAbi,
              data: log.data,
              topics: log.topics,
            });
          } catch {
            return null;
          }
        })
        .find(
          (log) =>
            log?.eventName === "RefundClaimed" &&
            log.args.donor.toLowerCase() === address.toLowerCase(),
        );
      const refundedAmount =
        refundLog?.eventName === "RefundClaimed"
          ? Number(formatEther(refundLog.args.amount))
          : refundableEth;
      const gasPaid = Number(
        formatEther(receipt.gasUsed * receipt.effectiveGasPrice),
      );

      setConfirmedRefundEth(refundedAmount);
      setGasFeeEth(gasPaid);
      const response = await fetch("/api/donor/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, campaignId, txHash }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message ?? "Unable to record refund.");
      }
      setMessage("Refund confirmed.");
      setMessageType("success");
      setBlockchainPopup({
        status: "confirmed",
        title: "Refund received",
        message:
          "The campaign contract sent your refund as an internal transfer. The proof is available on Etherscan.",
        txHash,
      });
      await refetch();
    } catch (error) {
      const rawMessage =
        error instanceof Error ? error.message : "Refund failed.";
      const friendlyMessage =
        rawMessage.toLowerCase().includes("user rejected") ||
        rawMessage.toLowerCase().includes("user denied")
          ? "Refund was cancelled in MetaMask. No ETH was moved."
          : rawMessage.includes(`PawChain ${getPawChainId()}`)
            ? rawMessage
            : "Refund could not be completed. Please check your wallet and try again.";

      setMessage(friendlyMessage);
      setMessageType("error");
      setBlockchainPopup({
        status: "failed",
        title: "Refund not completed",
        message: friendlyMessage,
        txHash: claimedTxHash,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-orange-100 bg-gradient-to-br from-white via-orange-50/45 to-white p-3 shadow-sm">
      <BlockchainSuccessPopup
        open={Boolean(blockchainPopup)}
        status={blockchainPopup?.status ?? "confirmed"}
        title={blockchainPopup?.title ?? ""}
        message={blockchainPopup?.message ?? ""}
        txHash={blockchainPopup?.txHash ?? ""}
        actionLabel="View refund proof"
        onClose={() => setBlockchainPopup(null)}
      />
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-orange-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-orange)]">
              Refund available
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">
              {address ? "Ready" : "Wallet needed"}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="text-base font-black text-stone-950">
              {refundableEth.toLocaleString("en-MY", {
                minimumFractionDigits: 4,
                maximumFractionDigits: 6,
              })}{" "}
              ETH
            </p>
            <p className="text-xs font-semibold text-stone-500">
              {formatLiveMyr(refundableMyr)}
            </p>
          </div>
          <p className="mt-2 max-w-xl text-[11px] font-semibold leading-relaxed text-stone-500">
            MetaMask may show 0 ETH for the claim call. The refund is sent by
            the campaign contract as an internal transfer and verified on
            Etherscan.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold text-stone-500">
            <span>{getExplorerNetworkName()}</span>
            {validContract ? (
              <>
                <span className="text-orange-200">/</span>
                <a
                  href={getAddressExplorerUrl(validContract)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--color-orange)] transition hover:text-stone-950"
                >
                  {shortAddress(validContract)}
                </a>
              </>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => void claimRefund()}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[var(--color-orange)] px-4 py-2 text-xs font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-orange-600 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-55"
        >
          {busy ? "Confirming..." : "Claim refund"}
        </button>
      </div>
      {confirmedRefundEth !== null ? (
        <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
                Refund received
              </p>
              <p className="mt-1 text-lg font-black text-stone-950">
                +{confirmedRefundEth.toLocaleString("en-MY", {
                  minimumFractionDigits: 4,
                  maximumFractionDigits: 6,
                })}{" "}
                ETH
              </p>
              {confirmedRefundMyr !== null ? (
                <p className="mt-0.5 text-xs font-semibold text-stone-500">
                  {formatLiveMyr(confirmedRefundMyr)}
                </p>
              ) : null}
            </div>
            {claimTxUrl ? (
              <a
                href={claimTxUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-black text-emerald-700 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50"
              >
                Etherscan proof
              </a>
            ) : null}
          </div>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
            <div className="rounded-xl bg-white/75 p-3">
              <p className="font-black uppercase tracking-[0.12em] text-stone-400">
                Contract transfer
              </p>
              <p className="mt-1 font-semibold text-stone-600">
                Internal refund from campaign contract
              </p>
            </div>
            <div className="rounded-xl bg-white/75 p-3">
              <p className="font-black uppercase tracking-[0.12em] text-stone-400">
                Gas paid
              </p>
              <p className="mt-1 text-sm font-black text-stone-950">
                {gasFeeEth !== null
                  ? `${gasFeeEth.toLocaleString("en-MY", {
                      minimumFractionDigits: 6,
                      maximumFractionDigits: 8,
                    })} ETH`
                  : "-"}
              </p>
            </div>
            <div className="rounded-xl bg-white/75 p-3">
              <p className="font-black uppercase tracking-[0.12em] text-stone-400">
                Net estimate
              </p>
              <p className="mt-1 text-sm font-black text-stone-950">
                {netReceivedEth !== null
                  ? `${netReceivedEth.toLocaleString("en-MY", {
                      minimumFractionDigits: 4,
                      maximumFractionDigits: 6,
                    })} ETH`
                  : "-"}
              </p>
              {netReceivedMyr !== null ? (
                <p className="mt-0.5 font-semibold text-stone-500">
                  {formatLiveMyr(netReceivedMyr)}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      {message ? (
        <div
          className={[
            "mt-3 rounded-xl border px-3 py-2 text-xs font-semibold",
            messageType === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : messageType === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-orange-200 bg-orange-50 text-[var(--color-orange)]",
          ].join(" ")}
        >
          <p>{message}</p>
          {claimTxUrl ? (
            <a
              href={claimTxUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex font-black underline-offset-4 hover:underline"
            >
              View internal refund proof on Etherscan
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
