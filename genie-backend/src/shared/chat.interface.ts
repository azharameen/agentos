/**
 * Agent chat interfaces
 * Used for conversational code understanding and generation
 */

import { BaseMessage } from "@langchain/core/messages";
import { FileChange, PreviewResult } from "./code-ops.interface";
import { FileAnalysis } from "./analysis.interface";

export interface ChatMessage {
  role: "user" | "agent" | "system";
  content: string;
  metadata?: ChatMessageMetadata;
  timestamp: Date;
}

export interface ChatMessageMetadata {
  projectName?: string;
  conversationId?: string;
  toolCalls?: string[];
  references?: AnalysisReference[];
}

export interface ChatResponse {
  message: ChatMessage;
  suggestedActions?: SuggestedAction[];
  codeSnippets?: CodeSnippet[];
  references?: AnalysisReference[];
  followUpQuestions?: string[];
}

export interface SuggestedAction {
  id: string;
  type: ActionType;
  description: string;
  changes?: FileChange[];
  preview?: PreviewResult;
  canExecute: boolean;
}

export enum ActionType {
  CODE_GENERATION = "code_generation",
  CODE_MODIFICATION = "code_modification",
  CODE_REFACTORING = "code_refactoring",
  FILE_CREATION = "file_creation",
  FILE_DELETION = "file_deletion",
  ANALYSIS = "analysis",
  EXPLANATION = "explanation",
}

export interface CodeSnippet {
  language: string;
  code: string;
  description?: string;
  filePath?: string;
  startLine?: number;
  endLine?: number;
}

export interface AnalysisReference {
  type: ReferenceType;
  path: string;
  name?: string;
  description?: string;
  analysis?: Partial<FileAnalysis>;
}

export enum ReferenceType {
  FILE = "file",
  MODULE = "module",
  SYMBOL = "symbol",
  DOCUMENTATION = "documentation",
  DEPENDENCY = "dependency",
}

export interface ConversationContext {
  conversationId: string;
  projectName: string;
  messages: BaseMessage[];
  activeAnalysis?: FileAnalysis[];
  pendingChanges?: FileChange[];
  createdAt: Date;
  lastUpdated: Date;
}
