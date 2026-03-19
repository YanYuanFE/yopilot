import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, AlertCircle, Loader2, ArrowDownToLine } from "lucide-react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { prepareRedeemWithApproval } from "@yo-protocol/core";
import { useVaultStore } from "@/store/vault-store";
import { VAULT_CONFIG } from "@/lib/tokens";
import { formatUnits, parseUnits } from "viem";

interface RedeemModalProps {
  open: boolean;
  onClose: () => void;
  vaultId: string;
  shares: bigint;
  assets: bigint;
  decimals: number;
  underlying: string;
}

export function RedeemModal({
  open,
  onClose,
  vaultId,
  shares,
  assets,
  decimals,
  underlying,
}: RedeemModalProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const queryClient = useQueryClient();
  const { fetchVaults } = useVaultStore();

  const [amount, setAmount] = useState("");
  const [phase, setPhase] = useState<"input" | "executing" | "done" | "error">("input");
  const [txHash, setTxHash] = useState<string>();
  const [errorMsg, setErrorMsg] = useState<string>();

  const maxShares = formatUnits(shares, decimals);
  const maxAssets = formatUnits(assets, decimals);
  const vaultConfig = VAULT_CONFIG[vaultId];

  const handleRedeem = async () => {
    if (!walletClient || !publicClient || !address || !vaultConfig) return;

    const redeemShares = amount === maxShares
      ? shares
      : parseUnits(amount, decimals);

    if (redeemShares <= 0n) return;

    setPhase("executing");
    try {
      const txs = await prepareRedeemWithApproval(publicClient as any, {
        vault: vaultConfig.address,
        shares: redeemShares,
        recipient: address,
        owner: address,
        slippageBps: 50,
      });

      let lastHash: string | undefined;
      for (const tx of txs) {
        const hash = await walletClient.sendTransaction({
          to: tx.to,
          data: tx.data,
          value: tx.value,
          chain: null,
          account: address,
        });
        await publicClient.waitForTransactionReceipt({ hash });
        lastHash = hash;
      }

      setTxHash(lastHash);
      queryClient.invalidateQueries();
      fetchVaults();
      setPhase("done");
    } catch (err: any) {
      setErrorMsg(err?.shortMessage || err?.message || "Transaction failed");
      setPhase("error");
    }
  };

  const handleClose = () => {
    setAmount("");
    setPhase("input");
    setTxHash(undefined);
    setErrorMsg(undefined);
    onClose();
  };

  const handleMax = () => setAmount(maxShares);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && phase !== "executing" && handleClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownToLine className="size-5" />
            Redeem from {vaultId}
          </DialogTitle>
        </DialogHeader>

        {phase === "input" && (
          <div className="space-y-4 pt-2">
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Your Position</span>
                <span className="font-medium tabular-nums">
                  {parseFloat(maxAssets).toFixed(4)} {underlying}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shares</span>
                <span className="font-mono tabular-nums text-xs">
                  {parseFloat(maxShares).toFixed(6)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Shares to Redeem</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0"
                  step="any"
                  className="flex-1"
                />
                <Button variant="outline" size="sm" onClick={handleMax} className="shrink-0">
                  Max
                </Button>
              </div>
            </div>

            <Button
              onClick={handleRedeem}
              className="w-full"
              disabled={!amount || parseFloat(amount) <= 0}
            >
              Redeem
            </Button>
          </div>
        )}

        {phase === "executing" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Processing redemption...</p>
          </div>
        )}

        {phase === "done" && (
          <div className="space-y-4 pt-2">
            <div className="text-center p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <Check className="size-8 text-green-500 mx-auto mb-2" />
              <div className="font-medium text-green-400">Redemption successful!</div>
              <div className="text-xs text-muted-foreground mt-1 tabular-nums">
                Redeemed {amount} shares from {vaultId}
              </div>
              {txHash && (
                <a
                  href={`${vaultConfig?.explorer || "https://basescan.org"}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block"
                >
                  View transaction
                </a>
              )}
            </div>
            <Button onClick={handleClose} className="w-full" variant="outline">
              Close
            </Button>
          </div>
        )}

        {phase === "error" && (
          <div className="space-y-4 pt-2">
            <div className="text-center p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="size-8 text-red-500 mx-auto mb-2" />
              <div className="font-medium text-red-400">Redemption failed</div>
              <div className="text-xs text-muted-foreground mt-1 truncate">
                {errorMsg}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setPhase("input")} className="flex-1" variant="outline">
                Try Again
              </Button>
              <Button onClick={handleClose} className="flex-1" variant="outline">
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
