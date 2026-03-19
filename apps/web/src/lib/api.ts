const API_BASE = import.meta.env.VITE_API_URL || "";

export async function sendChatMessage(
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<{ content: string }> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return res.json();
}
