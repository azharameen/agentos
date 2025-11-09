/**
 * @fileoverview This file defines the data structures (the "contract") 
 * that are shared between the frontend and the backend, based on swagger.json.
 * By using these shared types, we ensure that the API requests and responses
 * are consistent.
 */

// Based on: /agent/stream endpoint in swagger.json

/**
 * Represents a single event in the agent's streaming response.
 * The `type` field indicates the kind of event, and `data` holds the payload.
 */
export type AgentStreamEvent =
  | {
      type: 'TEXT_MESSAGE_CONTENT';
      data: {
        delta: string; // The chunk of text
      };
    }
  | {
      type: 'RUN_STARTED';
      data: {}; // Signals the agent is processing the request
    }
  | {
      type: 'RUN_FINISHED';
      data: {}; // No data, just signals the end
    }
  | {
      type: 'RUN_ERROR';
      data: {
        error: string; // Error message
      };
    }
  | {
      type: 'TOOL_CALL_START';
      data: {
        name: string; // The name of the tool being called
      };
    }
  | {
      type: 'TOOL_CALL_END';
      data: {
        name: string; // The name of the tool that finished
        result: string; // The result of the tool call
      };
    };
