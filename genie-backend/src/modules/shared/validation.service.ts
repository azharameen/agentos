import { Injectable, Logger } from "@nestjs/common";
import { promises as fs } from "fs";
import * as path from "path";
import { spawn } from "child_process";
import {
  ValidationResult,
  ValidationError,
} from "../../shared/code-ops.interface";

/**
 * Service for validating code changes using various tools
 */
@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);

  /**
   * Run comprehensive validation on changed files
   */
  async validateChanges(
    rootPath: string,
    changedFiles: string[],
  ): Promise<ValidationResult> {
    this.logger.log(`Validating ${changedFiles.length} files in ${rootPath}`);

    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    try {
      // 1. TypeScript type checking
      const tsErrors = await this.runTypeScriptCheck(rootPath, changedFiles);
      errors.push(...tsErrors.filter((e) => e.severity === "error"));
      warnings.push(...tsErrors.filter((e) => e.severity === "warning"));

      // 2. ESLint checking
      const lintErrors = await this.runESLint(rootPath, changedFiles);
      errors.push(...lintErrors.filter((e) => e.severity === "error"));
      warnings.push(...lintErrors.filter((e) => e.severity === "warning"));

      // 3. File existence and syntax validation
      const fileErrors = await this.validateFileExistence(
        rootPath,
        changedFiles,
      );
      errors.push(...fileErrors);

      const passed = errors.length === 0;

      // Build checks summary
      const checks = [
        {
          name: "TypeScript Check",
          passed: tsErrors.filter((e) => e.severity === "error").length === 0,
          duration: 0,
          message:
            tsErrors.length === 0
              ? "No TypeScript errors"
              : `${tsErrors.length} issues found`,
        },
        {
          name: "ESLint Check",
          passed: lintErrors.filter((e) => e.severity === "error").length === 0,
          duration: 0,
          message:
            lintErrors.length === 0
              ? "No ESLint errors"
              : `${lintErrors.length} issues found`,
        },
        {
          name: "File Existence Check",
          passed: fileErrors.length === 0,
          duration: 0,
          message:
            fileErrors.length === 0
              ? "All files exist"
              : `${fileErrors.length} files missing`,
        },
      ];

      return {
        passed,
        checks,
        errors,
        warnings: warnings.map((e) => e.message),
      };
    } catch (error) {
      this.logger.error(`Validation failed: ${error.message}`);
      return {
        passed: false,
        checks: [],
        errors: [
          {
            file: "validation",
            line: 0,
            column: 0,
            message: `Validation process failed: ${error.message}`,
            severity: "error",
          },
        ],
        warnings: [],
      };
    }
  }

  /**
   * Run TypeScript compiler to check for type errors
   */
  private async runTypeScriptCheck(
    rootPath: string,
    changedFiles: string[],
  ): Promise<ValidationError[]> {
    this.logger.debug("Running TypeScript type checking...");

    try {
      // Check if tsconfig.json exists
      const tsconfigPath = path.join(rootPath, "tsconfig.json");
      try {
        await fs.access(tsconfigPath);
      } catch {
        this.logger.warn("No tsconfig.json found, skipping TypeScript check");
        return [];
      }

      // Run tsc --noEmit to check for errors without generating output
      const output = await this.executeCommand("npx", ["tsc", "--noEmit"], {
        cwd: rootPath,
      });

      return this.parseTscOutput(output, changedFiles);
    } catch (error) {
      this.logger.warn(`TypeScript check failed: ${error.message}`);
      return [
        {
          file: "typescript",
          line: 0,
          column: 0,
          message: `TypeScript check failed: ${error.message}`,
          severity: "warning",
        },
      ];
    }
  }

  /**
   * Run ESLint on changed files
   */
  private async runESLint(
    rootPath: string,
    changedFiles: string[],
  ): Promise<ValidationError[]> {
    this.logger.debug("Running ESLint...");

    try {
      // Check if ESLint config exists
      const possibleConfigs = [
        "eslint.config.mjs",
        ".eslintrc.js",
        ".eslintrc.json",
        ".eslintrc",
      ];

      let hasConfig = false;
      for (const config of possibleConfigs) {
        try {
          await fs.access(path.join(rootPath, config));
          hasConfig = true;
          break;
        } catch {
          // Continue checking
        }
      }

      if (!hasConfig) {
        this.logger.warn("No ESLint config found, skipping ESLint check");
        return [];
      }

      // Run ESLint on changed files
      const filesToLint = changedFiles.filter(
        (f) => f.endsWith(".ts") || f.endsWith(".js") || f.endsWith(".tsx"),
      );

      if (filesToLint.length === 0) {
        return [];
      }

      const output = await this.executeCommand(
        "npx",
        ["eslint", "--format", "json", ...filesToLint],
        { cwd: rootPath },
      );

      return this.parseEslintOutput(output);
    } catch (error) {
      this.logger.warn(`ESLint check failed: ${error.message}`);
      return [
        {
          file: "eslint",
          line: 0,
          column: 0,
          message: `ESLint check failed: ${error.message}`,
          severity: "warning",
        },
      ];
    }
  }

  /**
   * Validate that all files exist and are readable
   */
  private async validateFileExistence(
    rootPath: string,
    changedFiles: string[],
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    for (const file of changedFiles) {
      const fullPath = path.join(rootPath, file);
      try {
        await fs.access(fullPath, fs.constants.R_OK);
      } catch {
        errors.push({
          file,
          line: 0,
          column: 0,
          message: `File does not exist or is not readable: ${file}`,
          severity: "error",
        });
      }
    }

    return errors;
  }

  /**
   * Execute a command and return its output
   */
  private executeCommand(
    command: string,
    args: string[],
    options: { cwd: string },
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, {
        ...options,
        shell: true,
      });

      let stdout = "";
      let stderr = "";

      process.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      process.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      process.on("close", (code) => {
        // tsc and eslint return non-zero exit codes when errors are found
        // We still want to parse the output, so we resolve with stdout + stderr
        resolve(stdout + stderr);
      });

      process.on("error", (error) => {
        reject(error);
      });
    });
  }

  /**
   * Parse TypeScript compiler output
   */
  private parseTscOutput(
    output: string,
    changedFiles: string[],
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const lines = output.split("\n");

    // TypeScript output format: filename(line,column): error TS####: message
    const errorRegex =
      /^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+TS\d+:\s+(.+)$/;

    for (const line of lines) {
      const match = line.match(errorRegex);
      if (match) {
        const [, file, lineNum, colNum, severity, message] = match;
        const relativePath = path.relative(process.cwd(), file);

        // Only include errors from changed files
        if (changedFiles.some((f) => relativePath.includes(f))) {
          errors.push({
            file: relativePath,
            line: parseInt(lineNum, 10),
            column: parseInt(colNum, 10),
            message,
            severity: severity as "error" | "warning",
          });
        }
      }
    }

    return errors;
  }

  /**
   * Parse ESLint JSON output
   */
  private parseEslintOutput(output: string): ValidationError[] {
    const errors: ValidationError[] = [];

    try {
      const results = JSON.parse(output);

      for (const result of results) {
        for (const message of result.messages) {
          errors.push({
            file: result.filePath,
            line: message.line || 0,
            column: message.column || 0,
            message: message.message,
            severity: message.severity === 2 ? "error" : "warning",
          });
        }
      }
    } catch {
      // If we can't parse JSON, try plain text format
      this.logger.warn("Failed to parse ESLint JSON output");
    }

    return errors;
  }

  /**
   * Run tests on the project
   */
  async runTests(
    rootPath: string,
    testPattern?: string,
  ): Promise<{ passed: boolean; output: string }> {
    this.logger.debug("Running tests...");

    try {
      const args = ["test"];
      if (testPattern) {
        args.push("--testPathPattern", testPattern);
      }

      const output = await this.executeCommand("npm", args, {
        cwd: rootPath,
      });

      const passed = !output.includes("FAIL") && !output.includes("failed");

      return { passed, output };
    } catch (error) {
      this.logger.error(`Tests failed: ${error.message}`);
      return {
        passed: false,
        output: `Test execution failed: ${error.message}`,
      };
    }
  }
}
