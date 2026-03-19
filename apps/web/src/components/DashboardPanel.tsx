import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAccount } from "wagmi";
import { useVaultStore } from "@/store/vault-store";
import { useChatStore } from "@/store/chat-store";
import { VaultCard } from "./VaultCard";
import { UserPositions } from "./UserPositions";
import { TrendingUp, Vault, BarChart3 } from "lucide-react";

export function DashboardPanel() {
  const { isConnected } = useAccount();
  const { vaults, isLoading, fetchVaults } = useVaultStore();
  const { currentPlan } = useChatStore();

  useEffect(() => {
    fetchVaults();
  }, [fetchVaults]);

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4 max-w-md">
          <div className="size-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Vault className="size-10 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold text-balance">Welcome to YoPilot</h2>
          <p className="text-muted-foreground text-pretty">
            Connect your wallet and chat with AI to discover the best DeFi savings strategy across YO Protocol vaults.
          </p>
          <div className="flex flex-wrap gap-2 justify-center pt-2">
            <Badge variant="secondary">yoUSD</Badge>
            <Badge variant="secondary">yoETH</Badge>
            <Badge variant="secondary">yoBTC</Badge>
            <Badge variant="secondary">yoEUR</Badge>
            <Badge variant="secondary">yoGOLD</Badge>
            <Badge variant="secondary">yoUSDT</Badge>
          </div>
        </div>
      </div>
    );
  }

  const avgApy = vaults.length > 0
    ? vaults.reduce((sum, v) => sum + v.apy, 0) / vaults.length
    : 0;
  const totalTvl = vaults.reduce((sum, v) => sum + v.tvl, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Total TVL
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {isLoading ? (
                <div className="h-8 w-24 rounded bg-muted animate-pulse" />
              ) : (
                totalTvl >= 1e6
                  ? `$${(totalTvl / 1e6).toFixed(1)}M`
                  : `$${(totalTvl / 1e3).toFixed(0)}K`
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Avg. APY
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-green-500">
              {isLoading ? (
                <div className="h-8 w-20 rounded bg-muted animate-pulse" />
              ) : (
                `${avgApy.toFixed(2)}%`
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Vault className="h-3.5 w-3.5" />
              Active Vaults
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{vaults.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* User Positions */}
      <UserPositions />

      {/* AI Recommendation */}
      {currentPlan && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <span>✨</span>
              AI Recommended Allocation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-4 rounded-full overflow-hidden mb-3">
              {currentPlan.allocations.map((a) => {
                const vault = vaults.find((v) => v.id === a.vault);
                return (
                  <div
                    key={a.vault}
                    className="transition-all"
                    style={{
                      width: `${a.percentage}%`,
                      backgroundColor: vault?.color || "#6b7280",
                    }}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3">
              {currentPlan.allocations.map((a) => {
                const vault = vaults.find((v) => v.id === a.vault);
                return (
                  <div key={a.vault} className="flex items-center gap-1.5 text-sm">
                    <div
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: vault?.color || "#6b7280" }}
                    />
                    <span className="font-medium">{a.vault}</span>
                    <span className="text-muted-foreground">{a.percentage}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vault Grid */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Available Vaults</h3>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[120px] rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {vaults.map((vault) => (
              <VaultCard
                key={vault.id}
                vault={vault}
                isActive={currentPlan?.allocations.some((a) => a.vault === vault.id)}
                allocation={currentPlan?.allocations.find((a) => a.vault === vault.id)?.percentage}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
