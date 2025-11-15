/**
 * Frontend Agent Event Types
 * Mirrors backend event protocol for type-safe event handling
 */

export interface RunStartedEvent {
  type: 'RUN_STARTED';
  data: {
    sessionId: string;
    prompt: string;
    model?: string;
    timestamp: number;
  };
}

export interface TextMessageContentEvent {
  type: 'TEXT_MESSAGE_CONTENT';
  data: {
    messageId: string;
    delta: string;
    content: string;
  };
}

export interface ToolCallStartEvent {
  type: 'TOOL_CALL_START';
  data: {
    toolCallId: string;
    tool: string;
    input: any;
    timestamp: number;
  };
}

export interface ToolCompleteEvent {
  type: 'TOOL_COMPLETE';
  data: {
    toolCallId: string;
    tool: string;
    duration: number;
    status: 'success' | 'error';
    output?: string;
    error?: string;
  };
}

export interface ContextEvent {
  type: 'CONTEXT';
  data: {
    context: string;
    source?: string;
  };
}

export interface RunFinishedEvent {
  type: 'RUN_FINISHED';
  data: {
    output: string;
    toolsUsed: string[];
    sessionId: string;
    executionTime?: number;
  };
}

export interface RunCancelledEvent {
  type: 'RUN_CANCELLED';
  data: {
    message: string;
    sessionId?: string;
  };
}

export interface RunErrorEvent {
  type: 'RUN_ERROR';
  data: {
    error: string;
    sessionId?: string;
  };
}

export type AgentEvent =
  | RunStartedEvent
  | TextMessageContentEvent
  | ToolCallStartEvent
  | ToolCompleteEvent
  | ContextEvent
  | RunFinishedEvent
  | RunCancelledEvent
  | RunErrorEvent;

export function isAgentEvent(obj: any): obj is AgentEvent {
  return (
    obj &&
    typeof obj === 'object' &&
    'type' in obj &&
    'data' in obj &&
    [
      'RUN_STARTED',
      'TEXT_MESSAGE_CONTENT',
      'TOOL_CALL_START',
      'TOOL_COMPLETE',
      'CONTEXT',
      'RUN_FINISHED',
      'RUN_CANCELLED',
      'RUN_ERROR',
    ].includes(obj.type)
  );
}
