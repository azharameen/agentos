/**
 * Code analysis interfaces
 * Used by SourceAnalyzer to extract and summarize code structure
 */

export interface FileAnalysis {
  filePath: string;
  language: string;
  symbols: SymbolInfo[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  dependencies: string[];
  summary: string;
  loc: number; // lines of code
  complexity?: number;
}

export interface SymbolInfo {
  name: string;
  kind: SymbolKind;
  startLine: number;
  endLine: number;
  signature?: string;
  documentation?: string;
  isExported: boolean;
}

export enum SymbolKind {
  CLASS = "class",
  INTERFACE = "interface",
  FUNCTION = "function",
  METHOD = "method",
  VARIABLE = "variable",
  CONSTANT = "constant",
  ENUM = "enum",
  TYPE_ALIAS = "type",
  MODULE = "module",
  DECORATOR = "decorator",
}

export interface ImportInfo {
  moduleName: string;
  importedSymbols: string[];
  isDefault: boolean;
  isNamespace: boolean;
}

export interface ExportInfo {
  symbolName: string;
  isDefault: boolean;
  kind: SymbolKind;
}

export interface ModuleSummary {
  modulePath: string;
  purpose: string;
  exports: string[];
  dependencies: string[];
  keyClasses: string[];
  keyFunctions: string[];
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

export interface DependencyNode {
  id: string;
  filePath: string;
  label: string;
  type: "module" | "external";
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: "import" | "export";
}
