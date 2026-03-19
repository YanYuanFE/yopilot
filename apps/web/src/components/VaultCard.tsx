import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { VaultInfo } from "@/store/vault-store";

interface VaultCardProps {
  vault: VaultInfo;
  isActive?: boolean;
  allocation?: number;
}

export function VaultCard({ vault, isActive, allocation }: VaultCardProps) {
  return (
    <Card className={cn("transition-colors", isActive ? "ring-2 ring-primary" : "hover:border-primary/50")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="size-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: vault.color }}
            >
              {vault.icon}
            </div>
            <div>
              <div className="font-semibold">{vault.id}</div>
              <div className="text-xs text-muted-foreground truncate">
                {vault.underlying} · {vault.chain}
              </div>
            </div>
          </div>
          {allocation !== undefined && (
            <Badge variant="default" className="text-xs">
              {allocation}%
            </Badge>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">APY</div>
            <div className="text-lg font-bold tabular-nums text-green-500">
              {vault.apy > 0 ? `${vault.apy.toFixed(2)}%` : "--"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">TVL</div>
            <div className="text-sm font-medium tabular-nums">
              {vault.tvl > 0
                ? vault.tvl >= 1e6
                  ? `$${(vault.tvl / 1e6).toFixed(2)}M`
                  : vault.tvl >= 1e3
                  ? `$${(vault.tvl / 1e3).toFixed(1)}K`
                  : `$${vault.tvl.toFixed(0)}`
                : "--"}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
