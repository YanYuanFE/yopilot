import { Badge } from "@/components/ui/badge";
import { Check, Loader2, AlertCircle } from "lucide-react";
import type { DepositStep } from "@yo-protocol/react";

const STEP_LABELS: Record<DepositStep, string> = {
  idle: "Waiting...",
  "switching-chain": "Switching network...",
  approving: "Approving token...",
  depositing: "Depositing...",
  waiting: "Confirming on-chain...",
  success: "Complete!",
  error: "Failed",
};

export type StepStatus = "pending" | "active" | "success" | "error";

export interface DepositStepState {
  vault: string;
  amount: string;
  percentage: number;
  status: StepStatus;
  step: DepositStep;
  txHash?: string;
  errorMsg?: string;
}

interface DepositStepRowProps {
  state: DepositStepState;
  index: number;
  explorerBase?: string;
}

export function DepositStepRow({ state, index, explorerBase = "https://basescan.org" }: DepositStepRowProps) {
  const { vault, amount, percentage, status, step, txHash, errorMsg } = state;

  const statusIcon = () => {
    if (status === "success") {
      return (
        <div className="size-5 rounded-full bg-green-500 flex items-center justify-center">
          <Check className="size-3 text-white" />
        </div>
      );
    }
    if (status === "error") {
      return <AlertCircle className="size-5 text-red-500" />;
    }
    if (status === "active") {
      return <Loader2 className="size-5 animate-spin text-blue-500" />;
    }
    return <div className="size-5 rounded-full border-2 border-muted-foreground/30" />;
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
        status === "active"
          ? "border-blue-500/50 bg-blue-500/5"
          : status === "success"
          ? "border-green-500/30 bg-green-500/5"
          : status === "error"
          ? "border-red-500/30 bg-red-500/5"
          : "border-border"
      }`}
    >
      {statusIcon()}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">
          {index + 1}. Deposit into {vault}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {amount} ({percentage}%)
          {status === "active" && step !== "idle" && (
            <span className="ml-1 text-blue-400">{STEP_LABELS[step]}</span>
          )}
        </div>
        {status === "error" && errorMsg && (
          <div className="text-xs text-red-400 truncate mt-0.5">
            {errorMsg.slice(0, 40)}
          </div>
        )}
      </div>
      {txHash && (
        <a
          href={`${explorerBase}/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0"
        >
          <Badge variant="outline" className="text-xs font-mono hover:bg-muted cursor-pointer">
            {txHash.slice(0, 6)}..
          </Badge>
        </a>
      )}
    </div>
  );
}
