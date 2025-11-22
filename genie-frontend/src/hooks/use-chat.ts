"use client";

import { useTransition, useRef, useEffect, useCallback } from "react";
import type { AnyMessage, Conversation } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { handleAgentEvent } from "@/lib/event-handlers";
import { validateMessage } from "@/lib/validation";
import { useChatStore } from "@/store/chat-store";
import { sessionManager } from "@/lib/session-manager";

// Helper to update messages for handleStop
function getStoppedMessages(messages: AnyMessage[]): AnyMessage[] {
  return messages
    .filter(m => m.type !== "loading")
    .map(m => {
      if (m.type === 'text' || m.type === 'tool-call') {
        if ('isStreaming' in m && m.isStreaming) {
          return { ...m, isStreaming: false };
        }
      }
      return m;
    });
}

function getSummaryForPrompt(text: string): string {
  if (text.length < 40) {
    return text;
  }
  return text.split(" ").slice(0, 5).join(" ") + "...";
}

/**
 * REFACTORED: Now uses Zustand store instead of local state
 * Eliminates prop drilling and centralizes state management
 */
export const useChat = () => {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentSessionRef = useRef<string | null>(null);

  // Zustand store
  const {
    conversations,
    activeConversationId,
    prompt,
    setConversations,
    setActiveConversationId,
    setPrompt,
    getActiveConversation,
    addMessage,
    createConversation,
    deleteConversation,
    renameConversation,
    clearAllConversations,
    loadConversations,
    selectedModel,
    selectedAgent,
    selectedTools
  } = useChatStore();

  // Load conversations on mount
  useEffect(() => {
    loadConversations();

    // Cleanup abort controller on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [loadConversations]);

  // Abort stream when switching sessions
  useEffect(() => {
    if (activeConversationId && currentSessionRef.current && activeConversationId !== currentSessionRef.current) {
      handleStop();
    }
  }, [activeConversationId]);

  const activeConversation = getActiveConversation();

  const handleNewChat = useCallback(() => {
    createConversation("New Agentic Chat");
    setPrompt("");
  }, [createConversation, setPrompt]);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (activeConversationId) {
      const conversation = conversations.find(c => c.id === activeConversationId);
      if (conversation) {
        const stoppedMessages = getStoppedMessages(conversation.messages);
        setConversations(
          conversations.map(c =>
            c.id === activeConversationId ? { ...c, messages: stoppedMessages } : c
          )
        );
      }
    }
  }, [activeConversationId, conversations, setConversations]);

  const handleSubmit = useCallback((customPrompt?: string) => {
    const currentPrompt = customPrompt || prompt;

    // Validate input
    const validation = validateMessage(currentPrompt);
    if (!validation.isValid) {
      toast({
        variant: "destructive",
        title: "Invalid Input",
        description: validation.error || "Please check your message"
      });
      return;
    }

    if (isPending) return;

    // Use sanitized input
    const sanitizedPrompt = validation.sanitized!;

    // Abort any existing stream
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
      content: sanitizedPrompt,
      name: user.name,
      avatarUrl: user.avatarUrl,
      createdAt: new Date().toISOString()
    };

    if (!activeConversationId || !conversations.some(c => c.id === activeConversationId)) {
      // Create new conversation with user message
      const newConversation = sessionManager.createSession(getSummaryForPrompt(sanitizedPrompt));
      newConversation.messages.push(newUserMessage);
      sessionId = newConversation.id;
      setConversations((prev: Conversation[]) => [newConversation, ...prev]);
      setActiveConversationId(sessionId);
    } else {
      // Add message to existing conversation
      sessionId = activeConversationId;
      addMessage(sessionId, newUserMessage);
    }
    setPrompt("");

    const processStream = async (url: string, payload: any, abortController: AbortController) => {
      // Add timeout
      const timeoutMs = Number.parseInt(process.env.NEXT_PUBLIC_REQUEST_TIMEOUT_MS || '30000', 10);
      const timeoutId = setTimeout(() => {
        abortController.abort();
        toast({
          variant: "destructive",
          title: "Request Timeout",
          description: "The request took too long to complete. Please try again."
        });
      }, timeoutMs);

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: abortController.signal
        });

        clearTimeout(timeoutId);
        if (!response.ok || !response.body) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let doneReading = false;

        while (!doneReading) {
          const { value, done } = await reader.read();
          doneReading = done;

          if (value) {
            buffer += decoder.decode(value, { stream: true });
          }

          // Process buffer line by line
          let newlineIndex;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);

            if (!line) continue;

            try {
              const event = JSON.parse(line);
              handleAgentEvent(event, { sessionId: sessionId!, setConversations });
            } catch (err) {
              console.warn("Failed to parse event:", line, err);
              // If parsing fails, it might be a partial line that got flushed? 
              // But we split by newline, so it should be a complete line.
              // Unless the JSON itself contains newlines (which NDJSON shouldn't have outside strings).
            }
          }
        }

        // Process any remaining buffer if it's a valid JSON
        if (buffer.trim()) {
          try {
            const event = JSON.parse(buffer.trim());
            handleAgentEvent(event, { sessionId: sessionId!, setConversations });
          } catch (err) {
            // Ignore incomplete end
          }
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
      currentSessionRef.current = sessionId;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const url = `${apiUrl}/agent/execute`;
      const payload = {
        prompt: sanitizedPrompt,
        model: selectedModel,
        agent: selectedAgent,
        specificTools: selectedTools && selectedTools.length > 0 ? selectedTools : undefined,
        sessionId
      };
      processStream(url, payload, abortController);
    });
  }, [prompt, isPending, activeConversationId, conversations, handleStop, toast, addMessage, setConversations, setActiveConversationId, selectedModel, selectedAgent, selectedTools]);

  const handleDeleteSession = useCallback((sessionId: string) => {
    deleteConversation(sessionId);
  }, [deleteConversation]);

  const handleRenameSession = useCallback((sessionId: string, newSummary: string) => {
    renameConversation(sessionId, newSummary);
  }, [renameConversation]);

  const handleClearAllSessions = useCallback(() => {
    clearAllConversations();
  }, [clearAllConversations]);

  const handleReload = useCallback(() => {
    if (!activeConversationId) return;

    const conversation = conversations.find(c => c.id === activeConversationId);
    if (!conversation) return;

    // Find last user message
    const lastUserMessage = [...conversation.messages].reverse().find(m => m.role === "user");
    if (lastUserMessage && lastUserMessage.content) {
      // Remove any subsequent assistant messages (including error/streaming)
      const userMsgIndex = conversation.messages.findIndex(m => m.id === lastUserMessage.id);
      if (userMsgIndex !== -1) {
        const newMessages = conversation.messages.slice(0, userMsgIndex + 1);
        setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, messages: newMessages } : c));

        // Resubmit
        handleSubmit(lastUserMessage.content as string);
      }
    }
  }, [activeConversationId, conversations, handleSubmit, setConversations]);

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
    handleReload,
    activeConversation,
    handleDeleteSession,
    handleRenameSession,
    handleClearAllSessions,
    selectedModel: useChatStore((state) => state.selectedModel),
    setSelectedModel: useChatStore((state) => state.setSelectedModel),
    selectedAgent: useChatStore((state) => state.selectedAgent),
    setSelectedAgent: useChatStore((state) => state.setSelectedAgent),
    selectedTools: useChatStore((state) => state.selectedTools),
    setSelectedTools: useChatStore((state) => state.setSelectedTools),
  };
};
