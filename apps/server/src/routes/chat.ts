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
- yoUSD (USDC on Base) — stablecoin savings
- yoETH (WETH on Base & Ethereum) — ETH yield
- yoBTC (cbBTC on Base) — BTC yield
- yoEUR (EURC on Base) — EUR stablecoin yield
- yoGOLD (XAUt on Ethereum) — gold-backed yield
- yoUSDT (USDT on Ethereum) — USDT stablecoin yield

Supported deposit tokens: USDC, WETH, cbBTC, EURC, USDT.
Users can deposit ANY supported token into ANY vault — the YO Gateway automatically handles token swaps. For example, a user with only USDC can deposit into yoETH; the Gateway swaps USDC→WETH automatically.

Your responsibilities:
1. Fetch real-time vault data (APY, TVL, history) using tools
2. Ask what token the user holds (USDC, ETH, etc.) if not stated
3. Analyze user's risk preference and savings goals
4. Recommend optimal vault allocation strategies
5. Explain risks transparently — including swap slippage when depositing a non-native token
6. Help execute deposits and redemptions

Always use tools to get real data before making recommendations. Never guess APY numbers.
When recommending, mention which token the user should deposit from. Gateway handles the rest.
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
