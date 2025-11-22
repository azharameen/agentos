import { Injectable, Logger } from "@nestjs/common";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import { AzureChatOpenAI } from "@langchain/openai";
import { AgentExecutionResult } from "../../shared/agent.interface";
import {
  RunCancelledEvent,
  ToolCallStartEvent,
  ToolCompleteEvent,
  TextMessageContentEvent,
  RunFinishedEvent,
  RunErrorEvent,
} from "../../shared/agent-events.interface";

// LangChain v1 migration: Using createAgent from "langchain" package
// This replaces the deprecated createReactAgent from @langchain/langgraph/prebuilt
import { createAgent } from "langchain";

/**
 * LangChain Agent Service (v1)
 * Implements true agentic AI using LangChain v1's createAgent with LangGraph runtime
 *
 * Features:
 * - Function/tool calling with Azure OpenAI
 * - Dynamic tool selection and execution via ReAct pattern
 * - Multi-step reasoning with intermediate steps tracking
 * - External memory management (conversation history passed as messages)
 * - Streaming support with token batching and event emission
 * - Cancellation support via AbortSignal
 *
 * Architecture:
 * - Uses LangChain v1's createAgent (replaces deprecated createReactAgent)
 * - Built on LangGraph runtime for durable execution and streaming
 * - Memory is managed externally by AgentMemoryService (not built-in)
 * - Supports tool error handling, retries, and observability
 *
 * Migration from createReactAgent (completed):
 * ✅ Replaced createReactAgent with createAgent from "langchain" package
 * ✅ Parameter renamed: prompt → systemPrompt
 * ✅ Memory management moved to external service (passed as messages)
 * ✅ Streaming uses agent.stream() with streamMode: "messages"
 * ✅ Session/thread management via config.configurable.thread_id
 */
@Injectable()
export class LangChainAgentService {
  private readonly logger = new Logger(LangChainAgentService.name);

  /**
   * Execute agent with tools using LangChain v1's createAgent
   *
   * This uses LangChain's standard agent pattern built on LangGraph.
   * Benefits: Built-in error handling, streaming, and observability.
   *
   * Memory is managed externally - conversation history is passed as messages.
   */
  async execute(
    input: string,
    llm: AzureChatOpenAI,
    tools: DynamicStructuredTool[],
    conversationHistory: BaseMessage[] = [],
    maxIterations: number = 10,
    sessionId?: string,
  ): Promise<AgentExecutionResult> {
    try {
      this.logger.log(`Executing LangChain agent with ${tools.length} tools`);

      // Build system prompt
      const systemPrompt = this.getSystemPrompt(tools);

      // Create agent with LangChain v1
      const agent = createAgent({
        model: llm,
        tools,
        systemPrompt,
      });

      // Prepare messages: history + user input
      const messages: BaseMessage[] = [
        ...conversationHistory,
        new HumanMessage(input),
      ];

      // Configure agent execution
      const config = {
        configurable: {
          thread_id: sessionId || `session-${Date.now()}`,
        },
        recursionLimit: maxIterations,
      };

      // Invoke agent (LangGraph handles ReAct loop internally)
      this.logger.debug(`Invoking agent with recursion limit ${maxIterations}`);
      const result = await agent.invoke({ messages }, config);

      // Extract result information
      const outputMessages = result.messages || [];
      const lastMessage = outputMessages.at(-1);
      const output =
        typeof lastMessage?.content === "string"
          ? lastMessage.content
          : JSON.stringify(lastMessage?.content);

      // Extract intermediate steps (tool calls + observations)
      const intermediateSteps: any[] = [];
      const toolsUsed: Set<string> = new Set();

      for (const msg of outputMessages) {
        // Use tool_calls from message if available (LangChain standard)
        const toolCallsData = (msg as any).tool_calls;
        if (toolCallsData && Array.isArray(toolCallsData)) {
          for (const toolCall of toolCallsData) {
            const toolName = toolCall.name || toolCall.function?.name;
            if (toolName) {
              toolsUsed.add(toolName);
              intermediateSteps.push({
                action: {
                  tool: toolName,
                  toolInput: toolCall.args || toolCall.function?.arguments,
                },
                observation: "Tool executed (details in next message)",
              });
            }
          }
        }
      }

      this.logger.log(
        `Agent completed. Tools used: ${Array.from(toolsUsed).join(", ") || "none"}`,
      );

      return {
        output,
        intermediateSteps,
        toolsUsed: Array.from(toolsUsed),
        model: "azure-openai",
        sessionId: config.configurable.thread_id,
      };
    } catch (error: any) {
      this.logger.error(`Agent execution failed: ${error.message}`);
      this.logger.error(error.stack);
      throw new Error(`Agent execution failed: ${error.message}`);
    }
  }

  /**
   * Execute agent with streaming support
   * Yields chunks of agent execution progress and LLM tokens in real-time
   */
  async *executeStream(
    input: string,
    llm: AzureChatOpenAI,
    tools: DynamicStructuredTool[],
    conversationHistory: BaseMessage[] = [],
    maxIterations: number = 10,
    sessionId?: string,
    signal?: AbortSignal,
  ): AsyncGenerator<any, void, unknown> {
    try {
      this.logger.log(`Streaming LangChain agent with ${tools.length} tools`);

      // Check for cancellation before starting
      if (signal?.aborted) {
        this.logger.log("Agent streaming cancelled before start");
        return;
      }

      // Build system prompt
      const systemPrompt = this.getSystemPrompt(tools);

      // Create agent with LangChain v1
      const agent = createAgent({
        model: llm,
        tools,
        systemPrompt,
      });

      // Prepare messages: history + user input
      const messages: BaseMessage[] = [
        ...conversationHistory,
        new HumanMessage(input),
      ];

      // Configure agent execution
      const config = {
        configurable: {
          thread_id: sessionId || `session-${Date.now()}`,
        },
        recursionLimit: maxIterations,
      };

      // Stream agent execution using LangGraph's stream method
      this.logger.debug(
        `Streaming agent with recursion limit ${maxIterations}`,
      );

      const toolsUsed: Set<string> = new Set();
      let finalOutput = "";
      const messageCounter = 0;
      // Generate a single messageId for the entire agent response stream
      const agentMessageId = `${config.configurable.thread_id}-msg-${messageCounter}`;
      const toolCallMap = new Map<
        string,
        { name: string; input: any; startTime: number }
      >();

      // Use 'messages' stream mode to get LLM tokens
      const stream = await agent.stream(
        { messages },
        { ...config, streamMode: "messages" as any },
      );

      for await (const chunk of stream) {
        // Check for cancellation on each chunk
        if (signal?.aborted) {
          this.logger.log("Agent streaming cancelled mid-execution");
          const cancelEvent: RunCancelledEvent = {
            type: "RUN_CANCELLED",
            data: {
              message: "Stream cancelled by client",
              sessionId: config.configurable.thread_id,
            },
          };
          yield cancelEvent;
          return;
        }
        // chunk is a tuple: [message, metadata]
        if (!Array.isArray(chunk) || chunk.length < 2) continue;
        const [messageRaw] = chunk;

        // Type assertion for message
        const message = messageRaw as {
          content?: string;
          tool_calls?: Array<{
            name?: string;
            args?: unknown;
            function?: { name?: string; arguments?: unknown };
          }>;
        };

        const safeContent =
          typeof message.content === "string" ? message.content : "";

        if (safeContent.length > 0) {
          finalOutput += safeContent;

          // Yield immediately - no batching
          yield {
            type: "TEXT_MESSAGE_CONTENT",
            data: {
              messageId: agentMessageId,
              delta: safeContent,
              content: finalOutput,
            },
          };
        }

        // Track tool calls
        if (Array.isArray(message.tool_calls)) {
          for (const toolCallRaw of message.tool_calls) {
            const toolCall = toolCallRaw as {
              name?: string;
              args?: unknown;
              function?: { name?: string; arguments?: unknown };
            };
            let toolName = "";
            let toolInput: unknown = undefined;
            if (typeof toolCall.name === "string") {
              toolName = toolCall.name;
            } else if (
              toolCall.function &&
              typeof toolCall.function.name === "string"
            ) {
              toolName = toolCall.function.name;
            }
            toolInput = toolCall.args ?? toolCall.function?.arguments;
            if (toolName) {
              toolsUsed.add(toolName);

              // Generate unique tool call ID
              const toolCallId = `${config.configurable.thread_id}-tool-${Date.now()}-${toolName}`;
              const startTime = Date.now();

              // Track this tool call
              toolCallMap.set(toolCallId, {
                name: toolName,
                input: toolInput,
                startTime,
              });

              const toolStartEvent: ToolCallStartEvent = {
                type: "TOOL_CALL_START",
                data: {
                  toolCallId,
                  tool: toolName,
                  input: toolInput,
                  timestamp: startTime,
                },
              };
              yield toolStartEvent;

              // Emit completion after a brief delay (tool execution happens in LangGraph)
              // In practice, tool completion will be inferred from subsequent content
              setTimeout(() => {
                const toolCall = toolCallMap.get(toolCallId);
                if (toolCall) {
                  const duration = Date.now() - toolCall.startTime;
                  const toolCompleteEvent: ToolCompleteEvent = {
                    type: "TOOL_COMPLETE",
                    data: {
                      toolCallId,
                      tool: toolCall.name,
                      duration,
                      status: "success",
                    },
                  };
                  // Note: Can't yield from setTimeout, will be handled in next message
                }
              }, 100);
            }
          }
        }
      }

      // Emit final tool completion events for any remaining tool calls
      for (const [toolCallId, toolCall] of toolCallMap.entries()) {
        const duration = Date.now() - toolCall.startTime;
        const toolCompleteEvent: ToolCompleteEvent = {
          type: "TOOL_COMPLETE",
          data: {
            toolCallId,
            tool: toolCall.name,
            duration,
            status: "success",
          },
        };
        yield toolCompleteEvent;
      }

      // Send final completion event
      const runFinishedEvent: RunFinishedEvent = {
        type: "RUN_FINISHED",
        data: {
          output: finalOutput,
          toolsUsed: Array.from(toolsUsed),
          sessionId: config.configurable.thread_id,
        },
      };
      yield runFinishedEvent;

      this.logger.log(
        `Agent streaming completed. Tools used: ${Array.from(toolsUsed).join(", ") || "none"}`,
      );
    } catch (error: unknown) {
      const sessionIdForError = sessionId || "unknown";
      if (error instanceof Error) {
        this.logger.error(`Agent streaming failed: ${error.message}`);
        const runErrorEvent: RunErrorEvent = {
          type: "RUN_ERROR",
          data: {
            error: error.message,
            sessionId: sessionIdForError,
          },
        };
        yield runErrorEvent;
      } else {
        this.logger.error(`Agent streaming failed: ${String(error)}`);
        const runErrorEvent: RunErrorEvent = {
          type: "RUN_ERROR",
          data: {
            error: String(error),
            sessionId: sessionIdForError,
          },
        };
        yield runErrorEvent;
      }
    }
  }

  /**
   * Get system prompt for agent
   */
  private getSystemPrompt(tools: DynamicStructuredTool[]): string {
    const toolDescriptions = tools
      .map((t) => `- ${t.name}: ${t.description}`)
      .join("\n");

    return `You are a highly capable AI agent with access to various tools.
Your goal is to help users by reasoning about their requests and using the available tools when necessary.

Available tools:
${toolDescriptions}

When solving problems:
1. Analyze the user's request carefully
2. Break down complex problems into steps
3. Use tools when they can help you get accurate information or perform operations
4. Reason through each step clearly
5. Provide helpful, accurate, and clear responses

Always explain your reasoning and the results of tool usage to the user.`;
  }

  /**
   * Execute agent with streaming (for real-time token streaming)
   *
   * Returns an async iterable that yields chunks of the agent's response.
   * Useful for progressive UI updates.
   */
  async *executeWithStreaming(
    input: string,
    llm: AzureChatOpenAI,
    tools: DynamicStructuredTool[],
    conversationHistory: BaseMessage[] = [],
    maxIterations: number = 10,
    sessionId?: string,
  ): AsyncIterable<any> {
    try {
      this.logger.log(
        `Executing LangChain agent with streaming (${tools.length} tools)`,
      );

      const systemPrompt = this.getSystemPrompt(tools);

      const agent = createAgent({
        model: llm,
        tools,
        systemPrompt,
      });

      const messages: BaseMessage[] = [
        ...conversationHistory,
        new HumanMessage(input),
      ];

      const config = {
        configurable: {
          thread_id: sessionId || `session-${Date.now()}`,
        },
        recursionLimit: maxIterations,
      };

      // Stream agent execution
      const stream = await agent.stream({ messages }, config);

      for await (const chunk of stream) {
        yield chunk;
      }

      this.logger.log("Agent streaming completed");
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Agent streaming failed: ${error.message}`);
        throw new Error(`Agent streaming failed: ${error.message}`);
      } else {
        this.logger.error(`Agent streaming failed: ${String(error)}`);
        throw new Error(`Agent streaming failed: ${String(error)}`);
      }
    }
  }
}
