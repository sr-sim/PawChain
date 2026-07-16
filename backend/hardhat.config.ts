import { vars, type HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import "dotenv/config";

const sepoliaRpcUrl = vars.get(
  "SEPOLIA_RPC_URL",
  "https://ethereum-sepolia-rpc.publicnode.com",
);
const sepoliaPrivateKey = vars.has("SEPOLIA_PRIVATE_KEY")
  ? vars.get("SEPOLIA_PRIVATE_KEY")
  : undefined;

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      chainId: 11155111,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },
  },
  networks: {
    sepolia: {
      url: sepoliaRpcUrl,
      chainId: 11155111,
      accounts: sepoliaPrivateKey ? [sepoliaPrivateKey] : [],
    },
  },
};

export default config;