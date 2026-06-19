import { cookieStorage, createStorage, http } from "@wagmi/core";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import {
  hardhat,
  mainnet,
  sepolia,
  type AppKitNetwork,
} from "@reown/appkit/networks";

const envProjectId = process.env.NEXT_PUBLIC_PROJECT_ID;

if (!envProjectId) {
  throw new Error("Project ID is not defined");
}

export const projectId: string = envProjectId;

export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [
  mainnet,
  sepolia,
  hardhat,
];

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  projectId,
  networks,
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [hardhat.id]: http(),
  },
});

export const config = wagmiAdapter.wagmiConfig;
