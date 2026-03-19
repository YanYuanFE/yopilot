import { useState } from "react";
import { useAccount } from "wagmi";
import { useUserPositions } from "@yo-protocol/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, ArrowDownToLine } from "lucide-react";
import { formatUnits } from "viem";
import { RedeemModal } from "./RedeemModal";

const VAULT_META: Record<string, { color: string; icon: string; underlying: string; decimals: number }> = {
  yoETH: { color: "#3b82f6", icon: "Ξ", underlying: "WETH", decimals: 18 },
  yoBTC: { color: "#f97316", icon: "₿", underlying: "cbBTC", decimals: 8 },
  yoUSD: { color: "#22c55e", icon: "$", underlying: "USDC", decimals: 6 },
  yoEUR: { color: "#a855f7", icon: "€", underlying: "EURC", decimals: 6 },
  yoGOLD: { color: "#eab308", icon: "Au", underlying: "XAUt", decimals: 6 },
  yoUSDT: { color: "#10b981", icon: "$", underlying: "USDT", decimals: 6 },
};

function formatValue(value: bigint, decimals: number): string {
  const num = parseFloat(formatUnits(value, decimals));
  if (num === 0) return "0";
  if (num < 0.01) return "<0.01";
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toFixed(4);
}

interface RedeemTarget {
  vaultId: string;
  shares: bigint;
  assets: bigint;
  decimals: number;
  underlying: string;
}

export function UserPositions() {
  const { address, isConnected } = useAccount();
  const { positions, isLoading } = useUserPositions(address, { enabled: isConnected });
  const [redeemTarget, setRedeemTarget] = useState<RedeemTarget | null>(null);

  const activePositions = (positions ?? []).filter(
    (p) => p.position.shares > 0n
  );

  if (!isConnected || isLoading) return null;
  if (activePositions.length === 0) return null;

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Wallet className="size-5" />
        Your Positions
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {activePositions.map((p) => {
          const vaultId = (p.vault as any)?.id || (p.vault as any)?.name || "Unknown";
          const meta = VAULT_META[vaultId];
          const decimals = meta?.decimals ?? 18;
          const assetsFormatted = formatValue(p.position.assets, decimals);
          const sharesFormatted = formatValue(p.position.shares, decimals);

          return (
            <Card key={vaultId} className="border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="size-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: meta?.color || "#6b7280" }}
                  >
                    {meta?.icon || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{vaultId}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {meta?.underlying || ""}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">Active</Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground">Assets</div>
                    <div className="text-sm font-medium tabular-nums">
                      {assetsFormatted} {meta?.underlying}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Shares</div>
                    <div className="text-sm font-medium tabular-nums">
                      {sharesFormatted}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3"
                  onClick={() =>
                    setRedeemTarget({
                      vaultId,
                      shares: p.position.shares,
                      assets: p.position.assets,
                      decimals,
                      underlying: meta?.underlying || "",
                    })
                  }
                >
                  <ArrowDownToLine className="mr-1.5 size-3.5" />
                  Redeem
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {redeemTarget && (
        <RedeemModal
          open={!!redeemTarget}
          onClose={() => setRedeemTarget(null)}
          vaultId={redeemTarget.vaultId}
          shares={redeemTarget.shares}
          assets={redeemTarget.assets}
          decimals={redeemTarget.decimals}
          underlying={redeemTarget.underlying}
        />
      )}
    </div>
  );
}
