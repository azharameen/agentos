import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { promises as fs } from "fs";
import * as path from "path";
import { AgentExecutionOptions } from "../../shared/agent.interface";

/**
 * Workflow version metadata
 */
export interface WorkflowVersion {
  id: string;
  name: string;
  description: string;
  version: number;
  createdAt: Date;
  configuration: {
    model?: string;
    temperature?: number;
    maxIterations?: number;
    enabledToolCategories?: string[];
    specificTools?: string[];
    useGraph?: boolean;
    enableRAG?: boolean;
  };
  metadata?: Record<string, any>;
}

/**
 * Workflow execution snapshot
 */
export interface WorkflowSnapshot {
  versionId: string;
  sessionId: string;
  timestamp: Date;
  state: {
    prompt: string;
    output: string;
    toolsUsed: string[];
    intermediateSteps?: any[];
  };
}

/**
 * Service for managing workflow versions and execution history.
 *
 * Features:
 * - Store workflow configurations with version history
 * - Track execution snapshots for debugging and rollback
 * - Retrieve and compare workflow versions
 * - Restore previous configurations
 */
@Injectable()
export class WorkflowVersioningService {
  private readonly logger = new Logger(WorkflowVersioningService.name);
  private readonly storageDir: string;
  private readonly versionsFile: string;
  private readonly snapshotsFile: string;

  private versions: Map<string, WorkflowVersion[]> = new Map();
  private snapshots: WorkflowSnapshot[] = [];

  constructor() {
    this.storageDir = path.join(process.cwd(), "data", "workflow-versions");
    this.versionsFile = path.join(this.storageDir, "versions.json");
    this.snapshotsFile = path.join(this.storageDir, "snapshots.json");
    this.init();
  }

  /**
   * Initialize storage directory and load existing data
   */
  private async init() {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      await this.loadVersions();
      await this.loadSnapshots();
      this.logger.log(
        `Workflow versioning initialized: ${this.versions.size} workflows, ${this.snapshots.length} snapshots`,
      );
    } catch (error) {
      this.logger.error(`Failed to initialize workflow versioning: ${error}`);
    }
  }

  /**
   * Load versions from disk
   */
  private async loadVersions() {
    try {
      const data = await fs.readFile(this.versionsFile, "utf-8");
      const parsed = JSON.parse(data);
      this.versions = new Map(
        Object.entries(parsed).map(([key, value]) => [
          key,
          (value as any[]).map((v) => ({
            ...v,
            createdAt: new Date(v.createdAt),
          })),
        ]),
      );
    } catch (error) {
      // File doesn't exist yet
      this.logger.debug("No existing versions file found");
    }
  }

  /**
   * Load snapshots from disk
   */
  private async loadSnapshots() {
    try {
      const data = await fs.readFile(this.snapshotsFile, "utf-8");
      const parsed = JSON.parse(data);
      this.snapshots = parsed.map((s: any) => ({
        ...s,
        timestamp: new Date(s.timestamp),
      }));
    } catch (error) {
      // File doesn't exist yet
      this.logger.debug("No existing snapshots file found");
    }
  }

  /**
   * Save versions to disk
   */
  private async saveVersions() {
    const data = Object.fromEntries(this.versions);
    await fs.writeFile(this.versionsFile, JSON.stringify(data, null, 2));
  }

  /**
   * Save snapshots to disk
   */
  private async saveSnapshots() {
    await fs.writeFile(
      this.snapshotsFile,
      JSON.stringify(this.snapshots, null, 2),
    );
  }

  /**
   * Create a new workflow version
   */
  async createVersion(
    name: string,
    description: string,
    configuration: AgentExecutionOptions,
    metadata?: Record<string, any>,
  ): Promise<WorkflowVersion> {
    const existingVersions = this.versions.get(name) || [];
    const nextVersion = existingVersions.length + 1;

    const version: WorkflowVersion = {
      id: `${name}-v${nextVersion}`,
      name,
      description,
      version: nextVersion,
      createdAt: new Date(),
      configuration: {
        model: configuration.model,
        temperature: configuration.temperature,
        maxIterations: configuration.maxIterations,
        enabledToolCategories: configuration.enabledToolCategories,
        specificTools: configuration.specificTools,
        useGraph: configuration.useGraph,
        enableRAG: configuration.enableRAG,
      },
      metadata,
    };

    existingVersions.push(version);
    this.versions.set(name, existingVersions);

    await this.saveVersions();
    this.logger.log(`Created workflow version: ${version.id}`);

    return version;
  }

  /**
   * Get all versions of a workflow
   */
  async getVersions(name: string): Promise<WorkflowVersion[]> {
    return this.versions.get(name) || [];
  }

  /**
   * Get a specific version
   */
  async getVersion(name: string, version: number): Promise<WorkflowVersion> {
    const versions = this.versions.get(name) || [];
    const found = versions.find((v) => v.version === version);

    if (!found) {
      throw new NotFoundException(
        `Workflow version not found: ${name} v${version}`,
      );
    }

    return found;
  }

  /**
   * Get the latest version of a workflow
   */
  async getLatestVersion(name: string): Promise<WorkflowVersion | null> {
    const versions = this.versions.get(name) || [];
    if (versions.length === 0) {
      return null;
    }
    return versions[versions.length - 1];
  }

  /**
   * List all workflow names
   */
  async listWorkflows(): Promise<string[]> {
    return Array.from(this.versions.keys());
  }

  /**
   * Save an execution snapshot for rollback/debugging
   */
  async saveSnapshot(
    versionId: string,
    sessionId: string,
    state: WorkflowSnapshot["state"],
  ): Promise<WorkflowSnapshot> {
    const snapshot: WorkflowSnapshot = {
      versionId,
      sessionId,
      timestamp: new Date(),
      state,
    };

    this.snapshots.push(snapshot);

    // Keep only last 1000 snapshots
    if (this.snapshots.length > 1000) {
      this.snapshots = this.snapshots.slice(-1000);
    }

    await this.saveSnapshots();
    this.logger.debug(`Saved execution snapshot: ${versionId} (${sessionId})`);

    return snapshot;
  }

  /**
   * Get snapshots for a specific version
   */
  async getSnapshots(versionId: string): Promise<WorkflowSnapshot[]> {
    return this.snapshots.filter((s) => s.versionId === versionId);
  }

  /**
   * Get snapshots for a specific session
   */
  async getSessionSnapshots(sessionId: string): Promise<WorkflowSnapshot[]> {
    return this.snapshots.filter((s) => s.sessionId === sessionId);
  }

  /**
   * Delete old snapshots (older than specified days)
   */
  async pruneSnapshots(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const originalLength = this.snapshots.length;
    this.snapshots = this.snapshots.filter((s) => s.timestamp >= cutoffDate);

    const prunedCount = originalLength - this.snapshots.length;

    if (prunedCount > 0) {
      await this.saveSnapshots();
      this.logger.log(
        `Pruned ${prunedCount} snapshots older than ${olderThanDays} days`,
      );
    }

    return prunedCount;
  }

  /**
   * Compare two workflow versions
   */
  async compareVersions(
    name: string,
    version1: number,
    version2: number,
  ): Promise<{
    version1: WorkflowVersion;
    version2: WorkflowVersion;
    differences: string[];
  }> {
    const v1 = await this.getVersion(name, version1);
    const v2 = await this.getVersion(name, version2);

    const differences: string[] = [];

    const compareField = (field: string, val1: any, val2: any) => {
      if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        differences.push(
          `${field}: ${JSON.stringify(val1)} → ${JSON.stringify(val2)}`,
        );
      }
    };

    compareField("model", v1.configuration.model, v2.configuration.model);
    compareField(
      "temperature",
      v1.configuration.temperature,
      v2.configuration.temperature,
    );
    compareField(
      "maxIterations",
      v1.configuration.maxIterations,
      v2.configuration.maxIterations,
    );
    compareField(
      "enabledToolCategories",
      v1.configuration.enabledToolCategories,
      v2.configuration.enabledToolCategories,
    );
    compareField(
      "specificTools",
      v1.configuration.specificTools,
      v2.configuration.specificTools,
    );
    compareField(
      "useGraph",
      v1.configuration.useGraph,
      v2.configuration.useGraph,
    );
    compareField(
      "enableRAG",
      v1.configuration.enableRAG,
      v2.configuration.enableRAG,
    );

    return {
      version1: v1,
      version2: v2,
      differences,
    };
  }
}
