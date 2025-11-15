/**
 * Agent Event Stream Handler
 * Processes backend event stream and updates conversation state
 * 
 * IMPORTANT: All handlers use functional state updates to avoid stale closure issues
 */

import type { AgentEvent } from './agent-events';
import type { AnyMessage, Conversation } from './types';

export type EventHandlerState = {
  conversationId: string;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
};

/**
 * Handle RUN_STARTED event - show loading message
 */
export function handleRunStartedEvent(
  event: AgentEvent,
  state: EventHandlerState
): void {
  if (event.type !== 'RUN_STARTED') return;

  const loadingMessage: AnyMessage = {
    id: `loading-${event.data.sessionId}`,
    role: 'assistant',
    type: 'loading',
    content: 'Agent is thinking...',
  };

  state.setConversations((prev) =>
    prev.map((c) =>
      c.id === state.conversationId
        ? { ...c, messages: [...c.messages, loadingMessage] }
        : c
    )
  );
}

/**
 * Handle TEXT_MESSAGE_CONTENT event - update/create agent message
 */
export function handleTextMessageContentEvent(
  event: AgentEvent,
  state: EventHandlerState
): void {
  if (event.type !== 'TEXT_MESSAGE_CONTENT') return;

  const { messageId, delta } = event.data;

  state.setConversations((prev) =>
    prev.map((c) => {
      if (c.id !== state.conversationId) return c;

      // Remove loading message if present
      let messages = c.messages.filter((m) => m.type !== 'loading');

      // Find last agent message bubble
      const lastAgentIdx = messages.length - 1;
      if (
        lastAgentIdx >= 0 &&
        messages[lastAgentIdx].role === 'assistant' &&
        messages[lastAgentIdx].type === 'text'
      ) {
        // Append delta to last agent message bubble
        const prevContent = messages[lastAgentIdx].content || '';
        const newContent = prevContent + (delta || '');
        console.debug('[Agent Stream] Appending delta:', { delta, prevContent, newContent });
        messages = messages.map((m, idx) =>
          idx === lastAgentIdx && m.type === 'text'
            ? { ...m, content: newContent, isStreaming: true }
            : m
        );
      } else {
        // Create new agent message bubble with first delta
        console.debug('[Agent Stream] Creating new agent bubble with delta:', { delta });
        messages.push({
          id: messageId,
          role: 'assistant',
          type: 'text',
          content: delta || '',
          isStreaming: true,
        });
      }

      return { ...c, messages };
    })
  );
}

/**
 * Handle TOOL_CALL_START event - show tool call started
 */
export function handleToolCallStartEvent(
  event: AgentEvent,
  state: EventHandlerState
): void {
  if (event.type !== 'TOOL_CALL_START') return;

  const { toolCallId, tool } = event.data;

  const toolMessage: AnyMessage = {
    id: toolCallId,
    role: 'assistant',
    type: 'tool-call',
    toolName: tool,
    toolCallId,
    status: 'started',
    result: null,
    isStreaming: true,
  };

  state.setConversations((prev) =>
    prev.map((c) =>
      c.id === state.conversationId
        ? { ...c, messages: [...c.messages, toolMessage] }
        : c
    )
  );
}

/**
 * Handle TOOL_COMPLETE event - update tool call status
 */
export function handleToolCompleteEvent(
  event: AgentEvent,
  state: EventHandlerState
): void {
  if (event.type !== 'TOOL_COMPLETE') return;

  const { toolCallId, duration, status, output } = event.data;

  state.setConversations((prev) =>
    prev.map((c) => {
      if (c.id !== state.conversationId) return c;

      const messages = c.messages.map((m) => {
        if (m.type === 'tool-call' && m.toolCallId === toolCallId) {
          return {
            ...m,
            status: 'ended' as const,
            result: output || `Completed (${status})`,
            duration,
            isStreaming: false,
          };
        }
        return m;
      });

      return { ...c, messages };
    })
  );
}

/**
 * Handle CONTEXT event - show context message
 */
export function handleContextEvent(
  event: AgentEvent,
  state: EventHandlerState
): void {
  if (event.type !== 'CONTEXT') return;

  const { context, source } = event.data;

  const contextMessage: AnyMessage = {
    id: `context-${Date.now()}`,
    role: 'assistant',
    type: 'context',
    content: context,
    source,
  };

  state.setConversations((prev) =>
    prev.map((c) =>
      c.id === state.conversationId
        ? { ...c, messages: [...c.messages, contextMessage] }
        : c
    )
  );
}

/**
 * Handle RUN_FINISHED event - finalize agent message
 */
export function handleRunFinishedEvent(
  event: AgentEvent,
  state: EventHandlerState
): void {
  if (event.type !== 'RUN_FINISHED') return;

  const { output } = event.data;

  state.setConversations((prev) =>
    prev.map((c) => {
      if (c.id !== state.conversationId) return c;

      // Remove loading message if present
      let messages = c.messages.filter((m) => m.type !== 'loading');

      // Finalize all streaming messages
      messages = messages.map((m) => {
        if (m.role === 'assistant' && 'isStreaming' in m && m.isStreaming) {
          if (m.type === 'text') {
            return {
              ...m,
              content: output,
              isStreaming: false,
            };
          }
          return {
            ...m,
            isStreaming: false,
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
      if (c.id !== state.conversationId) return c;

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
      if (c.id !== state.conversationId) return c;

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
