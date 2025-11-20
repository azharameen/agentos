// Move 'use client' directive to the top
"use client";
// Helper to process a line from the agent stream
function handleStreamLine(line: string, sessionId: string, setConversations: any, markdownBuffer: { value: string }, messageId: { value: string | null }) {
  const trimmed = line.trim();
  if (!trimmed) return;
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const event = JSON.parse(trimmed);
      handleAgentEvent(event, { sessionId, setConversations });
      if (event.type === "agent_message" && event.content) {
        markdownBuffer.value += event.content + "\n";
        messageId.value = event.id ?? null;
      }
    } catch (err) {
      console.warn("Failed to parse event:", trimmed, err);
    }
  } else {
    markdownBuffer.value += trimmed + "\n";
  }
}

// Helper to update messages for handleStop

// Helper to add agent message to conversations
// Helper to update messages for handleStop
function getStoppedMessages(messages: AnyMessage[]): AnyMessage[] {
  return messages
    .filter(m => m.type !== "loading")
    .map(m => {
      if ("isStreaming" in m && (m as any).isStreaming) {
        return { ...m, isStreaming: false };
      }
      return m;
    });
}

// Helper to add agent message to conversations
function addAgentMessageToConversations(conversations: Conversation[], sessionId: string, agentMessage: AnyMessage): Conversation[] {
  return conversations.map(c =>
    c.id === sessionId ? { ...c, messages: [...c.messages, agentMessage] } : c
  );
}

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
  // Helper to update messages for handleStop
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [isPending, startTransition] = useTransition();
  const abortControllerRef = useRef<AbortController | null>(null);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const handleNewChat = () => {
    const newConversationId = `conv_${Date.now()}`;
    const newConversation: Conversation = {
      id: newConversationId,
      summary: "New Agentic Chat",
      messages: []
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
    setConversations(prev => prev.map(c =>
      c.id === activeConversationId
        ? { ...c, messages: getStoppedMessages(c.messages) }
        : c
    ));
    // Helper to add agent message to conversations
  };

  const handleSubmit = (customPrompt?: string) => {
    const currentPrompt = customPrompt || prompt;
    if (!currentPrompt.trim() || isPending) return;

    handleStop();

    let sessionId = activeConversationId;
    const userMessageId = `msg_${Date.now()}`;
    const user = {
      name: "User",
      avatarUrl: "" // This can be configured
    };
    const newUserMessage: AnyMessage = {
      id: userMessageId,
      role: "user",
      type: "text",
      content: currentPrompt,
      name: user.name,
      avatarUrl: user.avatarUrl,
      createdAt: new Date().toISOString()
    };

    if (!activeConversationId || !conversations.some(c => c.id === activeConversationId)) {
      sessionId = `session-${Date.now()}`;
      const newConversation: Conversation = {
        id: sessionId,
        summary: getSummaryForPrompt(currentPrompt),
        messages: [newUserMessage]
      };
      setConversations(prev => [newConversation, ...prev]);
      setActiveConversationId(sessionId);
    } else {
      sessionId = activeConversationId;
      setConversations(prev =>
        prev.map(c =>
          c.id === sessionId ? { ...c, messages: [...c.messages, newUserMessage] } : c
        )
      );
    }
    setPrompt("");

    const processStream = async (url: string, payload: any, abortController: AbortController) => {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: abortController.signal
        });
        if (!response.ok || !response.body) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        const markdownBuffer = { value: "" };
        const messageId = { value: null as string | null };
        let doneReading = false;
        while (!doneReading) {
          const { value, done } = await reader.read();
          doneReading = done;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            handleStreamLine(line, sessionId, setConversations, markdownBuffer, messageId);
          }
        }
        if (markdownBuffer.value.trim()) {
          const agentMessage: AnyMessage = {
            id: messageId.value ?? `msg_agent_${Date.now()}`,
            role: "assistant",
            type: "text",
            content: markdownBuffer.value.trim(),
            name: "Agent",
            avatarUrl: "",
            createdAt: new Date().toISOString()
          };
          setConversations(prev => addAgentMessageToConversations(prev, sessionId, agentMessage));
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Stream error:", err);
          toast({
            variant: "destructive",
            title: "Error",
            description: err.message || "An unknown error occurred."
          });
        }
      } finally {
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    };
    startTransition(() => {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const url = `http://localhost:3001/agent/execute`;
      const payload = {
        prompt: currentPrompt,
        model: "gpt-4",
        sessionId
      };
      processStream(url, payload, abortController);
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
    activeConversation
  };
};
