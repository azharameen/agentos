import { Injectable, Logger } from "@nestjs/common";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import { AzureChatOpenAI } from "@langchain/openai";
import { AgentExecutionResult } from "../../shared/agent.interface";

// Note: LangChain v1 uses createAgent from "langchain" package
// but @langchain/langgraph/prebuilt is available in current versions
// Using LangGraph's createReactAgent for now (compatible approach)
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";

/**
 * LangChain Agent Service
 * Implements true agentic AI using LangChain's AgentExecutor pattern (LangGraph-based)
 *
 * Features:
 * - Function/tool calling with Azure OpenAI
 * - Dynamic tool selection and execution via ReAct pattern
 * - Multi-step reasoning with intermediate steps tracking
 * - Built-in checkpointing and memory (via MemorySaver)
 * - Streaming support (configurable)
 *
 * Architecture:
 * - Uses LangGraph's createReactAgent (pre-built agent with ReAct loop)
 * - Replaces custom ReAct implementation with LangChain's battle-tested version
 * - Supports tool error handling, retries, and observability
 *
 * Migration notes (for future LangChain v1 upgrade):
 * - createReactAgent from @langchain/langgraph/prebuilt → createAgent from "langchain"
 * - MemorySaver works with both versions
 */
@Injectable()
export class LangChainAgentService {
  private readonly logger = new Logger(LangChainAgentService.name);
  private memory = new MemorySaver();

  /**
   * Execute agent with tools using LangGraph's createReactAgent
   *
   * This replaces the custom ReAct loop with LangChain's pre-built agent executor.
   * Benefits: Built-in error handling, streaming, checkpointing, and observability.
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

      // Create ReAct agent with LangGraph
      const agent = createReactAgent({
        llm,
        tools,
        messageModifier: systemPrompt,
        checkpointSaver: this.memory,
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
  ): AsyncGenerator<any, void, unknown> {
    try {
      this.logger.log(`Streaming LangChain agent with ${tools.length} tools`);

      // Build system prompt
      const systemPrompt = this.getSystemPrompt(tools);

      // Create ReAct agent with LangGraph
      const agent = createReactAgent({
        llm,
        tools,
        messageModifier: systemPrompt,
        checkpointSaver: this.memory,
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
      let messageCounter = 0;

      // Use 'messages' stream mode to get LLM tokens
      const stream = await agent.stream(
        { messages },
        { ...config, streamMode: "messages" as any },
      );
      for await (const chunk of stream) {
        // chunk is a tuple: [message, metadata]
        if (!Array.isArray(chunk) || chunk.length < 2) continue;
        const [messageRaw, metadata] = chunk;

        // Type assertion for message
        const message = messageRaw as {
          content?: string;
          tool_calls?: Array<{
            name?: string;
            args?: unknown;
            function?: { name?: string; arguments?: unknown };
          }>;
        };

        // Defensive: always set messageId and delta as strings
        const safeContent = typeof message.content === "string" ? message.content : "";
        const safeDelta = safeContent;
        messageCounter++;
        const safeMessageId = `${config.configurable.thread_id}-msg-${messageCounter}`;

        if (safeContent.length > 0) {
          finalOutput += safeContent;
          yield {
            type: "TEXT_MESSAGE_CONTENT",
            data: {
              messageId: safeMessageId,
              delta: safeDelta,
              content: finalOutput,
              metadata,
            },
          };
        }
        // Optionally emit thread.message.created and thread.message.completed events
        // (not implemented here, but can be added for full compliance)

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
              yield {
                type: "TOOL_CALL_START",
                data: {
                  tool: toolName,
                  input: toolInput,
                },
              };
            }
          }
        }
      }

      // Send final completion event
      yield {
        type: "RUN_FINISHED",
        data: {
          output: finalOutput,
          toolsUsed: Array.from(toolsUsed),
          sessionId: config.configurable.thread_id,
        },
      };

      this.logger.log(
        `Agent streaming completed. Tools used: ${Array.from(toolsUsed).join(", ") || "none"}`,
      );
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Agent streaming failed: ${error.message}`);
        yield {
          type: "RUN_ERROR",
          data: { error: error.message },
        };
      } else {
        this.logger.error(`Agent streaming failed: ${String(error)}`);
        yield {
          type: "RUN_ERROR",
          data: { error: String(error) },
        };
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

      const agent = createReactAgent({
        llm,
        tools,
        messageModifier: systemPrompt,
        checkpointSaver: this.memory,
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
