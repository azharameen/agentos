import { Injectable, Logger } from "@nestjs/common";
import { promises as fs } from "fs";
import * as ts from "typescript";
import * as path from "path";
import {
  FileAnalysis,
  SymbolInfo,
  SymbolKind,
  ImportInfo,
  ExportInfo,
  ModuleSummary,
  DependencyGraph,
  DependencyNode,
  DependencyEdge,
} from "../../shared/analysis.interface";
import { ProjectContextLoaderService } from "./project-context-loader.service";

@Injectable()
export class SourceAnalyzerService {
  private readonly logger = new Logger(SourceAnalyzerService.name);

  constructor(
    private readonly projectContextLoader: ProjectContextLoaderService,
  ) { }

  /**
   * Analyze a TypeScript/JavaScript file
   */
  async analyzeFile(
    projectName: string,
    filePath: string,
    options?: { detailed?: boolean },
  ): Promise<FileAnalysis> {
    this.logger.log(`Analyzing file: ${filePath} in project ${projectName}`);

    try {
      // Get project context
      const context = this.projectContextLoader.getCachedContext(projectName);
      if (!context) {
        throw new Error(`Project "${projectName}" not found`);
      }

      // Resolve full path
      const fullPath = path.isAbsolute(filePath)
        ? filePath
        : path.join(context.rootPath, filePath);

      // Read file content
      const content = await fs.readFile(fullPath, "utf-8");

      // Detect language
      const language = this.detectLanguage(fullPath);

      // Create source file
      const sourceFile = ts.createSourceFile(
        fullPath,
        content,
        ts.ScriptTarget.Latest,
        true,
      );

      // Extract symbols
      const symbols = this.extractSymbols(sourceFile);

      // Extract imports
      const imports = this.extractImports(sourceFile);

      // Extract exports
      const exports = this.extractExports(sourceFile);

      // Extract dependencies
      const dependencies = imports.map((imp) => imp.moduleName);

      // Generate summary
      const summary = options?.detailed
        ? this.generateDetailedSummary(symbols, imports, exports, content)
        : this.generateBasicSummary(symbols);

      // Calculate lines of code
      const loc = content.split("\n").length;

      // Calculate complexity (basic cyclomatic complexity)
      const complexity = this.calculateComplexity(sourceFile);

      const analysis: FileAnalysis = {
        filePath: path.relative(context.rootPath, fullPath),
        language,
        symbols,
        imports,
        exports,
        dependencies,
        summary,
        loc,
        complexity,
      };

      this.logger.log(
        `Analysis complete for ${filePath}: ${symbols.length} symbols found`,
      );

      return analysis;
    } catch (error) {
      this.logger.error(`Failed to analyze file ${filePath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze a module (directory with multiple files)
   */
  async analyzeModule(
    projectName: string,
    modulePath: string,
  ): Promise<ModuleSummary> {
    this.logger.log(
      `Analyzing module: ${modulePath} in project ${projectName}`,
    );

    try {
      const context = this.projectContextLoader.getCachedContext(projectName);
      if (!context) {
        throw new Error(`Project "${projectName}" not found`);
      }

      // Find all files in the module
      const moduleFiles = context.files.filter((f) =>
        f.relativePath.startsWith(modulePath),
      );

      // Analyze each file
      const analyses = await Promise.all(
        moduleFiles.map((f) => this.analyzeFile(projectName, f.relativePath)),
      );

      // Aggregate results
      const exports = [
        ...new Set(analyses.flatMap((a) => a.exports.map((e) => e.symbolName))),
      ];
      const dependencies = [
        ...new Set(analyses.flatMap((a) => a.dependencies)),
      ];
      const keyClasses = [
        ...new Set(
          analyses.flatMap((a) =>
            a.symbols
              .filter((s) => s.kind === SymbolKind.CLASS && s.isExported)
              .map((s) => s.name),
          ),
        ),
      ];
      const keyFunctions = [
        ...new Set(
          analyses.flatMap((a) =>
            a.symbols
              .filter((s) => s.kind === SymbolKind.FUNCTION && s.isExported)
              .map((s) => s.name),
          ),
        ),
      ];

      const purpose = this.inferModulePurpose(
        modulePath,
        keyClasses,
        keyFunctions,
      );

      return {
        modulePath,
        purpose,
        exports,
        dependencies,
        keyClasses,
        keyFunctions,
      };
    } catch (error) {
      this.logger.error(
        `Failed to analyze module ${modulePath}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Generate dependency graph for a project
   */
  async generateDependencyGraph(projectName: string): Promise<DependencyGraph> {
    this.logger.log(`Generating dependency graph for project ${projectName}`);

    try {
      const context = this.projectContextLoader.getCachedContext(projectName);
      if (!context) {
        throw new Error(`Project "${projectName}" not found`);
      }

      const nodes: DependencyNode[] = [];
      const edges: DependencyEdge[] = [];
      const nodeMap = new Map<string, DependencyNode>();

      // Analyze all TypeScript/JavaScript files
      const codeFiles = context.files.filter(
        (f) => f.type === "typescript" || f.type === "javascript",
      );

      for (const file of codeFiles) {
        const fileId = file.relativePath;

        // Add node if not exists
        if (!nodeMap.has(fileId)) {
          const node: DependencyNode = {
            id: fileId,
            filePath: file.relativePath,
            label: path.basename(file.relativePath),
            type: "module",
          };
          nodes.push(node);
          nodeMap.set(fileId, node);
        }

        // Analyze file to get imports
        try {
          const analysis = await this.analyzeFile(
            projectName,
            file.relativePath,
          );

          // Add edges for each import
          for (const imp of analysis.imports) {
            // Check if it's a relative import (internal dependency)
            if (imp.moduleName.startsWith(".")) {
              const resolvedPath = this.resolveImportPath(
                file.relativePath,
                imp.moduleName,
              );

              if (!nodeMap.has(resolvedPath)) {
                const node: DependencyNode = {
                  id: resolvedPath,
                  filePath: resolvedPath,
                  label: path.basename(resolvedPath),
                  type: "module",
                };
                nodes.push(node);
                nodeMap.set(resolvedPath, node);
              }

              edges.push({
                from: fileId,
                to: resolvedPath,
                type: "import",
              });
            } else {
              // External dependency
              if (!nodeMap.has(imp.moduleName)) {
                const node: DependencyNode = {
                  id: imp.moduleName,
                  filePath: imp.moduleName,
                  label: imp.moduleName,
                  type: "external",
                };
                nodes.push(node);
                nodeMap.set(imp.moduleName, node);
              }

              edges.push({
                from: fileId,
                to: imp.moduleName,
                type: "import",
              });
            }
          }
        } catch (error) {
          this.logger.warn(
            `Failed to analyze ${file.relativePath}: ${error.message}`,
          );
        }
      }

      this.logger.log(
        `Dependency graph generated: ${nodes.length} nodes, ${edges.length} edges`,
      );

      return { nodes, edges };
    } catch (error) {
      this.logger.error(
        `Failed to generate dependency graph: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Extract symbols from source file
   */
  private extractSymbols(sourceFile: ts.SourceFile): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];

    const visit = (node: ts.Node) => {
      // Classes
      if (ts.isClassDeclaration(node) && node.name) {
        const hasExport = node.modifiers?.some(
          (m) => m.kind === ts.SyntaxKind.ExportKeyword,
        );
        symbols.push({
          name: node.name.text,
          kind: SymbolKind.CLASS,
          startLine:
            sourceFile.getLineAndCharacterOfPosition(node.pos).line + 1,
          endLine: sourceFile.getLineAndCharacterOfPosition(node.end).line + 1,
          signature: node.name.text,
          documentation: this.extractJsDoc(node),
          isExported: hasExport || false,
        });
      }

      // Interfaces
      if (ts.isInterfaceDeclaration(node)) {
        const hasExport = node.modifiers?.some(
          (m) => m.kind === ts.SyntaxKind.ExportKeyword,
        );
        symbols.push({
          name: node.name.text,
          kind: SymbolKind.INTERFACE,
          startLine:
            sourceFile.getLineAndCharacterOfPosition(node.pos).line + 1,
          endLine: sourceFile.getLineAndCharacterOfPosition(node.end).line + 1,
          signature: node.name.text,
          documentation: this.extractJsDoc(node),
          isExported: hasExport || false,
        });
      }

      // Functions
      if (ts.isFunctionDeclaration(node) && node.name) {
        const hasExport = node.modifiers?.some(
          (m) => m.kind === ts.SyntaxKind.ExportKeyword,
        );
        symbols.push({
          name: node.name.text,
          kind: SymbolKind.FUNCTION,
          startLine:
            sourceFile.getLineAndCharacterOfPosition(node.pos).line + 1,
          endLine: sourceFile.getLineAndCharacterOfPosition(node.end).line + 1,
          signature: this.getFunctionSignature(node),
          documentation: this.extractJsDoc(node),
          isExported: hasExport || false,
        });
      }

      // Enums
      if (ts.isEnumDeclaration(node)) {
        const hasExport = node.modifiers?.some(
          (m) => m.kind === ts.SyntaxKind.ExportKeyword,
        );
        symbols.push({
          name: node.name.text,
          kind: SymbolKind.ENUM,
          startLine:
            sourceFile.getLineAndCharacterOfPosition(node.pos).line + 1,
          endLine: sourceFile.getLineAndCharacterOfPosition(node.end).line + 1,
          signature: node.name.text,
          documentation: this.extractJsDoc(node),
          isExported: hasExport || false,
        });
      }

      // Type aliases
      if (ts.isTypeAliasDeclaration(node)) {
        const hasExport = node.modifiers?.some(
          (m) => m.kind === ts.SyntaxKind.ExportKeyword,
        );
        symbols.push({
          name: node.name.text,
          kind: SymbolKind.TYPE_ALIAS,
          startLine:
            sourceFile.getLineAndCharacterOfPosition(node.pos).line + 1,
          endLine: sourceFile.getLineAndCharacterOfPosition(node.end).line + 1,
          signature: node.name.text,
          isExported: hasExport || false,
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return symbols;
  }

  /**
   * Extract imports from source file
   */
  private extractImports(sourceFile: ts.SourceFile): ImportInfo[] {
    const imports: ImportInfo[] = [];

    sourceFile.statements.forEach((statement) => {
      if (ts.isImportDeclaration(statement)) {
        const moduleSpecifier = statement.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          const moduleName = moduleSpecifier.text;
          const importClause = statement.importClause;

          if (importClause) {
            const importedSymbols: string[] = [];
            let isDefault = false;
            let isNamespace = false;

            // Default import
            if (importClause.name) {
              importedSymbols.push(importClause.name.text);
              isDefault = true;
            }

            // Named imports
            if (importClause.namedBindings) {
              if (ts.isNamedImports(importClause.namedBindings)) {
                importClause.namedBindings.elements.forEach((el) => {
                  importedSymbols.push(el.name.text);
                });
              } else if (ts.isNamespaceImport(importClause.namedBindings)) {
                importedSymbols.push(importClause.namedBindings.name.text);
                isNamespace = true;
              }
            }

            imports.push({
              moduleName,
              importedSymbols,
              isDefault,
              isNamespace,
            });
          }
        }
      }
    });

    return imports;
  }

  /**
   * Extract exports from source file
   */
  private extractExports(sourceFile: ts.SourceFile): ExportInfo[] {
    const exports: ExportInfo[] = [];

    sourceFile.statements.forEach((statement) => {
      // Export declarations
      if (ts.isExportDeclaration(statement)) {
        if (
          statement.exportClause &&
          ts.isNamedExports(statement.exportClause)
        ) {
          statement.exportClause.elements.forEach((el) => {
            exports.push({
              symbolName: el.name.text,
              isDefault: false,
              kind: SymbolKind.VARIABLE, // Default to variable
            });
          });
        }
      }

      // Export default
      if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
        exports.push({
          symbolName: "default",
          isDefault: true,
          kind: SymbolKind.VARIABLE,
        });
      }
    });

    return exports;
  }

  /**
   * Extract JSDoc comments
   */
  private extractJsDoc(node: ts.Node): string | undefined {
    const jsDocTags = (node as any).jsDoc;
    if (jsDocTags && jsDocTags.length > 0) {
      return jsDocTags[0].comment;
    }
    return undefined;
  }

  /**
   * Get function signature
   */
  private getFunctionSignature(node: ts.FunctionDeclaration): string {
    const params = node.parameters.map((p) => p.name.getText()).join(", ");
    return `${node.name?.text}(${params})`;
  }

  /**
   * Calculate cyclomatic complexity
   */
  private calculateComplexity(sourceFile: ts.SourceFile): number {
    let complexity = 1;

    const visit = (node: ts.Node) => {
      // Count decision points
      if (
        ts.isIfStatement(node) ||
        ts.isConditionalExpression(node) ||
        ts.isForStatement(node) ||
        ts.isForInStatement(node) ||
        ts.isForOfStatement(node) ||
        ts.isWhileStatement(node) ||
        ts.isDoStatement(node) ||
        ts.isCaseClause(node) ||
        ts.isCatchClause(node)
      ) {
        complexity++;
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return complexity;
  }

  /**
   * Detect file language
   */
  private detectLanguage(filePath: string): string {
    if (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) {
      return "TypeScript";
    }
    if (filePath.endsWith(".js") || filePath.endsWith(".jsx")) {
      return "JavaScript";
    }
    return "Unknown";
  }

  /**
   * Generate basic summary
   */
  private generateBasicSummary(symbols: SymbolInfo[]): string {
    const classes = symbols.filter((s) => s.kind === SymbolKind.CLASS).length;
    const functions = symbols.filter(
      (s) => s.kind === SymbolKind.FUNCTION,
    ).length;
    const interfaces = symbols.filter(
      (s) => s.kind === SymbolKind.INTERFACE,
    ).length;

    return `Contains ${classes} class(es), ${functions} function(s), and ${interfaces} interface(s)`;
  }

  /**
   * Generate detailed summary
   */
  private generateDetailedSummary(
    symbols: SymbolInfo[],
    imports: ImportInfo[],
    exports: ExportInfo[],
    content: string,
  ): string {
    const exportedSymbols = symbols.filter((s) => s.isExported);
    const lines = [
      `File contains ${symbols.length} symbols (${exportedSymbols.length} exported)`,
    ];

    if (imports.length > 0) {
      lines.push(`Imports from ${imports.length} module(s)`);
    }

    if (exports.length > 0) {
      lines.push(`Exports ${exports.length} symbol(s)`);
    }

    return lines.join(". ");
  }

  /**
   * Infer module purpose from structure
   */
  private inferModulePurpose(
    modulePath: string,
    keyClasses: string[],
    keyFunctions: string[],
  ): string {
    const pathLower = modulePath.toLowerCase();

    if (pathLower.includes("controller"))
      return "API Controllers and route handlers";
    if (pathLower.includes("service"))
      return "Business logic and service layer";
    if (pathLower.includes("model") || pathLower.includes("entity"))
      return "Data models and entities";
    if (pathLower.includes("dto")) return "Data transfer objects";
    if (pathLower.includes("util") || pathLower.includes("helper"))
      return "Utility functions and helpers";
    if (pathLower.includes("test") || pathLower.includes("spec"))
      return "Test files";
    if (pathLower.includes("component")) return "React components";

    if (keyClasses.length > 0)
      return `Module containing ${keyClasses.join(", ")}`;
    if (keyFunctions.length > 0)
      return `Module with functions: ${keyFunctions.join(", ")}`;

    return "General purpose module";
  }

  /**
   * Resolve relative import path
   */
  private resolveImportPath(currentFile: string, importPath: string): string {
    const currentDir = path.dirname(currentFile);
    let resolved = path.join(currentDir, importPath);

    // Add extension if missing
    if (!resolved.endsWith(".ts") && !resolved.endsWith(".js")) {
      resolved += ".ts";
    }

    return resolved.replace(/\\/g, "/");
  }
}
