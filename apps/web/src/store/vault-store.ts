import { create } from "zustand";

export interface VaultInfo {
  id: string;
  name: string;
  symbol: string;
  apy: number;
  tvl: number;
  underlying: string;
  chain: string;
  chainId: number;
  color: string;
  icon: string;
}

const VAULT_META: Record<string, { color: string; icon: string; underlying: string }> = {
  yoUSD: { color: "#22c55e", icon: "$", underlying: "USDC" },
  yoETH: { color: "#3b82f6", icon: "\u039E", underlying: "WETH" },
  yoBTC: { color: "#f97316", icon: "\u20BF", underlying: "cbBTC" },
  yoEUR: { color: "#a855f7", icon: "\u20AC", underlying: "EURC" },
  yoGOLD: { color: "#eab308", icon: "Au", underlying: "XAUt" },
  yoUSDT: { color: "#10b981", icon: "$", underlying: "USDT" },
};

interface VaultStore {
  vaults: VaultInfo[];
  isLoading: boolean;
  error: string | null;
  fetchVaults: () => Promise<void>;
}

export const useVaultStore = create<VaultStore>((set) => ({
  vaults: [],
  isLoading: false,
  error: null,
  fetchVaults: async () => {
    set({ isLoading: true, error: null });
    try {
      // Fetch from our backend which calls YO SDK
      const apiBase = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiBase}/api/vaults`);
      if (!res.ok) throw new Error("Failed to fetch vaults");
      const data = await res.json();

      // API returns an array of vault objects
      const vaultArray = Array.isArray(data) ? data : Object.values(data);
      const vaults: VaultInfo[] = vaultArray.map((info: any) => {
        const id = info.id || info.name;
        const chainName = typeof info.chain === "object" ? info.chain.name : info.chain;
        const chainId = typeof info.chain === "object" ? info.chain.id : (info.chainId || 8453);
        const apy = info.yield
          ? parseFloat(info.yield["7d"] || info.yield["1d"] || "0")
          : parseFloat(info.apy || "0");
        const tvlRaw = typeof info.tvl === "object"
          ? parseFloat(info.tvl.formatted || info.tvl.raw || "0")
          : parseFloat(info.tvl || "0");
        const underlying = info.asset?.symbol || VAULT_META[id]?.underlying || "Unknown";

        return {
          id,
          name: info.name || id,
          symbol: info.shareAsset?.symbol || info.symbol || id,
          apy,
          tvl: tvlRaw,
          underlying,
          chain: chainName || (chainId === 8453 ? "Base" : "Ethereum"),
          chainId,
          color: VAULT_META[id]?.color || "#6b7280",
          icon: VAULT_META[id]?.icon || "?",
        };
      });

      set({ vaults, isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },
}));
