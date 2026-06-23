import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  isAddress,
  publicActions,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const roleNFTAbi = [
  {
    type: "function",
    name: "hasRoleNFT",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "safeMintDonor",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "metadataCID", type: "string" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "safeMintShelter",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "metadataCID", type: "string" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
];

const shelterWallets = [
  "0x54c0f7bA1Cc5595d81cf14BBF6De5B068c195056",
  "0x40D05BB13dBeD048730734C1A6A7e6699287CA8E",
];

const donorWallets = [
  "0x58cA39b42f1dBe6838837f0A281aeE23f95530C2",
  "0x1FE2Ee638b8b12D8b4b0fb92b444557D40bC7611",
];

function parseEnv(contents) {
  const env = {};

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function getRequiredEnv(env, name) {
  const value = env[name] || process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function validateAddress(value, name) {
  if (!isAddress(value)) {
    throw new Error(`${name} is not a valid address: ${value}`);
  }

  return value;
}

async function seedWallet({ client, publicClient, contractAddress, wallet, role, metadataCID }) {
  const alreadyMinted = await publicClient.readContract({
    address: contractAddress,
    abi: roleNFTAbi,
    functionName: "hasRoleNFT",
    args: [wallet],
  });

  if (alreadyMinted) {
    console.log(`[skipped] ${role} RoleNFT already exists for ${wallet}`);
    return;
  }

  const hash = await client.writeContract({
    address: contractAddress,
    abi: roleNFTAbi,
    functionName: role === "donor" ? "safeMintDonor" : "safeMintShelter",
    args: [wallet, metadataCID],
  });

  await client.waitForTransactionReceipt({ hash });
  console.log(`[minted] ${role} RoleNFT for ${wallet}: ${hash}`);
}

async function main() {
  const envPath = resolve(process.cwd(), ".env.local");
  const env = parseEnv(await readFile(envPath, "utf8"));

  const contractAddress = validateAddress(
    getRequiredEnv(env, "NEXT_PUBLIC_ROLE_NFT_ADDRESS"),
    "NEXT_PUBLIC_ROLE_NFT_ADDRESS",
  );
  const rpcUrl = getRequiredEnv(env, "NEXT_PUBLIC_RPC_URL");
  const chainId = Number(getRequiredEnv(env, "NEXT_PUBLIC_CHAIN_ID"));
  const privateKey = getRequiredEnv(env, "ROLE_NFT_MINTER_PRIVATE_KEY");
  const donorMetadataCID = getRequiredEnv(env, "DONOR_METADATA_CID");
  const shelterMetadataCID = getRequiredEnv(env, "SHELTER_METADATA_CID");

  if (!Number.isInteger(chainId)) {
    throw new Error("NEXT_PUBLIC_CHAIN_ID must be a number.");
  }

  if (!privateKey.startsWith("0x")) {
    throw new Error("ROLE_NFT_MINTER_PRIVATE_KEY must start with 0x.");
  }

  for (const wallet of [...shelterWallets, ...donorWallets]) {
    validateAddress(wallet, "seed wallet");
  }

  const chain = defineChain({
    id: chainId,
    name: "PawChain Local",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  });
  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
  const client = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  }).extend(publicActions);

  console.log("Seeding demo RoleNFTs...");

  for (const wallet of shelterWallets) {
    await seedWallet({
      client,
      publicClient,
      contractAddress,
      wallet,
      role: "shelter",
      metadataCID: shelterMetadataCID,
    });
  }

  for (const wallet of donorWallets) {
    await seedWallet({
      client,
      publicClient,
      contractAddress,
      wallet,
      role: "donor",
      metadataCID: donorMetadataCID,
    });
  }

  console.log("Demo RoleNFT seed complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
