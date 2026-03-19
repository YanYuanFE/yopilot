import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AllocationPlan } from "@/store/chat-store";

const VAULT_COLORS: Record<string, string> = {
  yoUSD: "bg-green-500",
  yoETH: "bg-blue-500",
  yoBTC: "bg-orange-500",
  yoEUR: "bg-purple-500",
  yoGOLD: "bg-yellow-500",
  yoUSDT: "bg-emerald-500",
};

const VAULT_ICONS: Record<string, string> = {
  yoUSD: "$",
  yoETH: "\u039E",
  yoBTC: "\u20BF",
  yoEUR: "\u20AC",
  yoGOLD: "Au",
  yoUSDT: "$",
};

interface AllocationCardProps {
  plan: AllocationPlan;
  onExecute?: () => void;
}

export function AllocationCard({ plan, onExecute }: AllocationCardProps) {
  return (
    <Card className="mt-3 border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <span className="text-base">📊</span>
          Recommended Allocation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Allocation bar */}
        <div className="flex h-3 rounded-full overflow-hidden">
          {plan.allocations.map((a) => (
            <div
              key={a.vault}
              className={`${VAULT_COLORS[a.vault] || "bg-gray-500"} transition-all`}
              style={{ width: `${a.percentage}%` }}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="space-y-1.5">
          {plan.allocations.map((a) => (
            <div
              key={a.vault}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                <div
                  className={`size-3 rounded-full ${VAULT_COLORS[a.vault] || "bg-gray-500"}`}
                />
                <span className="font-medium">{a.vault}</span>
                <Badge variant="secondary" className="text-xs">
                  {VAULT_ICONS[a.vault]}
                </Badge>
              </div>
              <span className="font-mono tabular-nums">{a.percentage}%</span>
            </div>
          ))}
        </div>

        <Button onClick={onExecute} className="w-full mt-2" size="sm">
          Execute This Plan
        </Button>
      </CardContent>
    </Card>
  );
}
