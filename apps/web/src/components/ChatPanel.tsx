import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useChatStore, type AllocationPlan } from "@/store/chat-store";
import { AllocationCard } from "./AllocationCard";
import { sendChatMessage } from "@/lib/api";
import { useAccount } from "wagmi";

function parseAllocationPlan(text: string): AllocationPlan | undefined {
  const match = text.match(/```allocation\n([\s\S]*?)\n```/);
  if (!match) return undefined;
  try {
    return JSON.parse(match[1]) as AllocationPlan;
  } catch {
    return undefined;
  }
}

function stripAllocationBlock(text: string): string {
  return text.replace(/```allocation\n[\s\S]*?\n```/g, "").trim();
}

export function ChatPanel() {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { address } = useAccount();
  const {
    messages,
    isLoading,
    addMessage,
    setLoading,
    setCurrentPlan,
    updateLastAssistantMessage,
  } = useChatStore();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput("");
    addMessage({ role: "user", content: userMsg });
    addMessage({ role: "assistant", content: "", isLoading: true });
    setLoading(true);

    try {
      // Build message history for the API (exclude loading messages)
      const apiMessages = [
        ...messages.filter((m) => !m.isLoading),
        { role: "user" as const, content: userMsg },
      ].map((m) => ({
        role: m.role,
        content:
          m.role === "user" && address
            ? `[User wallet: ${address}]\n${m.content}`
            : m.content,
      }));

      const response = await sendChatMessage(apiMessages);
      const plan = parseAllocationPlan(response.content);
      const cleanContent = stripAllocationBlock(response.content);

      updateLastAssistantMessage(cleanContent, plan);
      if (plan) setCurrentPlan(plan);
    } catch {
      updateLastAssistantMessage(
        "Sorry, I encountered an error. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex-1 overflow-hidden" ref={scrollRef}>
        <ScrollArea className="h-full p-4">
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {msg.isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      <span className="text-muted-foreground">
                        Analyzing vaults...
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 [&>table]:w-full [&>table]:text-xs [&>table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:bg-muted/50 [&_th]:font-medium [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_hr]:my-3 [&_hr]:border-border [&_strong]:text-foreground">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                      {msg.allocationPlan && (
                        <AllocationCard
                          plan={msg.allocationPlan}
                          onExecute={() => setCurrentPlan(msg.allocationPlan!)}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
      <div className="p-4 border-t border-border">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            placeholder="Tell me your savings goals..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isLoading} aria-label="Send message">
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </form>
      </div>
    </>
  );
}
