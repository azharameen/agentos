// Content block types for inline streaming
export type TextBlock = {
  type: 'text';
  content: string;
};

export type ToolCallBlock = {
  type: 'tool-call';
  toolName: string;
  toolCallId: string;
  status: 'started' | 'running' | 'completed' | 'error';
  input?: any;
  result?: string | null;
  duration?: number;
};

export type ContextBlock = {
  type: 'context';
  content: string;
  source?: string;
};

export type ContentBlock = TextBlock | ToolCallBlock | ContextBlock;

// New streaming message structure (GitHub Copilot style)
export type StreamingMessage = {
  id: string;
  role: 'assistant';
  type: 'streaming';
  contentBlocks: ContentBlock[];
  isStreaming?: boolean;
  createdAt?: string;
};

// Legacy message types (for backward compatibility)
export type Message = {
  id: string;
  role: 'user' | 'assistant';
  type: 'text';
  content: string;
  isStreaming?: boolean;
  name?: string;
  avatarUrl?: string;
  createdAt?: string;
  suggestedActions?: Array<{
    id: string;
    type: string;
    description: string;
    canExecute: boolean;
  }>;
  references?: Array<{
    type: string;
    path: string;
    name?: string;
  }>;
};

export type ToolCallMessage = {
  id: string;
  role: 'assistant';
  type: 'tool-call';
  toolName: string;
  toolCallId: string;
  status: 'started' | 'ended';
  result: string | null;
  duration?: number;
  isStreaming?: boolean;
};

export type ContextMessage = {
  id: string;
  role: 'assistant';
  type: 'context';
  content: string;
  source?: string;
};

export type LoadingMessage = {
  id: string;
  role: 'assistant';
  type: 'loading';
  content: string;
};

export type ErrorMessage = {
  id: string;
  role: 'assistant';
  type: 'error';
  content: string;
};

export type AnyMessage = Message | StreamingMessage | ToolCallMessage | ContextMessage | LoadingMessage | ErrorMessage;

export type Conversation = {
  id: string;
  summary: string;
  messages: AnyMessage[];
};
