import { DynamicStructuredTool } from "@langchain/core/tools";
import { BaseRetriever } from "@langchain/core/retrievers";
import { z } from "zod";

/**
 * Retriever Tool Utility
 * 
 * NOTE: Currently unused but reserved for future RAG enhancements.
 * This utility can convert LangChain retrievers into agent tools,
 * allowing agents to dynamically query vectorstores during execution.
 * 
 * Create a retriever tool from a LangChain retriever
 * Compatible with LangChain agents and workflows
 */
export function createRetrieverTool(
  retriever: BaseRetriever,
  options: {
    name: string;
    description: string;
  },
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: options.name,
    description: options.description,
    schema: z.object({
      query: z
        .string()
        .describe("The search query to retrieve relevant documents"),
    }),
    func: async ({ query }) => {
      const docs = await retriever.invoke(query);
      return docs.map((doc) => doc.pageContent).join("\n\n");
    },
  });
}
