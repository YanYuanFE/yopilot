import { ChatPanel } from "./components/ChatPanel";
import { DashboardPanel } from "./components/DashboardPanel";
import { WalletButton } from "./components/WalletButton";
import { ExecutionModal } from "./components/ExecutionModal";

export default function App() {
  return (
    <div className="h-dvh flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/80">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-green-500 flex items-center justify-center text-white font-bold text-sm">
            YO
          </div>
          <div>
            <span className="text-lg font-bold">YoPilot</span>
            <span className="text-xs text-muted-foreground ml-2">AI DeFi Savings Copilot</span>
          </div>
        </div>
        <WalletButton />
      </header>

      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden">
        {/* Chat Panel - Left */}
        <div className="w-[480px] border-r border-border flex flex-col bg-card/30">
          <ChatPanel />
        </div>
        {/* Dashboard Panel - Right */}
        <div className="flex-1 overflow-auto bg-background">
          <DashboardPanel />
        </div>
      </main>
      <ExecutionModal />
    </div>
  );
}
