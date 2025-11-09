import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { Logger } from "@nestjs/common";
import * as fs from "fs/promises";
import * as path from "path";

/**
 * Filesystem Tool
 * Reads, writes, and manipulates files
 */
export const createFilesystemTool = (): DynamicStructuredTool => {
  const logger = new Logger("FilesystemTool");

  return new DynamicStructuredTool({
    name: "filesystem",
    description:
      "Reads, writes, lists, and manipulates files and directories. Supports read, write, list, exists, delete operations.",
    schema: z.object({
      operation: z
        .enum(["read", "write", "list", "exists", "delete", "create_dir"])
        .describe("The filesystem operation to perform"),
      filePath: z.string().describe("The file or directory path"),
      content: z
        .string()
        .optional()
        .describe("Content to write (for write operation)"),
    }),
    func: async ({
      operation,
      filePath,
      content,
    }: {
      operation: "read" | "write" | "list" | "exists" | "delete" | "create_dir";
      filePath: string;
      content?: string;
    }): Promise<string> => {
      try {
        // Security: Restrict to project directory only
        const basePath = process.cwd();
        const fullPath = path.resolve(basePath, filePath);

        if (!fullPath.startsWith(basePath)) {
          return "Error: Access denied. Path must be within the project directory.";
        }

        switch (operation) {
          case "read": {
            const fileContent = await fs.readFile(fullPath, "utf-8");
            return `File content of ${filePath}:\n\n${fileContent}`;
          }

          case "write": {
            if (!content)
              return "Error: content parameter is required for write operation";
            await fs.writeFile(fullPath, content, "utf-8");
            return `Successfully wrote to ${filePath}`;
          }

          case "list": {
            const files = await fs.readdir(fullPath);
            return `Contents of ${filePath}:\n${files.join("\n")}`;
          }

          case "exists": {
            try {
              await fs.access(fullPath);
              return `${filePath} exists`;
            } catch {
              return `${filePath} does not exist`;
            }
          }

          case "delete": {
            await fs.unlink(fullPath);
            return `Successfully deleted ${filePath}`;
          }

          case "create_dir": {
            await fs.mkdir(fullPath, { recursive: true });
            return `Successfully created directory ${filePath}`;
          }

          default:
            return "Error: Unknown operation";
        }
      } catch (error: any) {
        logger.error(`Filesystem operation error: ${error.message}`);
        return `Error performing filesystem operation: ${error.message}`;
      }
    },
  });
};
