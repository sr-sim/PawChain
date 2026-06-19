"use client";

import { createAppKit } from "@reown/appkit/react";
import { hardhat } from "@reown/appkit/networks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { type ReactNode } from "react";
import { cookieToInitialState, WagmiProvider, type Config } from "wagmi";
import { networks, projectId, wagmiAdapter } from "@/utils/web3config";

const queryClient = new QueryClient();

createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks,
  defaultNetwork: hardhat,
  enableCoinbase: false,
  features: {
    analytics: false,
  },
});

function Web3ContextProvider({
  children,
  cookies,
}: {
  children: ReactNode;
  cookies: string | null;
}) {
  const initialState = cookieToInitialState(
    wagmiAdapter.wagmiConfig as Config,
    cookies,
  );

  return (
    <WagmiProvider
      config={wagmiAdapter.wagmiConfig as Config}
      initialState={initialState}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

export default Web3ContextProvider;
