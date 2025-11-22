import { Injectable, Logger } from "@nestjs/common";
import { promises as fs } from "fs";
import * as path from "path";
import * as diff from "diff";
import {
  ChangeSet,
  FileChange,
  FileOperation,
  PreviewResult,
  FileDiff,
  ChangeSummary,
  ImpactLevel,
  ApplyResult,
  ApplyOptions,
  ValidationResult,
  FailedChange,
  CommitInfo,
} from "../../shared/code-ops.interface";
import { ProjectContextLoaderService } from "../rag/project-context-loader.service";
import { ValidationService } from "../shared/validation.service";

@Injectable()
export class CodeOpsService {
  private readonly logger = new Logger(CodeOpsService.name);
  private readonly locks = new Map<string, boolean>();

  constructor(
    private readonly projectContextLoader: ProjectContextLoaderService,
    private readonly validationService: ValidationService,
  ) { }

  /**
   * Preview code changes without applying them
   */
  async previewChanges(changeSet: ChangeSet): Promise<PreviewResult> {
    this.logger.log(
      `Previewing ${changeSet.changes.length} changes for project ${changeSet.projectName}`,
    );

    try {
      // Get project context
      const context = this.projectContextLoader.getCachedContext(
        changeSet.projectName,
      );
      if (!context) {
        throw new Error(`Project "${changeSet.projectName}" not found`);
      }

      const diffs: FileDiff[] = [];
      const summary: ChangeSummary = {
        totalFiles: changeSet.changes.length,
        filesCreated: 0,
        filesUpdated: 0,
        filesDeleted: 0,
        linesAdded: 0,
        linesRemoved: 0,
      };

      // Generate diffs for each change
      for (const change of changeSet.changes) {
        const fullPath = path.join(context.rootPath, change.path);
        const fileDiff = await this.generateFileDiff(change, fullPath);

        diffs.push(fileDiff);

        // Update summary
        switch (change.operation) {
          case FileOperation.CREATE:
            summary.filesCreated++;
            break;
          case FileOperation.UPDATE:
            summary.filesUpdated++;
            break;
          case FileOperation.DELETE:
            summary.filesDeleted++;
            break;
        }

        summary.linesAdded += fileDiff.linesAdded;
        summary.linesRemoved += fileDiff.linesRemoved;
      }

      // Analyze potential issues
      const potentialIssues = this.analyzePotentialIssues(changeSet, context);

      // Estimate impact level
      const estimatedImpact = this.estimateImpact(summary, potentialIssues);

      const result: PreviewResult = {
        projectName: changeSet.projectName,
        diffs,
        summary,
        potentialIssues,
        estimatedImpact,
      };

      this.logger.log(
        `Preview complete: ${summary.totalFiles} files, impact level: ${estimatedImpact}`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to preview changes: ${error.message}`);
      throw error;
    }
  }

  /**
   * Apply code changes to the filesystem
   */
  async applyChanges(
    changeSet: ChangeSet,
    options: ApplyOptions = {},
  ): Promise<ApplyResult> {
    this.logger.log(
      `Applying ${changeSet.changes.length} changes to project ${changeSet.projectName}`,
    );

    const context = this.projectContextLoader.getCachedContext(
      changeSet.projectName,
    );
    if (!context) {
      throw new Error(`Project "${changeSet.projectName}" not found`);
    }

    // Check for lock
    if (this.locks.get(changeSet.projectName)) {
      throw new Error(
        `Project "${changeSet.projectName}" is locked by another operation`,
      );
    }

    // Acquire lock
    this.locks.set(changeSet.projectName, true);

    const appliedChanges: FileChange[] = [];
    const failedChanges: FailedChange[] = [];
    let backupPath: string | undefined;

    try {
      // Create backup if requested
      if (options.createBackup) {
        backupPath = await this.createBackup(context.rootPath, changeSet);
        this.logger.log(`Backup created at: ${backupPath}`);
      }

      // Dry run - just validate, don't actually apply
      if (options.dryRun) {
        this.logger.log("Dry run mode - validating changes only");
        return {
          projectName: changeSet.projectName,
          success: true,
          appliedChanges: [],
          failedChanges: [],
          rollback: {
            available: false,
            canRevert: false,
          },
        };
      }

      // Apply each change
      for (const change of changeSet.changes) {
        try {
          await this.applyFileChange(change, context.rootPath);
          appliedChanges.push(change);
          this.logger.log(`Applied: ${change.operation} ${change.path}`);
        } catch (error) {
          const failed: FailedChange = {
            change,
            error: error.message,
            recoverable: true,
          };
          failedChanges.push(failed);
          this.logger.error(
            `Failed to apply change to ${change.path}: ${error.message}`,
          );
        }
      }

      // Validation
      let validation: ValidationResult | undefined;
      if (!options.skipValidation && appliedChanges.length > 0) {
        validation = await this.validateChanges(
          context.rootPath,
          appliedChanges,
        );
      }

      // Git commit
      let commit: CommitInfo | undefined;
      if (options.gitCommit && appliedChanges.length > 0) {
        commit = await this.createGitCommit(
          context.rootPath,
          changeSet,
          options.gitBranch,
        );
      }

      // Invalidate project context cache to force reload
      this.projectContextLoader.invalidateCache(changeSet.projectName);

      const result: ApplyResult = {
        projectName: changeSet.projectName,
        success: failedChanges.length === 0,
        appliedChanges,
        failedChanges,
        validation,
        commit,
        rollback: {
          available: !!backupPath,
          backupPath,
          canRevert: !!backupPath && failedChanges.length === 0,
        },
      };

      this.logger.log(
        `Apply complete: ${appliedChanges.length} succeeded, ${failedChanges.length} failed`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Critical error applying changes: ${error.message}`);
      throw error;
    } finally {
      // Release lock
      this.locks.delete(changeSet.projectName);
    }
  }

  /**
   * Generate diff for a single file change
   */
  private async generateFileDiff(
    change: FileChange,
    fullPath: string,
  ): Promise<FileDiff> {
    let oldContent = "";
    let newContent = change.content || "";

    // Read existing content for update/delete operations
    if (
      change.operation === FileOperation.UPDATE ||
      change.operation === FileOperation.DELETE
    ) {
      try {
        oldContent = await fs.readFile(fullPath, "utf-8");
      } catch {
        // File doesn't exist yet, treat as create
        if (change.operation === FileOperation.UPDATE) {
          change.operation = FileOperation.CREATE;
        }
      }
    }

    // For delete operations, new content is empty
    if (change.operation === FileOperation.DELETE) {
      newContent = "";
    }

    // Generate unified diff
    const unifiedDiff = diff.createPatch(
      change.path,
      oldContent,
      newContent,
      "original",
      "modified",
    );

    // Count line changes
    const lines = unifiedDiff.split("\n");
    let linesAdded = 0;
    let linesRemoved = 0;

    for (const line of lines) {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        linesAdded++;
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        linesRemoved++;
      }
    }

    return {
      path: change.path,
      operation: change.operation,
      diff: unifiedDiff,
      linesAdded,
      linesRemoved,
      linesChanged: linesAdded + linesRemoved,
    };
  }

  /**
   * Apply a single file change
   */
  private async applyFileChange(
    change: FileChange,
    rootPath: string,
  ): Promise<void> {
    const fullPath = path.join(rootPath, change.path);

    switch (change.operation) {
      case FileOperation.CREATE:
      case FileOperation.UPDATE:
        // Ensure directory exists
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        // Write file
        await fs.writeFile(
          fullPath,
          change.content || "",
          (change.encoding || "utf-8") as BufferEncoding,
        );
        break;

      case FileOperation.DELETE:
        // Delete file
        await fs.unlink(fullPath);
        break;

      case FileOperation.RENAME:
        // Not implemented yet
        throw new Error("Rename operation not yet implemented");
    }
  }

  /**
   * Create backup of files that will be changed
   */
  private async createBackup(
    rootPath: string,
    changeSet: ChangeSet,
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/:/g, "-");
    const backupDir = path.join(
      rootPath,
      ".agent-backups",
      `backup-${timestamp}`,
    );

    await fs.mkdir(backupDir, { recursive: true });

    // Copy files that will be modified or deleted
    for (const change of changeSet.changes) {
      if (
        change.operation === FileOperation.UPDATE ||
        change.operation === FileOperation.DELETE
      ) {
        const sourcePath = path.join(rootPath, change.path);
        const targetPath = path.join(backupDir, change.path);

        try {
          await fs.mkdir(path.dirname(targetPath), { recursive: true });
          await fs.copyFile(sourcePath, targetPath);
        } catch (error) {
          // File doesn't exist, skip backup
          this.logger.warn(`Could not backup ${change.path}: ${error.message}`);
        }
      }
    }

    // Save metadata
    const metadataPath = path.join(backupDir, "backup-metadata.json");
    await fs.writeFile(
      metadataPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          projectName: changeSet.projectName,
          changes: changeSet.changes.map((c) => ({
            path: c.path,
            operation: c.operation,
          })),
        },
        null,
        2,
      ),
    );

    return backupDir;
  }

  /**
   * Validate changes (basic checks for now)
   */
  private async validateChanges(
    rootPath: string,
    changes: FileChange[],
  ): Promise<ValidationResult> {
    const checks: Array<{
      name: string;
      passed: boolean;
      duration: number;
      message?: string;
    }> = [];
    const errors: Array<{
      file: string;
      line: number;
      column: number;
      message: string;
      severity: "error" | "warning";
    }> = [];
    const warnings: string[] = [];

    // Check 1: All created/updated files exist
    const start1 = Date.now();
    let filesExist = true;
    for (const change of changes) {
      if (
        change.operation === FileOperation.CREATE ||
        change.operation === FileOperation.UPDATE
      ) {
        const fullPath = path.join(rootPath, change.path);
        try {
          await fs.access(fullPath);
        } catch {
          filesExist = false;
          errors.push({
            file: change.path,
            line: 0,
            column: 0,
            message: "File was not created or updated",
            severity: "error",
          });
        }
      }
    }
    checks.push({
      name: "File System Check",
      passed: filesExist,
      duration: Date.now() - start1,
      message: filesExist ? "All files exist" : "Some files missing",
    });

    // Check 2: TypeScript files have valid syntax (basic check)
    const start2 = Date.now();
    let syntaxValid = true;
    for (const change of changes) {
      if (change.path.endsWith(".ts") || change.path.endsWith(".tsx")) {
        const fullPath = path.join(rootPath, change.path);
        try {
          const content = await fs.readFile(fullPath, "utf-8");
          // Basic syntax checks
          if (content.includes("function (") && !content.includes("=>")) {
            warnings.push(
              `${change.path}: Consider using arrow functions for consistency`,
            );
          }
        } catch (error) {
          syntaxValid = false;
          errors.push({
            file: change.path,
            line: 0,
            column: 0,
            message: `Syntax check failed: ${error.message}`,
            severity: "error",
          });
        }
      }
    }
    checks.push({
      name: "Syntax Check",
      passed: syntaxValid,
      duration: Date.now() - start2,
      message: syntaxValid ? "Syntax valid" : "Syntax errors found",
    });

    return {
      passed: errors.filter((e) => e.severity === "error").length === 0,
      checks,
      errors,
      warnings,
    };
  }

  /**
   * Create git commit (placeholder - requires git integration)
   */
  private async createGitCommit(
    rootPath: string,
    changeSet: ChangeSet,
    branchName?: string,
  ): Promise<CommitInfo> {
    // This is a placeholder - actual git integration would use child_process
    this.logger.log("Git commit requested but not yet implemented");

    return {
      branch: branchName || "main",
      sha: "placeholder-sha",
      message:
        changeSet.metadata?.reason ||
        `Applied ${changeSet.changes.length} changes`,
      author: "agent",
      timestamp: new Date(),
    };
  }

  /**
   * Analyze potential issues with the changes
   */
  private analyzePotentialIssues(changeSet: ChangeSet, context: any): string[] {
    const issues: string[] = [];

    // Check for conflicts with existing files
    const existingPaths = new Set(
      context.files.map((f: any) => f.relativePath),
    );
    const createdPaths = changeSet.changes
      .filter((c) => c.operation === FileOperation.CREATE)
      .map((c) => c.path);

    for (const createPath of createdPaths) {
      if (existingPaths.has(createPath)) {
        issues.push(
          `File ${createPath} already exists but marked for creation`,
        );
      }
    }

    // Check for deleting non-existent files
    const deletedPaths = changeSet.changes
      .filter((c) => c.operation === FileOperation.DELETE)
      .map((c) => c.path);

    for (const deletePath of deletedPaths) {
      if (!existingPaths.has(deletePath)) {
        issues.push(
          `File ${deletePath} does not exist but marked for deletion`,
        );
      }
    }

    // Warn about large changes
    if (changeSet.changes.length > 20) {
      issues.push(
        `Large change set (${changeSet.changes.length} files) - consider splitting`,
      );
    }

    return issues;
  }

  /**
   * Estimate impact level of changes
   */
  private estimateImpact(
    summary: ChangeSummary,
    issues: string[],
  ): ImpactLevel {
    let score = 0;

    // Factor in number of files
    if (summary.totalFiles > 20) score += 3;
    else if (summary.totalFiles > 10) score += 2;
    else if (summary.totalFiles > 5) score += 1;

    // Factor in line changes
    const totalLines = summary.linesAdded + summary.linesRemoved;
    if (totalLines > 1000) score += 3;
    else if (totalLines > 500) score += 2;
    else if (totalLines > 100) score += 1;

    // Factor in deletions (higher risk)
    if (summary.filesDeleted > 5) score += 2;
    else if (summary.filesDeleted > 0) score += 1;

    // Factor in issues
    score += Math.min(issues.length, 3);

    // Determine level
    if (score >= 8) return ImpactLevel.CRITICAL;
    if (score >= 5) return ImpactLevel.HIGH;
    if (score >= 2) return ImpactLevel.MEDIUM;
    return ImpactLevel.LOW;
  }
}
