import { createPublicClient, http, isAddress, type Address } from "viem";
import { roleNFTAbi } from "./role-nft-abi";

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function getRoleNFTConfig() {
  const address = getRequiredEnv("NEXT_PUBLIC_ROLE_NFT_ADDRESS");
  const rpcUrl = getRequiredEnv("NEXT_PUBLIC_RPC_URL");
  const chainId = Number(getRequiredEnv("NEXT_PUBLIC_CHAIN_ID"));

  if (!Number.isInteger(chainId)) {
    throw new Error("NEXT_PUBLIC_CHAIN_ID must be a number.");
  }

  if (!isAddress(address)) {
    throw new Error("NEXT_PUBLIC_ROLE_NFT_ADDRESS is not a valid address.");
  }

  return {
    address: address as Address,
    rpcUrl,
    chain: {
      id: chainId,
      name: `PawChain ${chainId}`,
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
    },
  } as const;
}

export async function isAdminWallet(walletAddress?: string | null) {
  if (!walletAddress || !isAddress(walletAddress)) {
    return false;
  }

  const config = getRoleNFTConfig();
  const publicClient = createPublicClient({
    chain: config.chain,
    transport: http(config.rpcUrl),
  });

  return publicClient.readContract({
    address: config.address,
    abi: roleNFTAbi,
    functionName: "isAdmin",
    args: [walletAddress as Address],
  });
}
