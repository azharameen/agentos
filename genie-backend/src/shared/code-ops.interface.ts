/**
 * Code operations interfaces
 * Used by CodeOps service to generate, preview, and apply code changes
 */

export interface ChangeSet {
  projectName: string;
  changes: FileChange[];
  metadata?: ChangeMetadata;
}

export interface FileChange {
  path: string;
  operation: FileOperation;
  content?: string;
  oldContent?: string;
  encoding?: string;
}

export enum FileOperation {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  RENAME = "rename",
}

export interface ChangeMetadata {
  reason?: string;
  author?: string;
  timestamp?: Date;
  relatedIssue?: string;
}

export interface PreviewResult {
  projectName: string;
  diffs: FileDiff[];
  summary: ChangeSummary;
  potentialIssues: string[];
  estimatedImpact: ImpactLevel;
}

export interface FileDiff {
  path: string;
  operation: FileOperation;
  diff: string; // unified diff format
  linesAdded: number;
  linesRemoved: number;
  linesChanged: number;
}

export interface ChangeSummary {
  totalFiles: number;
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  linesAdded: number;
  linesRemoved: number;
}

export enum ImpactLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export interface ApplyResult {
  projectName: string;
  success: boolean;
  appliedChanges: FileChange[];
  failedChanges: FailedChange[];
  validation?: ValidationResult;
  commit?: CommitInfo;
  rollback?: RollbackInfo;
}

export interface FailedChange {
  change: FileChange;
  error: string;
  recoverable: boolean;
}

export interface ValidationResult {
  passed: boolean;
  checks: ValidationCheck[];
  errors: ValidationError[];
  warnings: string[];
}

export interface ValidationCheck {
  name: string;
  passed: boolean;
  duration: number;
  message?: string;
}

export interface ValidationError {
  file: string;
  line: number;
  column: number;
  message: string;
  severity: "error" | "warning";
}

export interface CommitInfo {
  branch: string;
  sha: string;
  message: string;
  author: string;
  timestamp: Date;
}

export interface RollbackInfo {
  available: boolean;
  backupPath?: string;
  canRevert: boolean;
}

export interface ApplyOptions {
  skipValidation?: boolean;
  createBackup?: boolean;
  gitCommit?: boolean;
  gitBranch?: string;
  dryRun?: boolean;
}
