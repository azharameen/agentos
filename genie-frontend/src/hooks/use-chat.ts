"use client";

import { useState, useTransition, useRef } from "react";
import type { Conversation, AnyMessage } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { handleAgentEvent } from "@/lib/event-handlers";

function getSummaryForPrompt(text: string): string {
  if (text.length < 40) {
    return text;
  }
  return text.split(" ").slice(0, 5).join(" ") + "...";
}

export const useChat = () => {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [isPending, startTransition] = useTransition();
  const abortControllerRef = useRef<AbortController | null>(null);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  const handleNewChat = () => {
    const newConversationId = `conv_${Date.now()}`;
    const newConversation: Conversation = {
      id: newConversationId,
      summary: "New Agentic Chat",
      messages: [],
    };
    setConversations([newConversation, ...conversations]);
    setActiveConversationId(newConversationId);
    setPrompt("");
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConversationId) {
          return {
            ...c,
            messages: c.messages
              .filter((m) => m.type !== "loading")
              .map((m) => ("isStreaming" in m && (m as any).isStreaming ? { ...m, isStreaming: false } : m)),
          };
        }
        return c;
      })
    );
  };

  const handleSubmit = (customPrompt?: string) => {
    const currentPrompt = customPrompt || prompt;
    if (!currentPrompt.trim() || isPending) return;

    handleStop();

    let conversationId = activeConversationId;
    const userMessageId = `msg_${Date.now()}`;
    const user = {
      name: "User",
      avatarUrl: "", // This can be configured
    };
    const newUserMessage: AnyMessage = {
      id: userMessageId,
      role: "user",
      type: "text",
      content: currentPrompt,
      name: user.name,
      avatarUrl: user.avatarUrl,
      createdAt: new Date().toISOString(),
    };

    if (!activeConversationId || !conversations.some((c) => c.id === activeConversationId)) {
      conversationId = `conv_${Date.now()}`;
      const newConversation: Conversation = {
        id: conversationId,
        summary: getSummaryForPrompt(currentPrompt),
        messages: [newUserMessage],
      };
      setConversations((prev) => [newConversation, ...prev]);
      setActiveConversationId(conversationId);
    } else {
      conversationId = activeConversationId;
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, messages: [...c.messages, newUserMessage] } : c
        )
      );
    }
    setPrompt("");

    startTransition(async () => {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const url = `http://localhost:3001/agent/execute`;
      const payload = {
        prompt: currentPrompt,
        model: "gpt-4",
        conversationId,
      };

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: abortController.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const event = JSON.parse(line.trim());
              handleAgentEvent(event, { conversationId, setConversations });
            } catch (err) {
              console.warn("Failed to parse event:", line, err);
            }
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Stream error:", err);
          toast({
            variant: "destructive",
            title: "Error",
            description: err.message || "An unknown error occurred.",
          });
        }
      } finally {
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    });
  };

  return {
    conversations,
    setConversations,
    activeConversationId,
    setActiveConversationId,
    prompt,
    setPrompt,
    isPending,
    handleSubmit,
    handleNewChat,
    handleStop,
    activeConversation,
  };
};
