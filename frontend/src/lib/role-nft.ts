import {
  createPublicClient,
  createWalletClient,
  http,
  isAddress,
  publicActions,
  formatEther,
  type Address,
  type PublicClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { roleNFTAbi } from "./role-nft-abi";

export type ContractRole = "Donor" | "Shelter";
export type DbRole = "donor" | "shelter";
export type DonorBadgeLevel = "normal" | "bronze" | "silver" | "gold" | "hero";
export type RoleNFTMetadata = {
  name?: string;
  description?: string;
  image?: string;
  attributes?: unknown[];
  [key: string]: unknown;
};
export type RoleNFTDisplay = {
  tokenId: string;
  tokenURI: string;
  donorLevel: DonorBadgeLevel | null;
  metadata: RoleNFTMetadata | null;
  imageUrl: string | null;
  metadataError: string | null;
  donorTotalContributedWei?: string | null;
  donorTotalContributedEth?: number;
};

const ipfsGateway = "https://ipfs.io/ipfs/";
const ipfsGateways = [
  "https://ipfs.io/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
];

const donorLevelIds: Record<DonorBadgeLevel, number> = {
  normal: 1,
  bronze: 2,
  silver: 3,
  gold: 4,
  hero: 5,
};
const donorLevelsById: Record<number, DonorBadgeLevel | null> = {
  0: null,
  1: "normal",
  2: "bronze",
  3: "silver",
  4: "gold",
  5: "hero",
};

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

export function getRoleNFTConfig() {
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

function normalizeWallet(walletAddress: string): Address {
  if (!isAddress(walletAddress)) {
    throw new Error("Invalid wallet address.");
  }

  return walletAddress as Address;
}

function toDbRole(role: string): DbRole | null {
  if (role === "Donor") return "donor";
  if (role === "Shelter") return "shelter";
  return null;
}

function looksLikeCID(value: string) {
  return (
    /^Qm[1-9A-HJ-NP-Za-km-z]{44,}$/.test(value) ||
    /^ba[a-z0-9]{20,}$/i.test(value)
  );
}

function normalizeIpfsUrl(value?: string | null) {
  const rawValue = value?.trim();

  if (!rawValue) return null;

  if (rawValue.startsWith("ipfs://")) {
    return `${ipfsGateway}${rawValue.slice("ipfs://".length)}`;
  }

  if (/^https?:\/\//i.test(rawValue)) {
    return rawValue;
  }

  if (looksLikeCID(rawValue)) {
    return `${ipfsGateway}${rawValue}`;
  }

  return rawValue;
}

function getIpfsPath(value: string) {
  const rawValue = value.trim();

  if (rawValue.startsWith("ipfs://")) {
    return rawValue.slice("ipfs://".length);
  }

  for (const gateway of ipfsGateways) {
    if (rawValue.startsWith(gateway)) {
      return rawValue.slice(gateway.length);
    }
  }

  if (looksLikeCID(rawValue)) {
    return rawValue;
  }

  return null;
}

function getGatewayUrls(value: string) {
  const ipfsPath = getIpfsPath(value);

  if (!ipfsPath) {
    return [value];
  }

  return ipfsGateways.map((gateway) => `${gateway}${ipfsPath}`);
}

function isMetadata(value: unknown): value is RoleNFTMetadata {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getDonorMetadataCID(level: DonorBadgeLevel) {
  if (level === "normal") return getRequiredEnv("DONOR_METADATA_CID");
  if (level === "bronze") return getRequiredEnv("BRONZE_DONOR_METADATA_CID");
  if (level === "silver") return getRequiredEnv("SILVER_DONOR_METADATA_CID");
  if (level === "gold") return getRequiredEnv("GOLD_DONOR_METADATA_CID");
  return getRequiredEnv("HERO_DONOR_METADATA_CID");
}

async function fetchMetadataWithFallback(tokenURI: string) {
  const urls = getGatewayUrls(tokenURI);
  let lastError: Error | null = null;

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Metadata request failed with ${response.status}.`);
      }

      const contentType = response.headers.get("content-type") ?? "";

      if (!contentType.includes("application/json")) {
        return {
          metadata: null,
          metadataUrl: url,
          imageUrl: url,
        };
      }

      const metadata: unknown = await response.json();

      if (!isMetadata(metadata)) {
        throw new Error("NFT metadata is not a JSON object.");
      }

      return {
        metadata,
        metadataUrl: url,
        imageUrl:
          typeof metadata.image === "string"
            ? getGatewayUrls(metadata.image)[0]
            : null,
      };
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error("NFT metadata unavailable.");
    }
  }

  throw lastError ?? new Error("NFT metadata unavailable.");
}

async function getRoleNFTDisplay(
  publicClient: PublicClient,
  contractAddress: Address,
  wallet: Address,
  contractRole: ContractRole,
): Promise<RoleNFTDisplay> {
  const tokenId = await publicClient.readContract({
    address: contractAddress,
    abi: roleNFTAbi,
    functionName: "userTokenId",
    args: [wallet],
  });
  const tokenURI = await publicClient.readContract({
    address: contractAddress,
    abi: roleNFTAbi,
    functionName: "tokenURI",
    args: [tokenId],
  });
  const normalizedTokenURI = normalizeIpfsUrl(tokenURI) ?? tokenURI;
  const donorLevel =
    contractRole === "Donor"
      ? donorLevelsById[
          Number(
            await publicClient.readContract({
              address: contractAddress,
              abi: roleNFTAbi,
              functionName: "donorLevelOf",
              args: [tokenId],
            }),
          )
        ] ?? null
      : null;
  const donorTotalContributed =
    contractRole === "Donor"
      ? await publicClient
          .readContract({
            address: contractAddress,
            abi: roleNFTAbi,
            functionName: "donorTotalContributed",
            args: [wallet],
          })
          .catch(() => null)
      : null;

  try {
    const metadataResult = await fetchMetadataWithFallback(tokenURI);

    return {
      tokenId: tokenId.toString(),
      tokenURI: metadataResult.metadataUrl,
      donorLevel,
      metadata: metadataResult.metadata,
      imageUrl: metadataResult.imageUrl,
      metadataError: null,
      donorTotalContributedWei: donorTotalContributed?.toString() ?? null,
      donorTotalContributedEth:
        donorTotalContributed !== null
          ? Number(formatEther(donorTotalContributed))
          : undefined,
    };
  } catch (error) {
    return {
      tokenId: tokenId.toString(),
      tokenURI: normalizedTokenURI,
      donorLevel,
      metadata: null,
      imageUrl: null,
      metadataError:
        error instanceof Error
          ? error.message
          : "NFT metadata unavailable.",
      donorTotalContributedWei: donorTotalContributed?.toString() ?? null,
      donorTotalContributedEth:
        donorTotalContributed !== null
          ? Number(formatEther(donorTotalContributed))
          : undefined,
    };
  }
}

export async function getRoleNFTStatus(walletAddress: string) {
  const config = getRoleNFTConfig();
  const wallet = normalizeWallet(walletAddress);
  const publicClient = createPublicClient({
    chain: config.chain,
    transport: http(config.rpcUrl),
  });

  const hasNFT = await publicClient.readContract({
    address: config.address,
    abi: roleNFTAbi,
    functionName: "hasRoleNFT",
    args: [wallet],
  });

  if (!hasNFT) {
    return {
      hasNFT: false,
      contractRole: null,
      dbRole: null,
      roleNFT: null,
    };
  }

  const contractRole = await publicClient.readContract({
    address: config.address,
    abi: roleNFTAbi,
    functionName: "getUserRole",
    args: [wallet],
  });

  const dbRole = toDbRole(contractRole);

  if (!dbRole) {
    throw new Error(`Unsupported RoleNFT role: ${contractRole}`);
  }

  const typedContractRole = contractRole as ContractRole;
  const roleNFT = await getRoleNFTDisplay(
    publicClient,
    config.address,
    wallet,
    typedContractRole,
  );

  return {
    hasNFT: true,
    contractRole: typedContractRole,
    dbRole,
    roleNFT,
  };
}

export async function mintRoleNFT(walletAddress: string, role: DbRole) {
  const config = getRoleNFTConfig();
  const wallet = normalizeWallet(walletAddress);
  const privateKey = getRequiredEnv("ROLE_NFT_MINTER_PRIVATE_KEY");
  const metadataCID =
    role === "donor"
      ? getRequiredEnv("DONOR_METADATA_CID")
      : getRequiredEnv("SHELTER_METADATA_CID");

  if (!privateKey.startsWith("0x")) {
    throw new Error("ROLE_NFT_MINTER_PRIVATE_KEY must start with 0x.");
  }

  const account = privateKeyToAccount(privateKey as Address);
  const client = createWalletClient({
    account,
    chain: config.chain,
    transport: http(config.rpcUrl),
  }).extend(publicActions);

  const hash = await client.writeContract({
    address: config.address,
    abi: roleNFTAbi,
    functionName: role === "donor" ? "safeMintDonor" : "safeMintShelter",
    args: [wallet, metadataCID],
  });

  await client.waitForTransactionReceipt({ hash });

  return { txHash: hash };
}

export async function revokeRoleNFT(walletAddress: string) {
  const config = getRoleNFTConfig();
  const wallet = normalizeWallet(walletAddress);
  const privateKey = getRequiredEnv("ROLE_NFT_MINTER_PRIVATE_KEY");

  if (!privateKey.startsWith("0x")) {
    throw new Error("ROLE_NFT_MINTER_PRIVATE_KEY must start with 0x.");
  }

  const account = privateKeyToAccount(privateKey as Address);
  const client = createWalletClient({
    account,
    chain: config.chain,
    transport: http(config.rpcUrl),
  }).extend(publicActions);

  const hash = await client.writeContract({
    address: config.address,
    abi: roleNFTAbi,
    functionName: "revokeRoleNFT",
    args: [wallet],
  });

  await client.waitForTransactionReceipt({ hash });
  return { txHash: hash };
}

export async function upgradeDonorBadge(
  walletAddress: string,
  level: DonorBadgeLevel,
) {
  const config = getRoleNFTConfig();
  const wallet = normalizeWallet(walletAddress);
  const privateKey = getRequiredEnv("ROLE_NFT_MINTER_PRIVATE_KEY");
  const metadataCID = getDonorMetadataCID(level);

  if (!privateKey.startsWith("0x")) {
    throw new Error("ROLE_NFT_MINTER_PRIVATE_KEY must start with 0x.");
  }

  const account = privateKeyToAccount(privateKey as Address);
  const client = createWalletClient({
    account,
    chain: config.chain,
    transport: http(config.rpcUrl),
  }).extend(publicActions);

  const hash = await client.writeContract({
    address: config.address,
    abi: roleNFTAbi,
    functionName: "upgradeDonorLevel",
    args: [wallet, donorLevelIds[level], metadataCID],
  });

  await client.waitForTransactionReceipt({ hash });

  return { txHash: hash };
}
