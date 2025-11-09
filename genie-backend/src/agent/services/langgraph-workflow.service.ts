import { Injectable, Logger } from "@nestjs/common";
import {
  StateGraph,
  MessagesAnnotation,
  START,
  END,
  Annotation,
} from "@langchain/langgraph";
import { AzureChatOpenAI } from "@langchain/openai";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { DynamicStructuredTool } from "@langchain/core/tools";

/**
 * LangGraph Workflow Service
 * Implements advanced graph-based agentic workflows with LangGraph
 *
 * Features:
 * - Multi-step reasoning with branching logic
 * - Conditional edges based on agent output
 * - Tool execution nodes
 * - Memory integration
 * - RAG retrieval node
 * - State management across workflow
 */

/**
 * Extended state annotation for workflow
 */
const WorkflowState = Annotation.Root({
  ...MessagesAnnotation.spec,
  context: Annotation<string>({
    reducer: (a, b) => b ?? a,
    default: () => "",
  }),
  toolResults: Annotation<Record<string, any>>({
    reducer: (a, b) => ({ ...a, ...b }),
    default: () => ({}),
  }),
  iteration: Annotation<number>({
    reducer: (a, b) => b ?? a,
    default: () => 0,
  }),
  shouldContinue: Annotation<boolean>({
    reducer: (a, b) => b ?? a,
    default: () => true,
  }),
});

@Injectable()
export class LangGraphWorkflowService {
  private readonly logger = new Logger(LangGraphWorkflowService.name);

  /**
   * Create and execute a graph-based workflow
   * This demonstrates a ReAct-style agent with explicit graph structure
   */
  async executeWorkflow(
    input: string,
    llm: AzureChatOpenAI,
    tools: DynamicStructuredTool[],
    conversationHistory: BaseMessage[] = [],
    maxIterations: number = 10,
    ragContext?: string,
  ): Promise<{
    output: string;
    intermediateSteps: any[];
    toolsUsed: string[];
  }> {
    this.logger.log("Executing LangGraph workflow");

    try {
      // Create the workflow graph
      const workflow = this.createWorkflowGraph(llm, tools, maxIterations);

      // Prepare initial state
      const initialMessages: BaseMessage[] = [
        ...conversationHistory,
        new HumanMessage(input),
      ];

      const initialState = {
        messages: initialMessages,
        context: ragContext || "",
        toolResults: {},
        iteration: 0,
        shouldContinue: true,
      };

      // Execute workflow
      const result = await workflow.invoke(initialState);

      // Extract output
      const lastMessage = result.messages[result.messages.length - 1];
      const output =
        typeof lastMessage.content === "string"
          ? lastMessage.content
          : JSON.stringify(lastMessage.content);

      // Extract tools used
      const toolsUsed = Object.keys(result.toolResults || {});

      this.logger.log(
        `Workflow completed with ${toolsUsed.length} tool(s) used`,
      );

      return {
        output,
        intermediateSteps: [result.toolResults || {}],
        toolsUsed,
      };
    } catch (error: any) {
      this.logger.error(`Workflow execution failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create the workflow graph with nodes and edges
   */
  private createWorkflowGraph(
    llm: AzureChatOpenAI,
    tools: DynamicStructuredTool[],
    maxIterations: number,
  ) {
    const toolMap = new Map(tools.map((t) => [t.name, t]));

    // Define nodes
    const graph = new StateGraph(WorkflowState)
      // 1. Agent reasoning node
      .addNode("agent", async (state: typeof WorkflowState.State) => {
        this.logger.debug(`Agent node - iteration ${state.iteration}`);

        // Bind tools to LLM
        const llmWithTools = llm.bindTools(tools);

        // Add RAG context if available
        let messages = [...state.messages];
        if (state.context && state.iteration === 0) {
          messages = [
            new HumanMessage(
              `Context from knowledge base:\n${state.context}\n\nPlease answer the user's question using this context when relevant.`,
            ),
            ...messages,
          ];
        }

        // Invoke LLM
        const response = await llmWithTools.invoke(messages);

        return {
          messages: [response],
          iteration: state.iteration + 1,
        };
      })
      // 2. Tool execution node
      .addNode("tools", async (state: typeof WorkflowState.State) => {
        this.logger.debug("Tools node - executing tool calls");

        const lastMessage = state.messages[
          state.messages.length - 1
        ] as AIMessage;
        const toolCalls = lastMessage.tool_calls || [];

        if (toolCalls.length === 0) {
          this.logger.warn("Tools node called but no tool calls found");
          return { messages: [] };
        }

        const toolResults: Record<string, any> = {};
        const toolMessages: BaseMessage[] = [];

        // Execute each tool call
        for (const toolCall of toolCalls) {
          const tool = toolMap.get(toolCall.name);
          if (!tool) {
            this.logger.warn(`Tool not found: ${toolCall.name}`);
            continue;
          }

          try {
            this.logger.debug(`Executing tool: ${toolCall.name}`);
            const result = await tool.invoke(toolCall.args);
            toolResults[toolCall.name] = result;

            // Create tool message
            toolMessages.push({
              role: "tool",
              content:
                typeof result === "string" ? result : JSON.stringify(result),
              tool_call_id: toolCall.id,
              name: toolCall.name,
            } as any);
          } catch (error: any) {
            this.logger.error(
              `Tool execution failed: ${toolCall.name} - ${error.message}`,
            );
            toolMessages.push({
              role: "tool",
              content: `Error: ${error.message}`,
              tool_call_id: toolCall.id,
              name: toolCall.name,
            } as any);
          }
        }

        return {
          messages: toolMessages,
          toolResults,
        };
      })
      // Define edges
      .addEdge(START, "agent")
      // Conditional edge: decide if we need to call tools or finish
      .addConditionalEdges(
        "agent",
        (state: typeof WorkflowState.State) => {
          const lastMessage = state.messages[
            state.messages.length - 1
          ] as AIMessage;

          // Check if we've exceeded max iterations
          if (state.iteration >= maxIterations) {
            this.logger.debug("Max iterations reached, ending workflow");
            return "end";
          }

          // Check if there are tool calls
          const toolCalls = lastMessage.tool_calls || [];
          if (toolCalls.length > 0) {
            this.logger.debug(
              `Agent wants to call ${toolCalls.length} tool(s)`,
            );
            return "tools";
          }

          // No tool calls, we're done
          this.logger.debug("No tool calls, ending workflow");
          return "end";
        },
        {
          tools: "tools",
          end: END,
        },
      )
      // After tools, go back to agent
      .addEdge("tools", "agent");

    // Compile the graph
    return graph.compile();
  }

  /**
   * Create a simple hello world workflow (for testing)
   */
  async createHelloWorldWorkflow(): Promise<any> {
    const mockLlm = (state: typeof MessagesAnnotation.State) => {
      return {
        messages: [{ role: "ai", content: "Hello world from LangGraph!" }],
      };
    };

    const graph = new StateGraph(MessagesAnnotation)
      .addNode("mock_llm", mockLlm)
      .addEdge(START, "mock_llm")
      .addEdge("mock_llm", END)
      .compile();

    const result = await graph.invoke({
      messages: [{ role: "user", content: "hi!" }],
    });

    return result;
  }

  /**
   * Create a workflow with RAG retrieval node
   */
  async createRAGWorkflow(
    llm: AzureChatOpenAI,
    retrievalFunction: (query: string) => Promise<string>,
  ) {
    const graph = new StateGraph(WorkflowState)
      // 1. Retrieval node
      .addNode("retrieve", async (state: typeof WorkflowState.State) => {
        const lastMessage = state.messages[state.messages.length - 1];
        const query =
          typeof lastMessage.content === "string" ? lastMessage.content : "";

        this.logger.debug(
          `Retrieving context for: ${query.substring(0, 100)}...`,
        );
        const context = await retrievalFunction(query);

        return { context };
      })
      // 2. Generation node
      .addNode("generate", async (state: typeof WorkflowState.State) => {
        const query = state.messages[state.messages.length - 1];
        const context = state.context;

        const prompt = `Context:\n${context}\n\nQuestion: ${query.content}\n\nPlease answer based on the context provided.`;

        const response = await llm.invoke([new HumanMessage(prompt)]);

        return { messages: [response] };
      })
      .addEdge(START, "retrieve")
      .addEdge("retrieve", "generate")
      .addEdge("generate", END);

    return graph.compile();
  }
}
