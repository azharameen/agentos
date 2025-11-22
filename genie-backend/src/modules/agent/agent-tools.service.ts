/* eslint-disable */
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ToolRegistryService } from "./tool-registry.service";
import { ToolCategory } from "../../shared/tool.constants";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * AgentToolsService
 * Initializes and registers all built-in tools for the agent
 * Following Single Responsibility Principle: Only manages tool initialization
 *
 * Updated: Calculator and web-search tools are disabled per user request
 * Focus on: filesystem, git, todo, string manipulation, date/time utilities
 */
@Injectable()
export class AgentToolsService implements OnModuleInit {
  private readonly logger = new Logger(AgentToolsService.name);

  constructor(private readonly toolRegistry: ToolRegistryService) { }

  /**
   * Initialize all tools on module start
   */
  async onModuleInit() {
    this.logger.log("Initializing agent tools...");
    this.registerCalculatorTools();
    this.registerWebTools();
    this.registerStringTools();
    this.registerDateTimeTools();
    this.registerFilesystemTools();
    this.registerGitTools();
    this.logger.log("Agent tools initialized successfully");
  }

  /**
   * Register calculator/math tools
   */
  private registerCalculatorTools() {
    // Calculator tool
    this.toolRegistry.registerTool(
      'calculator',
      'Performs mathematical calculations. Supports basic arithmetic operations (+, -, *, /), exponents, and parentheses.',
      z.object({
        expression: z
          .string()
          .describe(
            'The mathematical expression to evaluate (e.g., "2 + 2", "10 * (5 + 3)")'
          )
      }),
      async ({ expression }: { expression: string }) => {
        try {
          // Safe evaluation (only allow numbers and basic operators)
          const sanitized = expression.replaceAll(/[^0-9+\-*/().\s]/g, '');
          if (!sanitized) {
            return 'Invalid expression';
          }
          // eslint-disable-next-line no-eval
          const result = eval(sanitized);
          return `The result of ${expression} is ${result}`;
        } catch (error: any) {
          return `Error calculating: ${error.message}`;
        }
      },
      ToolCategory.MATH
    );

    // Random number generator
    this.toolRegistry.registerTool(
      'random_number',
      'Generates a random number within a specified range.',
      z.object({
        min: z.number().describe('Minimum value (inclusive)'),
        max: z.number().describe('Maximum value (inclusive)')
      }),
      async ({ min, max }: { min: number; max: number }) => {
        const result = Math.floor(Math.random() * (max - min + 1)) + min;
        return `Random number between ${min} and ${max}: ${result}`;
      },
      ToolCategory.MATH
    );
  }

  /**
   * Register string manipulation tools
   */
  private registerStringTools() {
    this.toolRegistry.registerTool(
      "string_length",
      "Returns the length of a string.",
      z.object({
        text: z.string().describe("The text to measure"),
      }),
      async ({ text }: { text: string }) =>
        `The length of the text is ${text.length} characters`,
      ToolCategory.STRING,
    );

    this.toolRegistry.registerTool(
      "string_reverse",
      "Reverses a string.",
      z.object({
        text: z.string().describe("The text to reverse"),
      }),
      async ({ text }: { text: string }) => {
        const reversed = text.split("").reverse().join("");
        return `Reversed text: ${reversed}`;
      },
      ToolCategory.STRING,
    );

    this.toolRegistry.registerTool(
      "string_uppercase",
      "Converts a string to uppercase.",
      z.object({
        text: z.string().describe("The text to convert"),
      }),
      async ({ text }: { text: string }) => text.toUpperCase(),
      ToolCategory.STRING,
    );

    this.toolRegistry.registerTool(
      "string_lowercase",
      "Converts a string to lowercase.",
      z.object({
        text: z.string().describe("The text to convert"),
      }),
      async ({ text }: { text: string }) => text.toLowerCase(),
      ToolCategory.STRING,
    );
  }

  /**
   * Register web-related tools
   */
  private registerWebTools() {
    this.toolRegistry.registerTool(
      'web_search',
      'Searches the web for information. (Stub implementation - returns mock data)',
      z.object({
        query: z.string().describe('The search query'),
        limit: z
          .number()
          .optional()
          .describe('Maximum number of results (default: 5)'),
      }),
      async ({ query, limit = 5 }: { query: string; limit?: number }) =>
        `Web search results for "${query}" (mock data - ${limit} results):
  1. Mock result about ${query}
  2. Another relevant article about ${query}
  3. Documentation for ${query}`,
      ToolCategory.WEB,
    );

    this.toolRegistry.registerTool(
      'fetch_url',
      'Fetches content from a URL.',
      z.object({
        url: z.string().describe('The URL to fetch'),
      }),
      async ({ url }: { url: string }) => {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            return `Failed to fetch ${url}: ${response.statusText}`;
          }
          const text = await response.text();
          return `Content from ${url}:\n${text.substring(0, 5000)}${text.length > 5000 ? '... (truncated)' : ''}`;
        } catch (error: any) {
          return `Error fetching ${url}: ${error.message}`;
        }
      },
      ToolCategory.WEB,
    );
  }

  /**
   * Register code execution tools (DISABLED - not in active toolset)
   */
  // private registerCodeTools() {
  //   this.toolRegistry.registerTool(
  //     'execute_code',
  //     'Executes code in a sandboxed environment. (Stub implementation - currently disabled for safety)',
  //     z.object({
  //       language: z
  //         .enum(['javascript', 'python', 'typescript'])
  //         .describe('Programming language'),
  //       code: z.string().describe('The code to execute'),
  //     }),
  //     async ({ language, code }: { language: string; code: string }) =>
  //       `Code execution is currently disabled for safety. Would execute ${language} code: ${code.substring(0, 50)}...`,
  //     ToolCategory.GENERAL,
  //     false, // Disabled by default for safety
  //   );

  //   this.toolRegistry.registerTool(
  //     'format_code',
  //     'Formats code with proper indentation and style.',
  //     z.object({
  //       language: z
  //         .enum(['javascript', 'python', 'typescript', 'json'])
  //         .describe('Programming language'),
  //       code: z.string().describe('The code to format'),
  //     }),
  //     async ({ language, code }: { language: string; code: string }) =>
  //       `Formatted ${language} code:\n${code}`,
  //     ToolCategory.GENERAL,
  //   );
  // }

  /**
   * Register date/time tools
   */
  private registerDateTimeTools() {
    this.toolRegistry.registerTool(
      "current_time",
      "Gets the current date and time.",
      z.object({
        timezone: z
          .string()
          .optional()
          .describe('Timezone (e.g., "UTC", "America/New_York")'),
      }),
      async ({ timezone }: { timezone?: string }) => {
        const now = new Date();
        if (timezone) {
          return `Current time in ${timezone}: ${now.toLocaleString("en-US", { timeZone: timezone })}`;
        }
        return `Current time (UTC): ${now.toISOString()}`;
      },
      ToolCategory.DATETIME,
    );

    this.toolRegistry.registerTool(
      "date_calculator",
      "Calculates date differences or adds/subtracts time from a date.",
      z.object({
        operation: z
          .enum(["add", "subtract", "diff"])
          .describe("Operation to perform"),
        value: z.number().describe("Number of days/hours/minutes"),
        unit: z.enum(["days", "hours", "minutes"]).describe("Time unit"),
        from: z
          .string()
          .optional()
          .describe("Starting date (ISO format, defaults to now)"),
      }),
      async ({
        operation,
        value,
        unit,
        from,
      }: {
        operation: string;
        value: number;
        unit: string;
        from?: string;
      }) => {
        const startDate = from ? new Date(from) : new Date();
        let result = new Date(startDate);

        let multiplier = 60000; // minutes
        if (unit === "days") {
          multiplier = 86400000;
        } else if (unit === "hours") {
          multiplier = 3600000;
        }

        if (operation === "add") {
          result = new Date(startDate.getTime() + value * multiplier);
          return `${value} ${unit} after ${startDate.toISOString()} is ${result.toISOString()}`;
        } else if (operation === "subtract") {
          result = new Date(startDate.getTime() - value * multiplier);
          return `${value} ${unit} before ${startDate.toISOString()} is ${result.toISOString()}`;
        } else {
          return `Difference calculation not yet implemented`;
        }
      },
      ToolCategory.DATETIME,
    );
  }

  /**
   * Register filesystem tools with sandboxing
   */
  private registerFilesystemTools() {
    const basePath = process.cwd();

    this.toolRegistry.registerTool(
      "filesystem_read",
      "Reads the contents of a file within the project directory.",
      z.object({
        filePath: z
          .string()
          .describe("The relative file path within the project"),
      }),
      async ({ filePath }: { filePath: string }) => {
        try {
          const fullPath = path.resolve(basePath, filePath);

          // Security checks
          if (filePath.includes("..")) {
            return "Error: Directory traversal detected";
          }
          if (!fullPath.startsWith(basePath)) {
            return "Error: Path outside project directory";
          }

          const content = await fs.readFile(fullPath, "utf-8");
          return `File: ${filePath}\n\n${content}`;
        } catch (error: any) {
          return `Error reading file: ${error.message}`;
        }
      },
      ToolCategory.FILESYSTEM,
      true,
      {
        timeout: 5000,
        maxRetries: 1,
      },
    );

    this.toolRegistry.registerTool(
      "filesystem_list",
      "Lists files and directories within the project directory.",
      z.object({
        dirPath: z
          .string()
          .describe("The relative directory path (default: '.')"),
      }),
      async ({ dirPath }: { dirPath: string }) => {
        try {
          const fullPath = path.resolve(basePath, dirPath || ".");

          // Security checks
          if (dirPath.includes("..")) {
            return "Error: Directory traversal detected";
          }
          if (!fullPath.startsWith(basePath)) {
            return "Error: Path outside project directory";
          }

          const files = await fs.readdir(fullPath);
          return `Contents of ${dirPath || "."}:\n${files.join("\n")}`;
        } catch (error: any) {
          return `Error listing directory: ${error.message}`;
        }
      },
      ToolCategory.FILESYSTEM,
      true,
      {
        timeout: 5000,
        maxRetries: 1,
      },
    );

    this.toolRegistry.registerTool(
      "filesystem_exists",
      "Checks if a file or directory exists within the project.",
      z.object({
        filePath: z.string().describe("The relative path to check"),
      }),
      async ({ filePath }: { filePath: string }) => {
        try {
          const fullPath = path.resolve(basePath, filePath);

          // Security checks
          if (filePath.includes("..")) {
            return "Error: Directory traversal detected";
          }
          if (!fullPath.startsWith(basePath)) {
            return "Error: Path outside project directory";
          }

          await fs.access(fullPath);
          return `${filePath} exists`;
        } catch {
          return `${filePath} does not exist`;
        }
      },
      ToolCategory.FILESYSTEM,
      true,
      {
        timeout: 3000,
        maxRetries: 1,
      },
    );
  }

  /**
   * Register git tools with command validation
   */
  private registerGitTools() {
    const sanitizeArgs = (args: string): string => {
      if (!args) return "";
      return args
        .replaceAll(/[;&|`$(){}[\]<>]/g, "")
        .replaceAll(/\\/g, "")
        .replaceAll(/\n/g, " ")
        .trim();
    };

    const allowedCommands = [
      "status",
      "log",
      "diff",
      "branch",
      "show",
      "remote",
    ];

    this.toolRegistry.registerTool(
      "git_status",
      "Gets the current git repository status.",
      z.object({}),
      async () => {
        try {
          const { stdout } = await execAsync("git status", {
            cwd: process.cwd(),
            timeout: 10000,
          });
          return `Git status:\n${stdout}`;
        } catch (error: any) {
          return `Error: ${error.message}`;
        }
      },
      ToolCategory.GIT,
      true,
      {
        timeout: 10000,
        maxRetries: 1,
      },
    );

    this.toolRegistry.registerTool(
      "git_log",
      "Shows git commit history.",
      z.object({
        limit: z
          .number()
          .optional()
          .describe("Number of commits to show (default: 10)"),
      }),
      async ({ limit = 10 }: { limit?: number }) => {
        try {
          const { stdout } = await execAsync(
            `git log --oneline -${Math.min(limit, 50)}`,
            {
              cwd: process.cwd(),
              timeout: 10000,
            },
          );
          return `Git log:\n${stdout}`;
        } catch (error: any) {
          return `Error: ${error.message}`;
        }
      },
      ToolCategory.GIT,
      true,
      {
        timeout: 10000,
        maxRetries: 1,
      },
    );

    this.toolRegistry.registerTool(
      "git_diff",
      "Shows git diff for uncommitted changes.",
      z.object({
        file: z
          .string()
          .optional()
          .describe("Specific file to diff (optional)"),
      }),
      async ({ file }: { file?: string }) => {
        try {
          const sanitizedFile = file ? sanitizeArgs(file) : "";
          const command = sanitizedFile
            ? `git diff ${sanitizedFile}`
            : "git diff";

          const { stdout } = await execAsync(command, {
            cwd: process.cwd(),
            timeout: 10000,
            maxBuffer: 1024 * 1024,
          });

          if (!stdout) {
            return "No changes detected";
          }

          return `Git diff:\n${stdout}`;
        } catch (error: any) {
          return `Error: ${error.message}`;
        }
      },
      ToolCategory.GIT,
      true,
      {
        timeout: 10000,
        maxRetries: 1,
      },
    );
  }
}
