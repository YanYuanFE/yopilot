import { create } from "zustand";

export interface Allocation {
  vault: string;
  percentage: number;
}

export interface AllocationPlan {
  allocations: Allocation[];
  totalAmount?: number;
  currency?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  allocationPlan?: AllocationPlan;
  isLoading?: boolean;
}

interface ChatStore {
  messages: ChatMessage[];
  isLoading: boolean;
  currentPlan: AllocationPlan | null;
  addMessage: (msg: ChatMessage) => void;
  setLoading: (loading: boolean) => void;
  setCurrentPlan: (plan: AllocationPlan | null) => void;
  updateLastAssistantMessage: (content: string, plan?: AllocationPlan) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [
    {
      role: "assistant",
      content:
        "Hi! I'm YoPilot, your AI DeFi savings copilot. I analyze real-time vault data to find the best yield strategy for you.\n\nTry asking:\n- \"I have 5000 USDC, suggest a safe savings plan\"\n- \"Show me all available vaults and their APY\"\n- \"Help me diversify across USD, ETH and Gold\"",
    },
  ],
  isLoading: false,
  currentPlan: null,
  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),
  setLoading: (loading) => set({ isLoading: loading }),
  setCurrentPlan: (plan) => set({ currentPlan: plan }),
  updateLastAssistantMessage: (content, plan) =>
    set((state) => {
      const msgs = [...state.messages];
      const lastIdx = msgs.findLastIndex((m) => m.role === "assistant");
      if (lastIdx >= 0) {
        msgs[lastIdx] = {
          ...msgs[lastIdx],
          content,
          allocationPlan: plan,
          isLoading: false,
        };
      }
      return { messages: msgs };
    }),
}));
