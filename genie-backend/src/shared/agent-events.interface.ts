/**
 * Agent Event Protocol Interface
 * Defines all event types emitted during agentic workflow execution
 * Used for streaming responses to frontend clients
 */

/**
 * Event emitted when agent workflow starts
 */
export interface RunStartedEvent {
  type: "RUN_STARTED";
  data: {
    sessionId: string;
    prompt: string;
    model?: string;
    timestamp: number;
  };
}

/**
 * Event emitted for each token/chunk of agent response
 */
export interface TextMessageContentEvent {
  type: "TEXT_MESSAGE_CONTENT";
  data: {
    messageId: string;
    delta: string;
    content: string;
  };
}

/**
 * Event emitted when a tool call starts
 */
export interface ToolCallStartEvent {
  type: "TOOL_CALL_START";
  data: {
    toolCallId: string;
    tool: string;
    input: any;
    timestamp: number;
  };
}

/**
 * Event emitted when a tool call completes
 */
export interface ToolCompleteEvent {
  type: "TOOL_COMPLETE";
  data: {
    toolCallId: string;
    tool: string;
    duration: number;
    status: "success" | "error";
    output?: string;
    error?: string;
  };
}

/**
 * Event emitted when RAG context is retrieved
 */
export interface ContextEvent {
  type: "CONTEXT";
  data: {
    context: string;
    source?: string;
  };
}

/**
 * Event emitted when agent workflow completes successfully
 */
export interface RunFinishedEvent {
  type: "RUN_FINISHED";
  data: {
    output: string;
    toolsUsed: string[];
    sessionId: string;
    executionTime?: number;
  };
}

/**
 * Event emitted when agent workflow is cancelled
 */
export interface RunCancelledEvent {
  type: "RUN_CANCELLED";
  data: {
    message: string;
    sessionId?: string;
  };
}

/**
 * Event emitted when an error occurs
 */
export interface RunErrorEvent {
  type: "RUN_ERROR";
  data: {
    error: string;
    sessionId?: string;
  };
}

/**
 * Union type of all agent events
 */
export type AgentEvent =
  | RunStartedEvent
  | TextMessageContentEvent
  | ToolCallStartEvent
  | ToolCompleteEvent
  | ContextEvent
  | RunFinishedEvent
  | RunCancelledEvent
  | RunErrorEvent;

/**
 * Type guard to check if an object is a valid agent event
 */
export function isAgentEvent(obj: any): obj is AgentEvent {
  return (
    obj &&
    typeof obj === "object" &&
    "type" in obj &&
    "data" in obj &&
    [
      "RUN_STARTED",
      "TEXT_MESSAGE_CONTENT",
      "TOOL_CALL_START",
      "TOOL_COMPLETE",
      "CONTEXT",
      "RUN_FINISHED",
      "RUN_CANCELLED",
      "RUN_ERROR",
    ].includes(obj.type)
  );
}
