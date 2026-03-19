import Anthropic from "@anthropic-ai/sdk";
import {
  createApiClient,
  getVaultSnapshot,
  getVaultYieldTimeseries,
  getVaultTvlTimeseries,
  getUserTransactionHistory,
  getVaults,
  VAULTS,
  CHAIN_ID_TO_NETWORK,
  type VaultId,
} from "@yo-protocol/core";
import type { Address } from "viem";

const apiClient = createApiClient();

// Helper to get network name from chain ID
function getNetwork(chainId: number): "ethereum" | "base" | "arbitrum" {
  return CHAIN_ID_TO_NETWORK[chainId as keyof typeof CHAIN_ID_TO_NETWORK];
}

export function getVaultTools(): Anthropic.Tool[] {
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
        // Use the getVaults function to get all vault stats in one call
        try {
          const allVaults = await getVaults(apiClient);
          return allVaults;
        } catch {
          // Fallback: fetch each vault individually
          const results: Record<string, unknown> = {};
          for (const [vaultId, config] of Object.entries(VAULTS)) {
            try {
              const network = getNetwork(config.chains[0]);
              const snapshot = await getVaultSnapshot(
                apiClient,
                network,
                config.address as Address
              );
              results[vaultId] = snapshot;
            } catch (e) {
              results[vaultId] = { error: `Failed to fetch: ${e}` };
            }
          }
          return results;
        }
      }

      case "get_vault_yield_history": {
        const vaultId = input.vault_id as VaultId;
        const config = VAULTS[vaultId];
        if (!config) return { error: "Unknown vault" };
        const network = getNetwork(config.chains[0]);
        const history = await getVaultYieldTimeseries(
          apiClient,
          network,
          config.address as Address
        );
        return { vault: vaultId, history: history.slice(-30) }; // last 30 data points
      }

      case "get_vault_tvl_history": {
        const vaultId = input.vault_id as VaultId;
        const config = VAULTS[vaultId];
        if (!config) return { error: "Unknown vault" };
        const network = getNetwork(config.chains[0]);
        const history = await getVaultTvlTimeseries(
          apiClient,
          network,
          config.address as Address
        );
        return { vault: vaultId, history: history.slice(-30) };
      }

      case "get_user_positions": {
        const userAddress = input.user_address as string;
        const positions: Record<string, unknown> = {};
        for (const [vaultId, config] of Object.entries(VAULTS)) {
          try {
            const network = getNetwork(config.chains[0]);
            const history = await getUserTransactionHistory(
              apiClient,
              network,
              config.address as Address,
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
