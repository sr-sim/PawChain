export function getExplorerBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "31337");

  if (chainId === 11155111) {
    return "https://sepolia.etherscan.io";
  }

  if (chainId === 1) {
    return "https://etherscan.io";
  }

  return "";
}

export function getExplorerNetworkName() {
  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "31337");

  if (chainId === 11155111) {
    return "Sepolia";
  }

  if (chainId === 1) {
    return "Ethereum Mainnet";
  }

  return `PawChain ${chainId}`;
}

export function getTransactionExplorerUrl(txHash: string) {
  const baseUrl = getExplorerBaseUrl();

  if (!baseUrl || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return "";
  }

  return `${baseUrl}/tx/${txHash}`;
}

export function getAddressExplorerUrl(address: string) {
  const baseUrl = getExplorerBaseUrl();

  if (!baseUrl || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return "";
  }

  return `${baseUrl}/address/${address}`;
}

export function getNftExplorerUrl(address: string, tokenId?: string | null) {
  const baseUrl = getExplorerBaseUrl();
  const normalizedTokenId = tokenId?.trim();

  if (!baseUrl || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return "";
  }

  if (!normalizedTokenId || !/^\d+$/.test(normalizedTokenId)) {
    return `${baseUrl}/address/${address}`;
  }

  return `${baseUrl}/nft/${address}/${normalizedTokenId}`;
}

export function shortAddress(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
