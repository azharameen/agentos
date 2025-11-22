import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * String Manipulation Tool
 * Performs various string operations
 */
export const createStringManipulationTool = (): DynamicStructuredTool => {
  return new DynamicStructuredTool({
    name: "string_manipulation",
    description:
      "Performs string operations like uppercase, lowercase, reverse, length, substring, replace, split, etc.",
    schema: z.object({
      operation: z
        .enum([
          "uppercase",
          "lowercase",
          "reverse",
          "length",
          "substring",
          "replace",
          "split",
          "trim",
          "concat",
        ])
        .describe("The string operation to perform"),
      text: z.string().describe("The input text to manipulate"),
      start: z
        .number()
        .optional()
        .describe("Start index for substring operation"),
      end: z.number().optional().describe("End index for substring operation"),
      search: z
        .string()
        .optional()
        .describe("Text to search for (for replace operation)"),
      replaceWith: z
        .string()
        .optional()
        .describe("Text to replace with (for replace operation)"),
      separator: z
        .string()
        .optional()
        .describe("Separator for split operation (defaults to space)"),
      additionalText: z
        .string()
        .optional()
        .describe("Additional text for concat operation"),
    }),
    func: async ({
      operation,
      text,
      start,
      end,
      search,
      replaceWith,
      separator,
      additionalText,
    }: {
      operation: string;
      text: string;
      start?: number;
      end?: number;
      search?: string;
      replaceWith?: string;
      separator?: string;
      additionalText?: string;
    }): Promise<string> => {
      try {
        switch (operation) {
          case "uppercase":
            return `Uppercase result: ${text.toUpperCase()}`;

          case "lowercase":
            return `Lowercase result: ${text.toLowerCase()}`;

          case "reverse":
            return `Reversed text: ${text.split("").reverse().join("")}`;

          case "length":
            return `The text has ${text.length} characters`;

          case "substring":
            if (start === undefined)
              return "Error: start index is required for substring";
            const substr =
              end !== undefined
                ? text.substring(start, end)
                : text.substring(start);
            return `Substring: ${substr}`;

          case "replace":
            if (!search)
              return "Error: search parameter is required for replace";
            if (replaceWith === undefined)
              return "Error: replaceWith parameter is required for replace";
            return `Result: ${text.replace(new RegExp(search, "g"), replaceWith)}`;

          case "split":
            const parts = text.split(separator || " ");
            return `Split into ${parts.length} parts: ${parts.join(", ")}`;

          case "trim":
            return `Trimmed text: "${text.trim()}"`;

          case "concat":
            if (!additionalText)
              return "Error: additionalText is required for concat";
            return `Concatenated text: ${text}${additionalText}`;

          default:
            return "Error: Unknown operation";
        }
      } catch (error: any) {
        return `Error performing string operation: ${error.message}`;
      }
    },
  });
};
