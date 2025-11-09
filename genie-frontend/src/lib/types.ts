export type Message = {
  id: string;
  role: 'user' | 'assistant';
  type: 'text';
  content: string;
  isStreaming?: boolean;
  name?: string;
  avatarUrl?: string;
};

export type ToolCallMessage = {
  id: string;
  role: 'assistant';
  type: 'tool-call';
  toolName: string;
  status: 'started' | 'ended';
  result: string | null;
  isStreaming?: boolean; // A tool "stream" is just its execution time
};

export type AnyMessage = Message | ToolCallMessage;

export type Conversation = {
  id: string;
  summary: string;
  messages: AnyMessage[];
};
