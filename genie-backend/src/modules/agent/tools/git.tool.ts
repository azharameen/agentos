import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { Logger } from "@nestjs/common";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Git Tool
 * Executes git commands with security safeguards
 *
 * Security measures:
 * - Whitelist of allowed commands
 * - Arguments sanitization to prevent command injection
 * - Timeout protection
 * - Working directory restricted to project root
 */
export const createGitTool = (): DynamicStructuredTool => {
  const logger = new Logger("GitTool");

  /**
   * Sanitizes git arguments to prevent command injection
   * Removes dangerous shell characters and sequences
   */
  const sanitizeArgs = (args: string): string => {
    if (!args) return "";

    // Remove dangerous characters and shell operators
    const sanitized = args
      .replace(/[;&|`$(){}[\]<>]/g, "") // Remove shell operators
      .replace(/\\/g, "") // Remove backslashes
      .replace(/\n/g, " ") // Replace newlines with spaces
      .trim();

    return sanitized;
  };

  /**
   * Validates that git command is safe and allowed
   */
  const validateCommand = (command: string): boolean => {
    const allowedCommands = [
      "status",
      "log",
      "diff",
      "branch",
      "add",
      "commit",
      "push",
      "pull",
      "checkout",
      "show",
    ];
    return allowedCommands.includes(command);
  };

  return new DynamicStructuredTool({
    name: "git",
    description:
      "Executes git commands like status, log, diff, branch, add, commit, push, pull, etc. Arguments are sanitized for security.",
    schema: z.object({
      command: z
        .enum([
          "status",
          "log",
          "diff",
          "branch",
          "add",
          "commit",
          "push",
          "pull",
          "checkout",
          "show",
        ])
        .describe("The git command to execute"),
      args: z
        .string()
        .optional()
        .describe("Additional arguments for the git command"),
    }),
    func: async ({
      command,
      args = "",
    }: {
      command: string;
      args?: string;
    }): Promise<string> => {
      try {
        // Validate command is allowed
        if (!validateCommand(command)) {
          return `Error: Git command '${command}' is not allowed. Allowed commands: status, log, diff, branch, add, commit, push, pull, checkout, show`;
        }

        // Sanitize arguments to prevent command injection
        const sanitizedArgs = sanitizeArgs(args);

        logger.log(
          `Executing git command: ${command} ${sanitizedArgs || "(no args)"}`,
        );

        // Construct git command with sanitized arguments
        const gitCommand = sanitizedArgs
          ? `git ${command} ${sanitizedArgs}`
          : `git ${command}`;

        // Execute command with security constraints
        const { stdout, stderr } = await execAsync(gitCommand, {
          cwd: process.cwd(),
          timeout: 10000, // 10 second timeout
          maxBuffer: 1024 * 1024, // 1MB buffer limit
        });

        if (stderr && !stderr.includes("warning")) {
          logger.warn(`Git stderr: ${stderr}`);
        }

        return `Git ${command} output:\n${stdout || "Command executed successfully (no output)"}`;
      } catch (error: any) {
        logger.error(`Git command error: ${error.message}`);
        return `Error executing git command: ${error.message}`;
      }
    },
  });
};
