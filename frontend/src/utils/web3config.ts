import { cookieStorage, createStorage, http } from "@wagmi/core";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import {
  hardhat,
  mainnet,
  sepolia,
  type AppKitNetwork,
} from "@reown/appkit/networks";

const envProjectId = process.env.NEXT_PUBLIC_PROJECT_ID;
const envChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? hardhat.id);
const envRpcUrl = process.env.NEXT_PUBLIC_RPC_URL?.trim();

if (!envProjectId) {
  throw new Error("Project ID is not defined");
}

export const projectId: string = envProjectId;
export const defaultNetwork =
  envChainId === sepolia.id
    ? sepolia
    : envChainId === mainnet.id
      ? mainnet
      : hardhat;

export const networks: [AppKitNetwork, ...AppKitNetwork[]] =
  defaultNetwork.id === sepolia.id
    ? [sepolia, mainnet, hardhat]
    : defaultNetwork.id === mainnet.id
      ? [mainnet, sepolia, hardhat]
      : [hardhat, sepolia, mainnet];

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  projectId,
  networks,
  transports: {
    [mainnet.id]: http(defaultNetwork.id === mainnet.id ? envRpcUrl : undefined),
    [sepolia.id]: http(defaultNetwork.id === sepolia.id ? envRpcUrl : undefined),
    [hardhat.id]: http(
      defaultNetwork.id === hardhat.id
        ? envRpcUrl || "http://127.0.0.1:8545"
        : undefined,
    ),
  },
});

export const config = wagmiAdapter.wagmiConfig;
