import {
  createPublicClient,
  http,
  isAddress,
  keccak256,
  parseEther,
  toBytes,
  type Address,
} from "viem";

export const demoEthMyrRate = Number(
  process.env.NEXT_PUBLIC_ETH_MYR_RATE ?? "7043.58",
);

export function getCampaignFactoryAddress() {
  const value = process.env.NEXT_PUBLIC_CAMPAIGN_FACTORY_ADDRESS?.trim();

  if (!value || !isAddress(value)) {
    throw new Error("NEXT_PUBLIC_CAMPAIGN_FACTORY_ADDRESS is not configured.");
  }

  return value as Address;
}

export function getPawChainId() {
  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "31337");

  if (!Number.isInteger(chainId)) {
    throw new Error("NEXT_PUBLIC_CHAIN_ID must be a number.");
  }

  return chainId;
}

export function getPawChainRpcUrl() {
  return process.env.NEXT_PUBLIC_RPC_URL?.trim() || "http://127.0.0.1:8545";
}

export function getPawChain() {
  const rpcUrl = getPawChainRpcUrl();

  return {
    id: getPawChainId(),
    name: `PawChain ${getPawChainId()}`,
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: [rpcUrl],
      },
    },
  } as const;
}

export function getPawChainPublicClient() {
  return createPublicClient({
    chain: getPawChain(),
    transport: http(getPawChainRpcUrl()),
  });
}

export function campaignKeyFromId(campaignId: string) {
  return keccak256(toBytes(campaignId));
}

export function myrToWei(amountMyr: number, rate = demoEthMyrRate) {
  if (!Number.isFinite(amountMyr) || amountMyr <= 0) {
    throw new Error("MYR amount must be greater than zero.");
  }

  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("ETH/MYR rate must be greater than zero.");
  }

  return parseEther((amountMyr / rate).toFixed(18));
}
