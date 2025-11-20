/**
 * Project registration and context interfaces
 * Used by AgentManager to track and analyze registered projects
 */

export interface ProjectRegistration {
  name: string;
  path: string;
  type?: ProjectType;
  registeredAt: Date;
}

export enum ProjectType {
  NESTJS_BACKEND = "nestjs-backend",
  NEXTJS_FRONTEND = "nextjs-frontend",
  REACT_APP = "react-app",
  NODE_MODULE = "node-module",
  TYPESCRIPT_LIB = "typescript-lib",
  DOCUMENTATION = "documentation",
  UNKNOWN = "unknown",
}

export interface ProjectContext {
  registration: ProjectRegistration;
  rootPath: string;
  files: FileIndexEntry[];
  entryPoints: string[];
  packageJson?: PackageJsonInfo;
  tsConfig?: TsConfigInfo;
  docs: DocumentationFile[];
  lastScanned: Date;
}

export interface FileIndexEntry {
  path: string;
  relativePath: string;
  type: FileType;
  size: number;
  lastModified: Date;
}

export enum FileType {
  TYPESCRIPT = "typescript",
  JAVASCRIPT = "javascript",
  JSON = "json",
  MARKDOWN = "markdown",
  CONFIG = "config",
  OTHER = "other",
}

export interface PackageJsonInfo {
  name?: string;
  version?: string;
  description?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface TsConfigInfo {
  compilerOptions?: Record<string, any>;
  include?: string[];
  exclude?: string[];
}

export interface DocumentationFile {
  path: string;
  title?: string;
  content: string;
}

export interface ProjectSummary {
  name: string;
  path: string;
  type: ProjectType;
  fileCount: number;
  mainLanguage: string;
  hasTests: boolean;
  framework?: string;
  lastScanned: Date;
}
