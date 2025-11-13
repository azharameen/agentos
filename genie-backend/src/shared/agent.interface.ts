import { BaseMessage } from "@langchain/core/messages";

export interface SessionMemory {
  sessionId: string;
  conversationHistory: BaseMessage[];
  context: Record<string, any>;
  createdAt: Date;
  lastAccessedAt: Date;
}

export interface LongTermMemoryEntry {
  id: string;
  content: string;
  metadata: Record<string, any>;
  embedding?: number[];
  createdAt: Date;
}

export interface AgentExecutionResult {
  output: string;
  intermediateSteps?: any[];
  toolsUsed?: string[];
  model: string;
  sessionId: string;
}

export interface AgentExecutionOptions {
  model?: string;
  temperature?: number;
  maxIterations?: number;
  enabledToolCategories?: string[];
  specificTools?: string[];
  useGraph?: boolean; // Use LangGraph workflow instead of LangChain agent
  enableRAG?: boolean; // Enable RAG context retrieval
  signal?: AbortSignal; // AbortSignal for cancellation support
}
