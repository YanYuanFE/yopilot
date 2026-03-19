import { Hono } from "hono";
import Anthropic from "@anthropic-ai/sdk";
import { getVaultTools, handleToolCall } from "../tools/vault-tools.js";

const baseURL = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
const apiKey = process.env.ANTHROPIC_API_KEY || "";

// Use raw fetch for proxy compatibility instead of SDK
async function callClaude(body: Record<string, unknown>) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "Accept": "application/json",
    "User-Agent": "curl/8.0",
  };
  const res = await fetch(`${baseURL}/v1/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text}`);
  }
  return res.json();
}

const SYSTEM_PROMPT = `You are YoPilot, an AI DeFi savings copilot. You help users manage their savings across YO Protocol vaults.

Available YO Protocol vaults:

Base chain (chainId: 8453):
- yoUSD (USDC) — stablecoin savings
- yoETH (WETH) — ETH yield
- yoBTC (cbBTC) — BTC yield
- yoEUR (EURC) — EUR stablecoin yield

Ethereum chain (chainId: 1):
- yoGOLD (XAUt) — gold-backed yield
- yoUSDT (USDT) — USDT stablecoin yield

CRITICAL RULES:

1. CHAIN RULE: The user's message contains their connected chain info like "[Connected chain: Base (chainId: 8453)]".
   You MUST ONLY recommend vaults on the user's connected chain.
   - Base → yoUSD, yoETH, yoBTC, yoEUR
   - Ethereum → yoGOLD, yoUSDT

2. TOKEN-VAULT MATCHING RULE: Each vault ONLY accepts its native underlying token. There is NO automatic swap.
   - USDC → can ONLY deposit into yoUSD
   - WETH → can ONLY deposit into yoETH
   - cbBTC → can ONLY deposit into yoBTC
   - EURC → can ONLY deposit into yoEUR
   - XAUt → can ONLY deposit into yoGOLD
   - USDT → can ONLY deposit into yoUSDT

   If user says "I have USDC", you MUST ONLY recommend yoUSD (100%).
   If user wants diversification across multiple vaults, tell them they need to hold the corresponding tokens first (e.g., swap some USDC to WETH on a DEX, then deposit WETH into yoETH).
   NEVER create an allocation plan that deposits one token into a vault expecting a different token.

Supported deposit tokens: USDC, WETH, cbBTC, EURC (Base), USDT (Ethereum).

Your responsibilities:
1. Fetch real-time vault data (APY, TVL, history) using tools
2. Check the user's connected chain and only recommend vaults on that chain
3. Ask what token the user holds if not stated
4. Analyze user's risk preference and savings goals
5. Recommend optimal vault allocation strategies (same-chain only)
6. Explain risks transparently
7. Help execute deposits and redemptions

Always use tools to get real data before making recommendations. Never guess APY numbers.
When recommending an allocation, output a JSON block like:
\`\`\`allocation
{"allocations": [{"vault": "yoUSD", "percentage": 70}, {"vault": "yoETH", "percentage": 30}]}
\`\`\`

Be concise, friendly, and data-driven. Respond in the same language the user uses.`;

export const chatRoute = new Hono();

chatRoute.post("/chat", async (c) => {
  try {
    const { messages } = await c.req.json<{
      messages: { role: "user" | "assistant"; content: string }[];
    }>();

    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
    const tools = getVaultTools();

    let currentMessages: any[] = messages.map((m: any) => ({
      role: m.role,
      content: m.content,
    }));

    const makeRequest = () =>
      callClaude({
        model,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools,
        messages: currentMessages,
      });

    // Tool use loop
    let response: any = await makeRequest();

    while (response.stop_reason === "tool_use") {
      const assistantContent = response.content;
      currentMessages.push({ role: "assistant", content: assistantContent });

      const toolResults: any[] = [];
      for (const block of assistantContent) {
        if (block.type === "tool_use") {
          const result = await handleToolCall(block.name, block.input as Record<string, unknown>);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }
      }

      currentMessages.push({ role: "user", content: toolResults });
      response = await makeRequest();
    }

    // Extract final text
    const textContent = response.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n");

    return c.json({ content: textContent });
  } catch (error: any) {
    console.error("Chat error:", error?.message || error);
    return c.json(
      { content: `Error: ${error?.message || "Unknown error"}. Check server logs.` },
      200
    );
  }
});
