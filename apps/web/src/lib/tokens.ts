import type { Address } from "viem";

export interface TokenConfig {
  symbol: string;
  name: string;
  address: Address;
  decimals: number;
  chainId: number;
  chain: string;
}

// Tokens users can deposit FROM (source tokens)
export const SOURCE_TOKENS: TokenConfig[] = [
  { symbol: "USDC", name: "USD Coin", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6, chainId: 8453, chain: "Base" },
  { symbol: "WETH", name: "Wrapped Ether", address: "0x4200000000000000000000000000000000000006", decimals: 18, chainId: 8453, chain: "Base" },
  { symbol: "cbBTC", name: "Coinbase BTC", address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", decimals: 8, chainId: 8453, chain: "Base" },
  { symbol: "EURC", name: "Euro Coin", address: "0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42", decimals: 6, chainId: 8453, chain: "Base" },
  { symbol: "USDT", name: "Tether USD", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6, chainId: 1, chain: "Ethereum" },
];

// Vault contract addresses + chain info
export const VAULT_CONFIG: Record<string, { address: Address; chainId: number; explorer: string }> = {
  yoUSD: { address: "0x0000000f2eB9f69274678c76222B35eEc7588a65", chainId: 8453, explorer: "https://basescan.org" },
  yoETH: { address: "0x3A43AEC53490CB9Fa922847385D82fe25d0E9De7", chainId: 8453, explorer: "https://basescan.org" },
  yoBTC: { address: "0xbCbc8cb4D1e8ED048a6276a5E94A3e952660BcbC", chainId: 8453, explorer: "https://basescan.org" },
  yoEUR: { address: "0x50c749aE210D3977ADC824AE11F3c7fd10c871e9", chainId: 8453, explorer: "https://basescan.org" },
  yoGOLD: { address: "0x586675A3a46B008d8408933cf42d8ff6c9CC61a1", chainId: 1, explorer: "https://etherscan.io" },
  yoUSDT: { address: "0xb9a7da9e90D3B428083BAe04b860faA6325b721e", chainId: 1, explorer: "https://etherscan.io" },
};

// Alias for backward compat
export const VAULT_CHAIN = VAULT_CONFIG;
