export type Message = {
  id: string;
  role: 'user' | 'assistant';
  type: 'text';
  content: string;
  isStreaming?: boolean;
  name?: string;
  avatarUrl?: string;
  createdAt?: string;
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

export type AnyMessage = Message | ToolCallMessage | ContextMessage | LoadingMessage | ErrorMessage;

export type Conversation = {
  id: string;
  summary: string;
  messages: AnyMessage[];
};
