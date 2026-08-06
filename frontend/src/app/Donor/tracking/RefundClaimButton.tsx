"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppKitAccount } from "@reown/appkit/react";
import { useChainId, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { decodeEventLog, formatEther, isAddress, type Address } from "viem";
import { BlockchainSuccessPopup } from "@/app/components/BlockchainSuccessPopup";
import { campaignContractAbi } from "@/lib/campaign-contract-abi";
import { demoEthMyrRate, getPawChainId } from "@/lib/campaign-blockchain";
import {
  getTransactionExplorerUrl,
} from "@/lib/block-explorer";
import { isWalletRejection } from "@/lib/wallet-errors";

function formatLiveMyr(value: number) {
  return `Approx. live MYR ${value.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function RefundClaimButton({
  campaignId,
  contractAddress,
  donationAmountEth = 0,
  campaignDonationTotalEth = 0,
}: {
  campaignId: string;
  contractAddress: string | null;
  donationAmountEth?: number;
  campaignDonationTotalEth?: number;
}) {
  const router = useRouter();
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
  const [ethMyrRate, setEthMyrRate] = useState(demoEthMyrRate);
  const [blockchainPopup, setBlockchainPopup] = useState<{
    status: "pending" | "confirmed" | "failed";
    title: string;
    message: string;
    txHash: string;
    details?: { label: string; value: string }[];
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

  if ((!refundable || refundable <= BigInt(0)) && confirmedRefundEth === null) {
    return null;
  }

  const refundableEth = refundable ? Number(formatEther(refundable)) : 0;
  const refundableMyr = refundableEth * ethMyrRate;
  const claimTxUrl = claimedTxHash ? getTransactionExplorerUrl(claimedTxHash) : "";
  const confirmedRefundMyr =
    confirmedRefundEth !== null ? confirmedRefundEth * ethMyrRate : null;

  async function claimRefund() {
    if (!address || !validContract || !publicClient) return;
    setBusy(true);
    setMessage("");
    setMessageType("info");
    setBlockchainPopup({
      status: "pending",
      title: "Confirm refund claim in MetaMask",
      message:
        "Review the refund claim in MetaMask. PawChain will continue after you approve the transaction.",
      txHash: "",
    });
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
        details: [
          {
            label: "Refund amount",
            value: `${refundableEth.toLocaleString("en-MY", {
              maximumFractionDigits: 6,
            })} ETH`,
          },
          { label: "Estimated value", value: formatLiveMyr(refundableMyr) },
        ],
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
      const rowRefundAmount =
        campaignDonationTotalEth > 0 && donationAmountEth > 0
          ? refundedAmount * (donationAmountEth / campaignDonationTotalEth)
          : refundedAmount;

      setConfirmedRefundEth(rowRefundAmount);
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
        details: [
          {
            label: "Refund amount",
            value: `${refundedAmount.toLocaleString("en-MY", {
              maximumFractionDigits: 6,
            })} ETH`,
          },
          ...(rowRefundAmount !== refundedAmount
            ? [
                {
                  label: "This record",
                  value: `${rowRefundAmount.toLocaleString("en-MY", {
                    minimumFractionDigits: 4,
                    maximumFractionDigits: 6,
                  })} ETH`,
                },
              ]
            : []),
          {
            label: "Estimated value",
            value: formatLiveMyr(refundedAmount * ethMyrRate),
          },
          { label: "Transfer type", value: "Internal contract transfer" },
        ],
      });
      router.refresh();
      await refetch();
    } catch (error) {
      const rawMessage =
        error instanceof Error ? error.message : "Refund failed.";
      const friendlyMessage =
        isWalletRejection(error)
          ? "The refund transaction was cancelled in MetaMask. No funds were transferred."
          : rawMessage.includes(`PawChain ${getPawChainId()}`)
            ? rawMessage
            : "Refund could not be completed. Please check your wallet and try again.";

      setMessage(friendlyMessage);
      setMessageType("error");
      setBlockchainPopup({
        status: "failed",
        title: "Refund not completed",
        message: friendlyMessage,
        txHash: "",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-amber-100 bg-white/90 shadow-sm">
      <BlockchainSuccessPopup
        open={Boolean(blockchainPopup)}
        status={blockchainPopup?.status ?? "confirmed"}
        title={blockchainPopup?.title ?? ""}
        message={blockchainPopup?.message ?? ""}
        txHash={blockchainPopup?.txHash ?? ""}
        details={blockchainPopup?.details ?? []}
        actionLabel={
          blockchainPopup?.status === "confirmed"
            ? "View refund proof"
            : "View transaction"
        }
        onClose={() => setBlockchainPopup(null)}
        autoCloseMs={0}
      />
      {confirmedRefundEth === null ? (
        <div className="flex items-center justify-between gap-2 px-2.5 py-2">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--color-orange)]">
              Refund available
            </p>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <p className="text-sm font-black text-stone-950">
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
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => void claimRefund()}
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-[10px] font-black text-[var(--color-orange)] transition hover:-translate-y-0.5 hover:bg-white hover:text-orange-700 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-55"
          >
            {busy ? "Confirming" : "Claim"}
          </button>
        </div>
      ) : null}
      {confirmedRefundEth !== null ? (
        <details className="group border-t border-emerald-100 bg-emerald-50/70">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-2 [&::-webkit-details-marker]:hidden">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">
                Refund
              </p>
              <p className="mt-0.5 text-xs font-black text-stone-950">
                +{confirmedRefundEth.toLocaleString("en-MY", {
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
              <span
                className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[10px] font-black text-emerald-700 transition group-open:bg-emerald-50"
              >
                View proof
              </span>
            ) : null}
          </summary>
          <div className="border-t border-emerald-100 px-2.5 py-2">
            <div className="grid gap-2 text-[11px] font-semibold text-stone-500">
              <div className="flex items-center justify-between gap-3">
                <span>Transfer type</span>
                <span className="text-right text-stone-800">
                  Internal contract transfer
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Confirmed</span>
                <span className="text-right text-stone-800">
                  {new Intl.DateTimeFormat("en-MY", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }).format(new Date())}
                </span>
              </div>
              {claimTxUrl ? (
                <div className="flex items-center justify-between gap-3">
                  <span>Refund tx</span>
                  <a
                    href={claimTxUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-right font-black text-[var(--color-orange)] transition hover:text-stone-950"
                  >
                    {claimedTxHash.slice(0, 10)}...{claimedTxHash.slice(-8)}
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </details>
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
          {messageType === "success" && claimTxUrl ? (
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
