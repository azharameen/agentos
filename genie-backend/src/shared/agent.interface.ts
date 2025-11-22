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
  model?: string;
  sessionId: string;
  executionTime?: number;
  success?: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface AgentExecutionOptions {
  model?: string;
  agent?: string;
  temperature?: number;
  maxIterations?: number;
  enabledToolCategories?: string[];
  specificTools?: string[];
  useGraph?: boolean; // Use LangGraph workflow instead of LangChain agent
  enableRAG?: boolean; // Enable RAG context retrieval
  signal?: AbortSignal; // AbortSignal for cancellation support
  workflowVersion?: string; // Workflow version for LangGraph
}
