import { Injectable, Logger } from "@nestjs/common";
import { promises as fs } from "fs";
import * as path from "path";
import {
  ProjectContext,
  ProjectType,
  FileIndexEntry,
  FileType,
  PackageJsonInfo,
  TsConfigInfo,
  DocumentationFile,
  ProjectRegistration,
} from "../../shared/project.interface";

@Injectable()
export class ProjectContextLoaderService {
  private readonly logger = new Logger(ProjectContextLoaderService.name);
  private readonly contextCache = new Map<string, ProjectContext>();

  // File patterns to include in scanning
  private readonly includePatterns = [
    /\.ts$/,
    /\.tsx$/,
    /\.js$/,
    /\.jsx$/,
    /\.json$/,
    /\.md$/,
    /\.yaml$/,
    /\.yml$/,
  ];

  // Directories to skip during scanning
  private readonly excludeDirs = [
    "node_modules",
    "dist",
    "build",
    ".next",
    ".git",
    "coverage",
    ".vscode",
    ".idea",
  ];

  /**
   * Load or refresh project context from filesystem
   */
  async loadProjectContext(
    registration: ProjectRegistration,
  ): Promise<ProjectContext> {
    this.logger.log(
      `Loading context for project: ${registration.name} at ${registration.path}`,
    );

    try {
      // Check if path exists and is accessible
      await this.validateProjectPath(registration.path);

      // Scan filesystem and build file index
      const files = await this.scanDirectory(registration.path);

      // Parse package.json if exists
      const packageJson = await this.parsePackageJson(registration.path);

      // Parse tsconfig.json if exists
      const tsConfig = await this.parseTsConfig(registration.path);

      // Find documentation files
      const docs = await this.findDocumentationFiles(registration.path, files);

      // Detect entry points
      const entryPoints = this.detectEntryPoints(files, packageJson);

      // Auto-detect project type if not provided
      const detectedType =
        registration.type || this.detectProjectType(packageJson, files);

      const context: ProjectContext = {
        registration: {
          ...registration,
          type: detectedType,
        },
        rootPath: registration.path,
        files,
        entryPoints,
        packageJson,
        tsConfig,
        docs,
        lastScanned: new Date(),
      };

      // Cache the context
      this.contextCache.set(registration.name, context);

      this.logger.log(
        `Context loaded for ${registration.name}: ${files.length} files indexed`,
      );

      return context;
    } catch (error) {
      this.logger.error(
        `Failed to load context for ${registration.name}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get cached project context
   */
  getCachedContext(projectName: string): ProjectContext | undefined {
    return this.contextCache.get(projectName);
  }

  /**
   * Invalidate cache for a project
   */
  invalidateCache(projectName: string): void {
    this.contextCache.delete(projectName);
    this.logger.log(`Cache invalidated for project: ${projectName}`);
  }

  /**
   * Validate that project path exists and is accessible
   */
  private async validateProjectPath(projectPath: string): Promise<void> {
    try {
      const stats = await fs.stat(projectPath);
      if (!stats.isDirectory()) {
        throw new Error(`Path is not a directory: ${projectPath}`);
      }
    } catch (error) {
      throw new Error(
        `Invalid project path: ${projectPath} - ${error.message}`,
      );
    }
  }

  /**
   * Recursively scan directory and build file index
   */
  private async scanDirectory(
    dirPath: string,
    relativeTo?: string,
  ): Promise<FileIndexEntry[]> {
    const basePath = relativeTo || dirPath;
    const entries: FileIndexEntry[] = [];

    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);

        if (item.isDirectory()) {
          // Skip excluded directories
          if (this.excludeDirs.includes(item.name)) {
            continue;
          }

          // Recursively scan subdirectory
          const subEntries = await this.scanDirectory(fullPath, basePath);
          entries.push(...subEntries);
        } else if (item.isFile()) {
          // Check if file matches include patterns
          if (this.shouldIncludeFile(item.name)) {
            const stats = await fs.stat(fullPath);
            const relativePath = path.relative(basePath, fullPath);

            entries.push({
              path: fullPath,
              relativePath: relativePath.replace(/\\/g, "/"), // Normalize path separators
              type: this.detectFileType(item.name),
              size: stats.size,
              lastModified: stats.mtime,
            });
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Error scanning directory ${dirPath}: ${error.message}`);
    }

    return entries;
  }

  /**
   * Check if file should be included based on patterns
   */
  private shouldIncludeFile(filename: string): boolean {
    return this.includePatterns.some((pattern) => pattern.test(filename));
  }

  /**
   * Detect file type from extension
   */
  private detectFileType(filename: string): FileType {
    if (filename.endsWith(".ts") || filename.endsWith(".tsx")) {
      return FileType.TYPESCRIPT;
    }
    if (filename.endsWith(".js") || filename.endsWith(".jsx")) {
      return FileType.JAVASCRIPT;
    }
    if (filename.endsWith(".json")) {
      return FileType.JSON;
    }
    if (filename.endsWith(".md")) {
      return FileType.MARKDOWN;
    }
    if (
      filename.endsWith(".yaml") ||
      filename.endsWith(".yml") ||
      filename.includes("config")
    ) {
      return FileType.CONFIG;
    }
    return FileType.OTHER;
  }

  /**
   * Parse package.json file
   */
  private async parsePackageJson(
    projectPath: string,
  ): Promise<PackageJsonInfo | undefined> {
    try {
      const packageJsonPath = path.join(projectPath, "package.json");
      const content = await fs.readFile(packageJsonPath, "utf-8");
      const parsed = JSON.parse(content);

      return {
        name: parsed.name,
        version: parsed.version,
        description: parsed.description,
        scripts: parsed.scripts,
        dependencies: parsed.dependencies,
        devDependencies: parsed.devDependencies,
      };
    } catch (error) {
      this.logger.debug(`No package.json found in ${projectPath}`);
      return undefined;
    }
  }

  /**
   * Parse tsconfig.json file
   */
  private async parseTsConfig(
    projectPath: string,
  ): Promise<TsConfigInfo | undefined> {
    try {
      const tsconfigPath = path.join(projectPath, "tsconfig.json");
      const content = await fs.readFile(tsconfigPath, "utf-8");
      const parsed = JSON.parse(content);

      return {
        compilerOptions: parsed.compilerOptions,
        include: parsed.include,
        exclude: parsed.exclude,
      };
    } catch (error) {
      this.logger.debug(`No tsconfig.json found in ${projectPath}`);
      return undefined;
    }
  }

  /**
   * Find and parse documentation files
   */
  private async findDocumentationFiles(
    projectPath: string,
    files: FileIndexEntry[],
  ): Promise<DocumentationFile[]> {
    const docFiles: DocumentationFile[] = [];
    const docFilenames = [
      "README.md",
      "ARCHITECTURE.md",
      "CONTRIBUTING.md",
      "CHANGELOG.md",
      "copilot-instructions.md",
    ];

    for (const file of files) {
      if (
        file.type === FileType.MARKDOWN &&
        docFilenames.some((name) => file.relativePath.endsWith(name))
      ) {
        try {
          const content = await fs.readFile(file.path, "utf-8");
          docFiles.push({
            path: file.relativePath,
            title: this.extractMarkdownTitle(content),
            content,
          });
        } catch (error) {
          this.logger.warn(`Failed to read doc file ${file.path}`);
        }
      }
    }

    return docFiles;
  }

  /**
   * Extract title from markdown content
   */
  private extractMarkdownTitle(content: string): string | undefined {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    return titleMatch ? titleMatch[1].trim() : undefined;
  }

  /**
   * Detect entry points (main files)
   */
  private detectEntryPoints(
    files: FileIndexEntry[],
    packageJson?: PackageJsonInfo,
  ): string[] {
    const entryPoints: string[] = [];

    // Check package.json main field
    if (packageJson?.scripts?.start) {
      // Common entry point patterns
      const commonEntries = [
        "src/main.ts",
        "src/index.ts",
        "src/app.ts",
        "index.ts",
        "main.ts",
      ];

      for (const entry of commonEntries) {
        if (files.some((f) => f.relativePath === entry)) {
          entryPoints.push(entry);
        }
      }
    }

    // If no entry points found, use first file in src/
    if (entryPoints.length === 0) {
      const srcFiles = files.filter((f) => f.relativePath.startsWith("src/"));
      if (srcFiles.length > 0) {
        entryPoints.push(srcFiles[0].relativePath);
      }
    }

    return entryPoints;
  }

  /**
   * Auto-detect project type
   */
  private detectProjectType(
    packageJson?: PackageJsonInfo,
    files?: FileIndexEntry[],
  ): ProjectType {
    if (!packageJson) {
      return ProjectType.UNKNOWN;
    }

    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    // Check for NestJS
    if (deps["@nestjs/core"] || deps["@nestjs/common"]) {
      return ProjectType.NESTJS_BACKEND;
    }

    // Check for Next.js
    if (deps["next"]) {
      return ProjectType.NEXTJS_FRONTEND;
    }

    // Check for React
    if (deps["react"]) {
      return ProjectType.REACT_APP;
    }

    // Check for TypeScript library
    if (
      files?.some((f) => f.relativePath === "tsconfig.json") &&
      !deps["react"] &&
      !deps["next"]
    ) {
      return ProjectType.TYPESCRIPT_LIB;
    }

    // Check for documentation project
    if (files?.every((f) => f.type === FileType.MARKDOWN)) {
      return ProjectType.DOCUMENTATION;
    }

    return ProjectType.NODE_MODULE;
  }
}
