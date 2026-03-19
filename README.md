# YoPilot — AI DeFi Savings Copilot

YoPilot is an AI-powered savings copilot that helps users build diversified DeFi savings strategies across [YO Protocol](https://yo.xyz) vaults. Chat with AI, get personalized allocation plans based on real-time vault data, and execute multi-vault deposits in one flow.

![YoPilot Screenshot](./logo-yopilot.png)

## What Makes YoPilot Different

Unlike other hackathon submissions that build yet another savings dashboard, YoPilot takes an **AI-first conversational approach**:

- **AI analyzes real-time vault data** — APY, TVL, yield history — via Claude tool calling before making any recommendation
- **Personalized allocation plans** — Based on your risk preference, holdings, and goals
- **One-click multi-vault execution** — Deposit into multiple vaults sequentially from a single token (Gateway auto-swaps)
- **No DeFi knowledge required** — Just describe your goals in plain language

## Features

- **Conversational AI Copilot** — Chat interface powered by Claude with real-time YO Protocol data access via tool calling
- **Smart Allocation Engine** — AI generates allocation plans (e.g., 60% yoUSD + 25% yoETH + 15% yoGOLD) rendered as interactive cards
- **Multi-Vault Deposit** — Execute the AI's plan with sequential deposits, token selector (USDC, WETH, cbBTC, EURC, USDT), automatic Gateway token swaps
- **Live Vault Dashboard** — Real-time APY, TVL for all 5 vaults (yoUSD, yoETH, yoBTC, yoEUR, yoGOLD)
- **Portfolio Tracking** — View your positions across all YO vaults, auto-refreshed after deposits
- **RainbowKit Wallet** — Connect via MetaMask, WalletConnect, Coinbase Wallet, and more

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Frontend (Vite + React)             │
│                                                  │
│  ┌──────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Chat UI  │  │  Dashboard   │  │ Execution  │ │
│  │(Markdown │  │ (Vault Cards │  │   Modal    │ │
│  │ + GFM)   │  │  + Positions)│  │(useDeposit)│ │
│  └────┬─────┘  └──────┬───────┘  └─────┬──────┘ │
│       │               │                │         │
│  ┌────┴───────────────┴────────────────┴──────┐  │
│  │    @yo-protocol/react hooks + Zustand      │  │
│  └────┬───────────────┬────────────────┬──────┘  │
│       │               │                │         │
│  Hono API        YO SDK React       wagmi/RainbowKit
│  (AI Chat)       (Vault Data)       (Wallet)     │
└───────┼───────────────┼────────────────┼─────────┘
        │               │                │
   Claude API    YO Protocol Vaults   User Wallet
   (tool calling)  (Base / Ethereum)
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vite, React 19, TypeScript |
| UI | Tailwind CSS v4, shadcn/ui, Radix primitives |
| AI | Claude API with tool calling (Hono backend) |
| DeFi | `@yo-protocol/core`, `@yo-protocol/react` |
| Wallet | wagmi v3, viem, RainbowKit |
| State | Zustand, TanStack Query |
| Markdown | react-markdown + remark-gfm |
| Monorepo | pnpm workspaces |

## YO SDK Integration

YoPilot deeply integrates the YO SDK across both frontend and backend:

**Backend (AI Tool Calling)**
- `getVaults()` — Fetches all vault snapshots (APY, TVL, underlying asset)
- `getVaultYieldTimeseries()` — Historical APY data for trend analysis
- `getVaultTvlTimeseries()` — Historical TVL data
- `getUserTransactionHistory()` — User's past deposits/withdrawals

**Frontend (React Hooks)**
- `useDeposit()` — Executes real deposits with auto approve + chain switching
- `useUserPositions()` — Displays user's portfolio across all vaults
- `useVaults()` — Live vault listing
- `YieldProvider` — SDK context provider

**Deposit Flow**
1. User chats with AI → AI calls tools to fetch live vault data → generates allocation plan
2. User clicks "Execute This Plan" → selects source token (e.g., USDC) → enters amount
3. Sequential `await deposit()` for each vault — Gateway auto-swaps tokens as needed
4. All positions and vault data auto-refresh on completion

## Supported Vaults & Chains

| Vault | Asset | Chain | Description |
|---|---|---|---|
| yoUSD | USDC | Base | Stablecoin yield |
| yoETH | WETH | Base / Ethereum | ETH yield |
| yoBTC | cbBTC | Base | BTC yield |
| yoEUR | EURC | Base | EUR stablecoin yield |
| yoGOLD | XAUt | Ethereum | Gold-backed yield |

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9+
- An Anthropic API key (or compatible proxy)

### Installation

```bash
git clone <repo-url>
cd yopilot
pnpm install
```

### Configuration

Create `apps/server/.env`:

```env
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_BASE_URL=https://api.anthropic.com   # optional, for proxies
ANTHROPIC_MODEL=claude-sonnet-4-6               # optional, default: claude-sonnet-4-20250514
```

### Development

```bash
# Start both frontend and backend
pnpm dev

# Or separately
pnpm dev:web     # Frontend at http://localhost:5173
pnpm dev:server  # Backend at http://localhost:3001
```

### Build

```bash
pnpm build
```

## Project Structure

```
yopilot/
├── apps/
│   ├── web/                    # Frontend (Vite + React)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ChatPanel.tsx        # AI chat interface
│   │   │   │   ├── DashboardPanel.tsx   # Vault dashboard + positions
│   │   │   │   ├── AllocationCard.tsx   # AI allocation plan card
│   │   │   │   ├── ExecutionModal.tsx   # Multi-vault deposit flow
│   │   │   │   ├── DepositStepRow.tsx   # Single deposit step display
│   │   │   │   ├── UserPositions.tsx    # Portfolio positions
│   │   │   │   ├── VaultCard.tsx        # Individual vault card
│   │   │   │   └── WalletButton.tsx     # RainbowKit connect
│   │   │   ├── store/
│   │   │   │   ├── chat-store.ts        # Chat messages + allocation plan
│   │   │   │   └── vault-store.ts       # Vault data from API
│   │   │   └── lib/
│   │   │       ├── api.ts               # Backend API client
│   │   │       ├── tokens.ts            # Token configs + vault chain mapping
│   │   │       └── wagmi.ts             # Wagmi chain config
│   │   └── public/
│   │       ├── logo-icon.png
│   │       └── favicon.png
│   └── server/                 # Backend (Hono)
│       └── src/
│           ├── index.ts                 # Server entry + CORS
│           ├── routes/
│           │   ├── chat.ts              # POST /api/chat — Claude + tool loop
│           │   └── vaults.ts            # GET /api/vaults — vault snapshots
│           └── tools/
│               └── vault-tools.ts       # Claude tool definitions + handlers
├── pnpm-workspace.yaml
└── package.json
```

## Demo

> Demo video: [Coming soon]

## License

MIT
