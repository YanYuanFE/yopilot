import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, AlertCircle, ArrowRight, Wallet, ExternalLink, ChevronDown } from "lucide-react";
import { useChatStore } from "@/store/chat-store";
import { useVaultStore } from "@/store/vault-store";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { prepareApprove, prepareDeposit } from "@yo-protocol/core";
import { DepositStepRow, type DepositStepState } from "./DepositStepRow";
import { SOURCE_TOKENS, VAULT_CONFIG, type TokenConfig } from "@/lib/tokens";
import { cn } from "@/lib/utils";

export function ExecutionModal() {
  const { currentPlan, setCurrentPlan } = useChatStore();
  const { isConnected } = useAccount();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const queryClient = useQueryClient();
  const { fetchVaults } = useVaultStore();

  const [totalAmount, setTotalAmount] = useState("");
  const [phase, setPhase] = useState<"input" | "confirm" | "executing" | "done">("input");
  const [steps, setSteps] = useState<DepositStepState[]>([]);
  const [selectedToken, setSelectedToken] = useState<TokenConfig>(SOURCE_TOKENS[0]);
  const [tokenMenuOpen, setTokenMenuOpen] = useState(false);

  const allocations = currentPlan?.allocations ?? [];

  const updateStep = useCallback((idx: number, patch: Partial<DepositStepState>) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }, []);

  if (!currentPlan) return null;

  const total = parseFloat(totalAmount || "0");
  const amounts = allocations.map((a) => ((total * a.percentage) / 100).toFixed(2));

  const handlePrepare = () => {
    if (!totalAmount || total <= 0) return;
    const newSteps: DepositStepState[] = allocations.map((a, i) => ({
      vault: a.vault,
      amount: `${amounts[i]} ${selectedToken.symbol}`,
      percentage: a.percentage,
      status: "pending",
      step: "idle",
    }));
    setSteps(newSteps);
    setPhase("confirm");
  };

  const handleExecute = async () => {
    if (!isConnected || !walletClient || !publicClient || !address) return;
    setPhase("executing");

    const YO_GATEWAY = "0xF1EeE0957267b1A474323Ff9CfF7719E964969FA" as const;
    const MAX_UINT256 = 2n ** 256n - 1n;
    const totalParsed = BigInt(
      Math.floor(total * 10 ** selectedToken.decimals)
    );

    // Step 0: One-time unlimited approve for Gateway
    try {
      updateStep(0, { status: "active", step: "approving" });

      const allowance = await publicClient.readContract({
        address: selectedToken.address,
        abi: [{ name: "allowance", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "", type: "uint256" }] }],
        functionName: "allowance",
        args: [address, YO_GATEWAY],
      }) as bigint;

      if (allowance < totalParsed) {
        const approveTx = prepareApprove({
          token: selectedToken.address,
          spender: YO_GATEWAY,
          amount: MAX_UINT256,
        });
        const approveHash = await walletClient.sendTransaction({
          to: approveTx.to,
          data: approveTx.data,
          value: approveTx.value,
          chain: null,
          account: address,
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }
    } catch (err: any) {
      // If approve fails, abort all
      for (let i = 0; i < allocations.length; i++) {
        updateStep(i, { status: "error", step: "error", errorMsg: err?.shortMessage || "Approve failed" });
      }
      setPhase("done");
      return;
    }

    // Step 1..N: Deposit into each vault (no more approve needed)
    const connectedChainId = await walletClient.getChainId();

    for (let i = 0; i < allocations.length; i++) {
      const alloc = allocations[i];
      const vaultConfig = VAULT_CONFIG[alloc.vault];
      if (!vaultConfig) {
        updateStep(i, { status: "error", step: "error", errorMsg: `Unknown vault: ${alloc.vault}` });
        continue;
      }

      // Skip vaults on different chains (shouldn't happen if AI respects chain rules)
      if (vaultConfig.chainId !== connectedChainId) {
        console.warn(`[YoPilot] Skipping ${alloc.vault}: on chain ${vaultConfig.chainId}, connected to ${connectedChainId}`);
        updateStep(i, {
          status: "error",
          step: "error",
          errorMsg: `Switch to ${vaultConfig.chainId === 1 ? "Ethereum" : "Base"} to deposit`,
        });
        continue;
      }

      const amount = amounts[i];
      const parsedAmount = BigInt(
        Math.floor(parseFloat(amount) * 10 ** selectedToken.decimals)
      );

      if (parsedAmount <= 0n) {
        updateStep(i, { status: "error", step: "error", errorMsg: "Amount too small" });
        continue;
      }

      updateStep(i, { status: "active", step: "depositing" });

      try {
        console.log(`[YoPilot] Depositing ${amount} ${selectedToken.symbol} into ${alloc.vault} (${vaultConfig.address}) on chain ${vaultConfig.chainId}`);

        const depositTx = await prepareDeposit(publicClient as any, {
          vault: vaultConfig.address,
          amount: parsedAmount,
          recipient: address,
          slippageBps: 50,
        });

        console.log(`[YoPilot] Prepared deposit tx:`, depositTx);

        const depositHash = await walletClient.sendTransaction({
          to: depositTx.to,
          data: depositTx.data,
          value: depositTx.value,
          chain: null,
          account: address,
        });

        console.log(`[YoPilot] Deposit tx sent:`, depositHash);

        updateStep(i, { step: "waiting" });
        await publicClient.waitForTransactionReceipt({ hash: depositHash });

        updateStep(i, {
          status: "success",
          step: "success",
          txHash: depositHash,
        });
      } catch (err: any) {
        console.error(`[YoPilot] Deposit to ${alloc.vault} failed:`, err);
        const msg = err?.shortMessage || err?.message || "Transaction failed";
        updateStep(i, {
          status: "error",
          step: "error",
          errorMsg: msg,
        });
      }
    }

    // Refresh all data
    queryClient.invalidateQueries();
    fetchVaults();
    setPhase("done");
  };

  const handleClose = () => {
    setCurrentPlan(null);
    setTotalAmount("");
    setPhase("input");
    setSteps([]);
    setTokenMenuOpen(false);
  };

  const isExecuting = phase === "executing";
  const successCount = steps.filter((s) => s.status === "success").length;
  const hasError = steps.some((s) => s.status === "error");

  return (
    <Dialog open={!!currentPlan} onOpenChange={(open) => !open && !isExecuting && handleClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="size-5" />
            {phase === "done" ? "Execution Complete" : "Execute Savings Plan"}
          </DialogTitle>
        </DialogHeader>

        {phase === "input" && (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground text-pretty">
              Choose your deposit token and enter the amount. The YO Gateway will automatically handle any token conversions needed.
            </p>

            <div className="space-y-2">
              <label className="text-sm font-medium">Deposit From</label>
              <div className="flex gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setTokenMenuOpen(!tokenMenuOpen)}
                    className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm font-medium hover:bg-muted"
                  >
                    <span>{selectedToken.symbol}</span>
                    <ChevronDown className="size-3.5 text-muted-foreground" />
                  </button>
                  {tokenMenuOpen && (
                    <div className="absolute top-full left-0 mt-1 z-50 rounded-md border border-border bg-popover p-1 shadow-md">
                      {SOURCE_TOKENS.map((token) => (
                        <button
                          key={token.symbol}
                          type="button"
                          onClick={() => {
                            setSelectedToken(token);
                            setTokenMenuOpen(false);
                          }}
                          className={cn(
                            "block w-full px-3 py-1.5 text-sm font-medium rounded-sm hover:bg-muted text-left",
                            selectedToken.symbol === token.symbol && "bg-muted"
                          )}
                        >
                          {token.symbol}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Input
                  type="number"
                  placeholder={`Amount in ${selectedToken.symbol}`}
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  min="0"
                  step="0.01"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">on {selectedToken.chain}</p>
            </div>

            <div className="space-y-2 bg-muted/50 rounded-lg p-3">
              <div className="text-xs font-medium text-muted-foreground uppercase">
                Allocation Preview
              </div>
              {allocations.map((a, i) => (
                <div key={a.vault} className="flex items-center justify-between text-sm">
                  <span>{a.vault}</span>
                  <span className="font-mono tabular-nums">
                    {a.percentage}%
                    {total > 0 && (
                      <span className="text-muted-foreground ml-2">
                        ≈ {amounts[i]} {selectedToken.symbol}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>

            <Button onClick={handlePrepare} className="w-full" disabled={!totalAmount || total <= 0}>
              <ArrowRight className="mr-2 size-4" />
              Review Plan
            </Button>
          </div>
        )}

        {(phase === "confirm" || phase === "executing" || phase === "done") && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Depositing</span>
              <span className="font-medium text-foreground tabular-nums">
                {totalAmount} {selectedToken.symbol}
              </span>
              <span>on {selectedToken.chain}</span>
            </div>

            <div className="space-y-3">
              {steps.map((s, i) => (
                <DepositStepRow
                  key={s.vault}
                  state={s}
                  index={i}
                  explorerBase={VAULT_CONFIG[s.vault]?.explorer}
                />
              ))}
            </div>

            {phase === "confirm" && (
              <div className="flex gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm">
                <AlertCircle className="size-4 text-yellow-500 mt-0.5 shrink-0" />
                <div className="text-yellow-200/80">
                  <p>Real on-chain transactions via YO Protocol Gateway.</p>
                  <p className="mt-1">
                    {selectedToken.symbol} will be auto-swapped for vaults that use a different underlying token.
                  </p>
                </div>
              </div>
            )}

            {phase === "confirm" && (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setPhase("input")}>
                  Back
                </Button>
                <Button className="flex-1" onClick={handleExecute} disabled={!isConnected}>
                  {!isConnected ? "Connect Wallet First" : "Confirm & Execute"}
                </Button>
              </div>
            )}

            {phase === "done" && (
              <div className="space-y-3">
                <div
                  className={`text-center p-4 rounded-lg border ${
                    hasError
                      ? "bg-yellow-500/10 border-yellow-500/20"
                      : "bg-green-500/10 border-green-500/20"
                  }`}
                >
                  {hasError ? (
                    <AlertCircle className="size-8 text-yellow-500 mx-auto mb-2" />
                  ) : (
                    <Check className="size-8 text-green-500 mx-auto mb-2" />
                  )}
                  <div className={`font-medium ${hasError ? "text-yellow-400" : "text-green-400"}`}>
                    {hasError
                      ? `${successCount}/${allocations.length} deposits completed`
                      : "All deposits successful!"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 tabular-nums">
                    Total saved: {totalAmount} {selectedToken.symbol}
                  </div>
                  <div className="mt-3 space-y-1">
                    {steps
                      .filter((s) => s.txHash)
                      .map((s) => (
                        <a
                          key={s.vault}
                          href={`${VAULT_CONFIG[s.vault]?.explorer || "https://basescan.org"}/tx/${s.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                        >
                          {s.vault}: {s.txHash?.slice(0, 10)}...
                          <ExternalLink className="size-3" />
                        </a>
                      ))}
                  </div>
                </div>
                <Button onClick={handleClose} className="w-full" variant="outline">
                  Close
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
