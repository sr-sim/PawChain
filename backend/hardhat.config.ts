import { vars, type HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import "dotenv/config";

const sepoliaRpcUrl = vars.get(
  "SEPOLIA_RPC_URL",
  "https://ethereum-sepolia-rpc.publicnode.com",
);
const configuredPrivateKey =
  process.env.DEPLOYER_PRIVATE_KEY ||
  process.env.SEPOLIA_PRIVATE_KEY ||
  (vars.has("SEPOLIA_PRIVATE_KEY")
    ? vars.get("SEPOLIA_PRIVATE_KEY")
    : undefined);
const sepoliaPrivateKey = configuredPrivateKey
  ? configuredPrivateKey.startsWith("0x")
    ? configuredPrivateKey
    : `0x${configuredPrivateKey}`
  : undefined;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || sepoliaRpcUrl,
      chainId: 11155111,
      accounts: sepoliaPrivateKey ? [sepoliaPrivateKey] : [],
    },
  },
};

export default config;
