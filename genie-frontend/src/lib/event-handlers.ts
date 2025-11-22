/**
 * Agent Event Stream Handler (GitHub Copilot Style)
 * Processes backend event stream and updates conversation state
 * 
 * NEW: Builds single streaming message with inline content blocks
 * - Text content appends to last text block
 * - Tool calls insert as inline blocks
 * - Tool completions update existing blocks
 * 
 * IMPORTANT: All handlers use functional state updates to avoid stale closure issues
 */

import type { AgentEvent } from './agent-events';
import type { AnyMessage, Conversation, StreamingMessage, ContentBlock, TextBlock, ToolCallBlock } from './types';

export type EventHandlerState = {
  sessionId: string;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
};

/**
 * Helper: Get or create streaming message
 */
function getOrCreateStreamingMessage(
  messages: AnyMessage[],
  sessionId: string
): { messages: AnyMessage[]; streamingMsg: StreamingMessage } {
  // Find last message
  const lastMsg = messages[messages.length - 1];

  // If last message is streaming, return it
  if (lastMsg && lastMsg.role === 'assistant' && lastMsg.type === 'streaming') {
    return {
      messages,
      streamingMsg: lastMsg as StreamingMessage
    };
  }

  // Create new streaming message
  const newStreamingMsg: StreamingMessage = {
    id: `streaming-${sessionId}-${Date.now()}`,
    role: 'assistant',
    type: 'streaming',
    contentBlocks: [],
    isStreaming: true,
    createdAt: new Date().toISOString()
  };

  return {
    messages: [...messages, newStreamingMsg],
    streamingMsg: newStreamingMsg
  };
}

/**
 * Handle RUN_STARTED event - create or reset streaming message
 */
export function handleRunStartedEvent(
  event: AgentEvent,
  state: EventHandlerState
): void {
  if (event.type !== 'RUN_STARTED') return;

  state.setConversations((prev) =>
    prev.map((c) => {
      if (c.id !== state.sessionId) return c;

      // Remove loading messages and create new streaming message
      const filtered = c.messages.filter((m) => m.type !== 'loading');
      const streamingMsg: StreamingMessage = {
        id: `streaming-${state.sessionId}-${Date.now()}`,
        role: 'assistant',
        type: 'streaming',
        contentBlocks: [],
        isStreaming: true,
        createdAt: new Date().toISOString()
      };

      return { ...c, messages: [...filtered, streamingMsg] };
    })
  );
}

/**
 * Handle TEXT_MESSAGE_CONTENT event - append text to streaming message
 */
export function handleTextMessageContentEvent(
  event: AgentEvent,
  state: EventHandlerState
): void {
  if (event.type !== 'TEXT_MESSAGE_CONTENT') return;

  const { delta } = event.data;

  state.setConversations((prev) =>
    prev.map((c) => {
      if (c.id !== state.sessionId) return c;

      // Get or create streaming message
      const { messages: baseMessages, streamingMsg } = getOrCreateStreamingMessage(c.messages, state.sessionId);

      // Get last content block
      const lastBlock = streamingMsg.contentBlocks[streamingMsg.contentBlocks.length - 1];

      // If last block is text, append delta to it
      if (lastBlock && lastBlock.type === 'text') {
        const updatedBlocks = [
          ...streamingMsg.contentBlocks.slice(0, -1),
          {
            ...lastBlock,
            content: lastBlock.content + (delta || '')
          }
        ];

        const updatedMsg: StreamingMessage = {
          ...streamingMsg,
          contentBlocks: updatedBlocks
        };

        return {
          ...c,
          messages: baseMessages.map(m => m.id === streamingMsg.id ? updatedMsg : m)
        };
      } else {
        // Create new text block
        const newTextBlock: TextBlock = {
          type: 'text',
          content: delta || ''
        };

        const updatedMsg: StreamingMessage = {
          ...streamingMsg,
          contentBlocks: [...streamingMsg.contentBlocks, newTextBlock]
        };

        return {
          ...c,
          messages: baseMessages.map(m => m.id === streamingMsg.id ? updatedMsg : m)
        };
      }
    })
  );
}

/**
 * Handle TOOL_CALL_START event - add tool call block inline
 */
export function handleToolCallStartEvent(
  event: AgentEvent,
  state: EventHandlerState
): void {
  if (event.type !== 'TOOL_CALL_START') return;

  const { toolCallId, tool, input } = event.data;

  state.setConversations((prev) =>
    prev.map((c) => {
      if (c.id !== state.sessionId) return c;

      // Get or create streaming message
      const { messages: baseMessages, streamingMsg } = getOrCreateStreamingMessage(c.messages, state.sessionId);

      // Add tool call block
      const toolBlock: ToolCallBlock = {
        type: 'tool-call',
        toolName: tool,
        toolCallId,
        status: 'started',
        input,
        result: null
      };

      const updatedMsg: StreamingMessage = {
        ...streamingMsg,
        contentBlocks: [...streamingMsg.contentBlocks, toolBlock]
      };

      return {
        ...c,
        messages: baseMessages.map(m => m.id === streamingMsg.id ? updatedMsg : m)
      };
    })
  );
}

/**
 * Handle TOOL_COMPLETE event - update tool call block status
 */
export function handleToolCompleteEvent(
  event: AgentEvent,
  state: EventHandlerState
): void {
  if (event.type !== 'TOOL_COMPLETE') return;

  const { toolCallId, duration, status, output } = event.data;

  state.setConversations((prev) =>
    prev.map((c) => {
      if (c.id !== state.sessionId) return c;

      // Find streaming message and update tool block
      const messages = c.messages.map((m) => {
        if (m.role === 'assistant' && m.type === 'streaming') {
          const streamingMsg = m as StreamingMessage;
          const updatedBlocks = streamingMsg.contentBlocks.map((block) => {
            if (block.type === 'tool-call' && block.toolCallId === toolCallId) {
              return {
                ...block,
                status: 'completed' as const,
                result: output || `Completed (${status})`,
                duration
              };
            }
            return block;
          });

          return {
            ...streamingMsg,
            contentBlocks: updatedBlocks
          };
        }
        return m;
      });

      return { ...c, messages };
    })
  );
}

/**
 * Handle CONTEXT event - add context block inline
 */
export function handleContextEvent(
  event: AgentEvent,
  state: EventHandlerState
): void {
  if (event.type !== 'CONTEXT') return;

  const { context, source } = event.data;

  state.setConversations((prev) =>
    prev.map((c) => {
      if (c.id !== state.sessionId) return c;

      // Get or create streaming message
      const { messages: baseMessages, streamingMsg } = getOrCreateStreamingMessage(c.messages, state.sessionId);

      // Add context block at the beginning
      const contextBlock: ContentBlock = {
        type: 'context',
        content: context,
        source
      };

      const updatedMsg: StreamingMessage = {
        ...streamingMsg,
        contentBlocks: [contextBlock, ...streamingMsg.contentBlocks]
      };

      return {
        ...c,
        messages: baseMessages.map(m => m.id === streamingMsg.id ? updatedMsg : m)
      };
    })
  );
}

/**
 * Handle RUN_FINISHED event - finalize streaming message
 */
export function handleRunFinishedEvent(
  event: AgentEvent,
  state: EventHandlerState
): void {
  if (event.type !== 'RUN_FINISHED') return;

  state.setConversations((prev) =>
    prev.map((c) => {
      if (c.id !== state.sessionId) return c;

      // Remove loading message and finalize streaming messages
      const messages = c.messages
        .filter((m) => m.type !== 'loading')
        .map((m) => {
          if (m.role === 'assistant' && m.type === 'streaming') {
            return {
              ...m,
              isStreaming: false
            };
          }
          return m;
        });

      return { ...c, messages };
    })
  );
}

/**
 * Handle RUN_ERROR event - show error message
 */
export function handleRunErrorEvent(
  event: AgentEvent,
  state: EventHandlerState
): void {
  if (event.type !== 'RUN_ERROR') return;

  const { error } = event.data;

  const errorMessage: AnyMessage = {
    id: `error-${Date.now()}`,
    role: 'assistant',
    type: 'error',
    content: error,
  };

  state.setConversations((prev) =>
    prev.map((c) => {
      if (c.id !== state.sessionId) return c;

      // Remove loading message and add error
      const messages = c.messages.filter((m) => m.type !== 'loading');
      messages.push(errorMessage);

      return { ...c, messages };
    })
  );
}

/**
 * Handle RUN_CANCELLED event - show cancelled message
 */
export function handleRunCancelledEvent(
  event: AgentEvent,
  state: EventHandlerState
): void {
  if (event.type !== 'RUN_CANCELLED') return;

  const { message } = event.data;

  const errorMessage: AnyMessage = {
    id: `cancelled-${Date.now()}`,
    role: 'assistant',
    type: 'error',
    content: message,
  };

  state.setConversations((prev) =>
    prev.map((c) => {
      if (c.id !== state.sessionId) return c;

      // Remove loading message and add cancelled message
      const messages = c.messages.filter((m) => m.type !== 'loading');
      messages.push(errorMessage);

      return { ...c, messages };
    })
  );
}

/**
 * Main event handler dispatcher
 */
export function handleAgentEvent(
  event: AgentEvent,
  state: EventHandlerState
): void {
  switch (event.type) {
    case 'RUN_STARTED':
      handleRunStartedEvent(event, state);
      break;
    case 'TEXT_MESSAGE_CONTENT':
      handleTextMessageContentEvent(event, state);
      break;
    case 'TOOL_CALL_START':
      handleToolCallStartEvent(event, state);
      break;
    case 'TOOL_COMPLETE':
      handleToolCompleteEvent(event, state);
      break;
    case 'CONTEXT':
      handleContextEvent(event, state);
      break;
    case 'RUN_FINISHED':
      handleRunFinishedEvent(event, state);
      break;
    case 'RUN_ERROR':
      handleRunErrorEvent(event, state);
      break;
    case 'RUN_CANCELLED':
      handleRunCancelledEvent(event, state);
      break;
    default:
      console.warn('Unknown event type:', event);
  }
}
