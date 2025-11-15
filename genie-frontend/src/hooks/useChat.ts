import { useState, useRef, useTransition } from "react";
import type { AnyMessage, Conversation } from "@/lib/types";
import { handleAgentEvent } from "@/lib/event-handlers";

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [isPending, startTransition] = useTransition();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Derived state
  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const hasConversations = conversations.length > 0;
  const hasMessages = (activeConversation?.messages?.length ?? 0) > 0;
  const isStreaming = !!activeConversation?.messages.some(m => "isStreaming" in m && (m as any).isStreaming);

  // New chat
  function handleNewChat() {
    const newConversationId = `conv_${Date.now()}`;
    const newConversation: Conversation = {
      id: newConversationId,
      summary: "New Agentic Chat",
      messages: []
    };
    setConversations([newConversation, ...conversations]);
    setActiveConversationId(newConversationId);
    setPrompt("");
  }

  // Prompt change
  function handlePromptChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setPrompt(e.target.value);
  }

  // Submit
  function handleSubmit(e?: React.FormEvent<HTMLFormElement>, customPrompt?: string) {
    e?.preventDefault();
    const currentPrompt = customPrompt || prompt;
    if (!currentPrompt.trim() || isPending) return;
    handleStop();
    let conversationId = activeConversationId;
    const userMessageId = `msg_${Date.now()}`;
    const user = {
      name: "Alex",
      avatarUrl: "https://i.pravatar.cc/150?u=a042581f4e29026704d"
    };
    const newUserMessage: AnyMessage = {
      id: userMessageId,
      role: "user",
      type: "text",
      content: currentPrompt,
      name: user.name,
      avatarUrl: user.avatarUrl
    };
    if (!activeConversationId || !conversations.some(c => c.id === activeConversationId)) {
      conversationId = `conv_${Date.now()}`;
      const newConversation: Conversation = {
        id: conversationId,
        summary: getSummaryForPrompt(currentPrompt),
        messages: [newUserMessage]
      };
      setConversations(prev => [newConversation, ...prev]);
      setActiveConversationId(conversationId);
    } else {
      conversationId = activeConversationId;
      setConversations(prev =>
        prev.map(c =>
          c.id === conversationId
            ? { ...c, messages: [...c.messages, newUserMessage] }
            : c
        )
      );
    }
    setPrompt("");
    startTransition(async () => {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const model = "gpt-4";
      const url = `http://localhost:3001/agent/execute`;
      const payload = {
        prompt: currentPrompt,
        model,
        stream: true
      };
      let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: abortController.signal
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to get agent response`);
        if (!response.body) throw new Error("Response body is null");
        reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            if (buffer.trim()) {
              try {
                const event = JSON.parse(buffer.trim());
                handleAgentEvent(event, { conversationId, setConversations });
              } catch { }
            }
            break;
          }
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine) continue;
              try {
                const event = JSON.parse(trimmedLine);
                handleAgentEvent(event, { conversationId, setConversations });
              } catch { }
            }
          }
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;
        setConversations(prev =>
          prev.map(c => {
            if (c.id === conversationId) {
              const errorMessage: import("@/lib/types").ErrorMessage = {
                id: `error-${Date.now()}`,
                role: "assistant",
                type: "error",
                content: err?.message || "An unknown error occurred."
              };
              return {
                ...c,
                messages: [...c.messages.filter(m => m.type !== "loading"), errorMessage]
              };
            }
            return c;
          })
        );
      } finally {
        if (reader) {
          try { reader.releaseLock(); } catch { }
        }
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    });
  }

  // Stop
  function handleStop() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setConversations(prev =>
      prev.map(c => {
        if (c.id === activeConversationId) {
          return {
            ...c,
            messages: c.messages
              .filter(m => m.type !== "loading")
              .map(m =>
                "isStreaming" in m && (m as any).isStreaming
                  ? { ...m, isStreaming: false }
                  : m
              )
          };
        }
        return c;
      })
    );
  }

  // Example prompt
  function handleExamplePrompt(examplePrompt: string) {
    setPrompt(examplePrompt);
    handleSubmit(undefined, examplePrompt);
  }

  // Utility
  function getSummaryForPrompt(text: string): string {
    if (text.length < 40) return text;
    return text.split(" ").slice(0, 5).join(" ") + "...";
  }

  return {
    conversations,
    setConversations,
    activeConversationId,
    setActiveConversationId,
    prompt,
    setPrompt,
    isPending,
    activeConversation,
    hasConversations,
    hasMessages,
    isStreaming,
    handleNewChat,
    handlePromptChange,
    handleSubmit,
    handleStop,
    handleExamplePrompt
  };
}
