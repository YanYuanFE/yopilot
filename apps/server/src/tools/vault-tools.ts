import {
  createApiClient,
  getVaults,
  getVaultYieldTimeseries,
  getVaultTvlTimeseries,
  getUserTransactionHistory,
} from "@yo-protocol/core";
import type { Address } from "viem";

const apiClient = createApiClient();

// Vault ID -> network mapping
const VAULT_NETWORK: Record<string, "ethereum" | "base"> = {
  yoETH: "base",
  yoBTC: "base",
  yoUSD: "base",
  yoEUR: "base",
  yoGOLD: "ethereum",
  yoUSDT: "ethereum",
};

const VAULT_ADDRESSES: Record<string, Address> = {
  yoETH: "0x3A43AEC53490CB9Fa922847385D82fe25d0E9De7",
  yoBTC: "0xbCbc8cb4D1e8ED048a6276a5E94A3e952660BcbC",
  yoUSD: "0x0000000f2eB9f69274678c76222B35eEc7588a65",
  yoEUR: "0x50c749aE210D3977ADC824AE11F3c7fd10c871e9",
  yoGOLD: "0x586675A3a46B008d8408933cf42d8ff6c9CC61a1",
  yoUSDT: "0xb9a7da9e90D3B428083BAe04b860faA6325b721e",
};

type ToolDef = {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
};

export function getVaultTools(): ToolDef[] {
  return [
    {
      name: "get_all_vault_snapshots",
      description:
        "Get current snapshot data for all YO Protocol vaults including APY, TVL, name, symbol, and underlying asset. Always call this first to get real-time data.",
      input_schema: {
        type: "object" as const,
        properties: {},
        required: [],
      },
    },
    {
      name: "get_vault_yield_history",
      description:
        "Get historical APY time series for a specific vault. Useful for analyzing yield stability and trends.",
      input_schema: {
        type: "object" as const,
        properties: {
          vault_id: {
            type: "string",
            enum: ["yoETH", "yoBTC", "yoUSD", "yoEUR", "yoGOLD", "yoUSDT"],
            description: "The vault identifier",
          },
        },
        required: ["vault_id"],
      },
    },
    {
      name: "get_vault_tvl_history",
      description:
        "Get historical TVL (Total Value Locked) time series for a specific vault.",
      input_schema: {
        type: "object" as const,
        properties: {
          vault_id: {
            type: "string",
            enum: ["yoETH", "yoBTC", "yoUSD", "yoEUR", "yoGOLD", "yoUSDT"],
            description: "The vault identifier",
          },
        },
        required: ["vault_id"],
      },
    },
    {
      name: "get_user_positions",
      description:
        "Get user's current positions across all vaults, including share balance and asset value.",
      input_schema: {
        type: "object" as const,
        properties: {
          user_address: {
            type: "string",
            description: "User's wallet address (0x...)",
          },
        },
        required: ["user_address"],
      },
    },
  ];
}

export async function handleToolCall(
  name: string,
  input: Record<string, unknown>
): Promise<unknown> {
  try {
    switch (name) {
      case "get_all_vault_snapshots": {
        const allVaults = await getVaults(apiClient);
        return allVaults;
      }

      case "get_vault_yield_history": {
        const vaultId = input.vault_id as string;
        const network = VAULT_NETWORK[vaultId];
        const address = VAULT_ADDRESSES[vaultId];
        if (!network || !address) return { error: "Unknown vault" };
        const history = await getVaultYieldTimeseries(apiClient, network, address);
        return { vault: vaultId, history: history.slice(-30) };
      }

      case "get_vault_tvl_history": {
        const vaultId = input.vault_id as string;
        const network = VAULT_NETWORK[vaultId];
        const address = VAULT_ADDRESSES[vaultId];
        if (!network || !address) return { error: "Unknown vault" };
        const history = await getVaultTvlTimeseries(apiClient, network, address);
        return { vault: vaultId, history: history.slice(-30) };
      }

      case "get_user_positions": {
        const userAddress = input.user_address as string;
        const positions: Record<string, unknown> = {};
        for (const [vaultId, address] of Object.entries(VAULT_ADDRESSES)) {
          try {
            const network = VAULT_NETWORK[vaultId];
            if (!network) continue;
            const history = await getUserTransactionHistory(
              apiClient,
              network,
              address,
              userAddress as Address,
              5
            );
            positions[vaultId] = { history };
          } catch {
            positions[vaultId] = { shares: "0", assets: "0" };
          }
        }
        return positions;
      }

      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (error) {
    return { error: `Tool execution failed: ${error}` };
  }
}
