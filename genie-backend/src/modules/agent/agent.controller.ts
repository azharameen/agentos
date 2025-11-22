import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Res,
  HttpStatus,
  Query,
  Logger,
  Req,
  Inject,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from "@nestjs/swagger";
import { AgenticTaskDto } from "./dto/agentic-task.dto";
import {
  RegisterProjectDto,
  ProjectListResponseDto,
  ProjectRegistrationResponseDto,
} from "./dto/project.dto";
import { AnalyzeCodeDto } from "./dto/agent-chat.dto";
import { PreviewCodeChangesDto, ApplyCodeChangesDto } from "./dto/code-ops.dto";
import { AgentCoordinationService } from "./agent-coordination.service";
import { ProjectContextLoaderService } from "../rag/project-context-loader.service";
import { SourceAnalyzerService } from "../rag/source-analyzer.service";
import { CodeOpsService } from "../code-ops/code-ops.service";
import { AgentManagerService } from "./agent-manager.service";
import type { Response, Request } from "express";
import { ProjectSummary, ProjectType } from "../../shared/project.interface";
import {
  FileAnalysis,
  ModuleSummary,
  DependencyGraph,
} from "../../shared/analysis.interface";
import { PreviewResult, ApplyResult } from "../../shared/code-ops.interface";
import { AnalyzeSuggestDto } from "./dto/chat.dto";
import { ChatResponse } from "../../shared/chat.interface";
import type { IProjectRepository } from './repositories/project.repository.interface';
import { Project } from './repositories/project.entity';

@ApiTags("agent")
@Controller("agent")
export class AgentController {
  private readonly logger = new Logger(AgentController.name);

  constructor(
    private readonly agentCoordination: AgentCoordinationService,
    private readonly projectContextLoader: ProjectContextLoaderService,
    private readonly sourceAnalyzer: SourceAnalyzerService,
    private readonly codeOps: CodeOpsService,
    private readonly agentManager: AgentManagerService,
    @Inject('IProjectRepository') private readonly projectRepository: IProjectRepository,
  ) { }

  @Post("projects/register")
  @ApiOperation({
    summary: "Register a project for agent management",
    description:
      "Registers a project path and loads its context for code understanding and generation",
  })
  @ApiBody({ type: RegisterProjectDto })
  @ApiResponse({
    status: 200,
    description: "Project successfully registered",
    type: ProjectRegistrationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Invalid project path or registration failed",
  })
  async registerProject(
    @Body() dto: RegisterProjectDto,
  ): Promise<ProjectRegistrationResponseDto> {
    try {
      // Check if project already registered
      const existing = await this.projectRepository.findByName(dto.name);
      if (existing) {
        throw new Error(`Project "${dto.name}" is already registered`);
      }

      // Load project context
      const context = await this.projectContextLoader.loadProjectContext({
        name: dto.name,
        path: dto.path,
        type: dto.type,
        registeredAt: new Date(),
      });

      // Create project entity
      const project: Project = {
        name: context.registration.name,
        path: context.rootPath,
        type: context.registration.type || ProjectType.UNKNOWN,
        fileCount: context.files.length,
        mainLanguage: this.detectMainLanguage(context.files),
        hasTests: context.files.some(
          (f) =>
            f.relativePath.includes("test") || f.relativePath.includes("spec"),
        ),
        framework: context.packageJson?.dependencies?.["@nestjs/core"]
          ? "NestJS"
          : context.packageJson?.dependencies?.["next"]
            ? "Next.js"
            : context.packageJson?.dependencies?.["react"]
              ? "React"
              : undefined,
        lastScanned: context.lastScanned,
      };

      // Save to repository
      await this.projectRepository.save(project);

      return {
        status: "success",
        projectName: dto.name,
        summary: {
          type: project.type,
          fileCount: project.fileCount,
          mainLanguage: project.mainLanguage,
          framework: project.framework,
        },
      };
    } catch (error) {
      throw new Error(`Failed to register project: ${error.message}`);
    }
  }

  @Get("projects")
  @ApiOperation({
    summary: "List all registered projects",
    description: "Returns a list of all projects registered with the agent",
  })
  @ApiResponse({
    status: 200,
    description: "List of registered projects",
    type: ProjectListResponseDto,
  })
  async listProjects(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20
  ): Promise<ProjectListResponseDto> {
    const result = await this.projectRepository.findAll({
      page: Number(page),
      pageSize: Number(pageSize)
    });

    const projects = result.data.map(p => ({
      name: p.name,
      path: p.path,
      type: p.type,
      fileCount: p.fileCount,
      mainLanguage: p.mainLanguage,
      hasTests: p.hasTests,
      framework: p.framework,
      lastScanned: p.lastScanned
    }));

    return {
      projects,
      meta: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages
      }
    };
  }

  @Get("projects/:name")
  @ApiOperation({
    summary: "Get project details",
    description: "Returns detailed information about a registered project",
  })
  @ApiQuery({ name: "name", required: true, description: "Project name" })
  @ApiResponse({
    status: 200,
    description: "Project details",
  })
  @ApiResponse({
    status: 404,
    description: "Project not found",
  })
  async getProject(@Query("name") name: string): Promise<ProjectSummary> {
    const project = await this.projectRepository.findByName(name);
    if (!project) {
      throw new Error(`Project "${name}" not found`);
    }
    return {
      name: project.name,
      path: project.path,
      type: project.type,
      fileCount: project.fileCount,
      mainLanguage: project.mainLanguage,
      hasTests: project.hasTests,
      framework: project.framework,
      lastScanned: project.lastScanned
    };
  }

  @Delete("projects/:name")
  @ApiOperation({
    summary: "Delete a project",
    description: "Removes a project from the registry",
  })
  @ApiQuery({ name: "name", required: true, description: "Project name" })
  @ApiResponse({
    status: 200,
    description: "Project deleted successfully",
  })
  @ApiResponse({
    status: 404,
    description: "Project not found",
  })
  async deleteProject(@Query("name") name: string): Promise<{ status: string }> {
    const deleted = await this.projectRepository.delete(name);
    if (!deleted) {
      throw new Error(`Project "${name}" not found`);
    }
    return { status: "success" };
  }

  private detectMainLanguage(files: any[]): string {
    const tsFiles = files.filter((f) => f.type === "typescript").length;
    const jsFiles = files.filter((f) => f.type === "javascript").length;

    if (tsFiles > jsFiles) return "TypeScript";
    if (jsFiles > 0) return "JavaScript";
    return "Unknown";
  }

  // Code analysis endpoints
  @Post("analyze/file")
  @ApiOperation({
    summary: "Analyze a specific file in a registered project",
    description:
      "Returns detailed code analysis including symbols, imports, exports, and complexity metrics",
  })
  @ApiBody({ type: AnalyzeCodeDto })
  @ApiResponse({
    status: 200,
    description: "File analysis result",
    type: Object,
  })
  async analyzeFile(@Body() dto: AnalyzeCodeDto): Promise<FileAnalysis> {
    return this.sourceAnalyzer.analyzeFile(dto.projectName, dto.path, {
      detailed: dto.detailed,
    });
  }

  @Post("analyze/module")
  @ApiOperation({
    summary: "Analyze a module (directory) in a registered project",
    description:
      "Returns module-level analysis including key classes, functions, and dependencies",
  })
  @ApiBody({ type: AnalyzeCodeDto })
  @ApiResponse({
    status: 200,
    description: "Module analysis result",
    type: Object,
  })
  async analyzeModule(@Body() dto: AnalyzeCodeDto): Promise<ModuleSummary> {
    return this.sourceAnalyzer.analyzeModule(dto.projectName, dto.path);
  }

  @Get("analyze/dependencies")
  @ApiOperation({
    summary: "Generate dependency graph for a project",
    description:
      "Returns a graph of all internal and external dependencies in the project",
  })
  @ApiQuery({
    name: "projectName",
    required: true,
    description: "Project name",
  })
  @ApiResponse({
    status: 200,
    description: "Dependency graph",
    type: Object,
  })
  async getDependencyGraph(
    @Query("projectName") projectName: string,
  ): Promise<DependencyGraph> {
    return this.sourceAnalyzer.generateDependencyGraph(projectName);
  }

  // Code operations endpoints
  @Post("code/preview")
  @ApiOperation({
    summary: "Preview code changes without applying them",
    description:
      "Generates diffs and impact analysis for proposed code changes",
  })
  @ApiBody({ type: PreviewCodeChangesDto })
  @ApiResponse({
    status: 200,
    description: "Preview result with diffs and analysis",
    type: Object,
  })
  async previewCodeChanges(
    @Body() dto: PreviewCodeChangesDto,
  ): Promise<PreviewResult> {
    return this.codeOps.previewChanges({
      projectName: dto.projectName,
      changes: dto.changes.map((c) => ({
        path: c.path,
        operation: c.operation,
        content: c.content,
      })),
      metadata: {
        reason: dto.reason,
        timestamp: new Date(),
      },
    });
  }

  @Post("code/apply")
  @ApiOperation({
    summary: "Apply code changes to the filesystem",
    description:
      "Applies changes with optional backup, validation, and git commit",
  })
  @ApiBody({ type: ApplyCodeChangesDto })
  @ApiResponse({
    status: 200,
    description: "Apply result with validation and rollback info",
    type: Object,
  })
  async applyCodeChanges(
    @Body() dto: ApplyCodeChangesDto,
  ): Promise<ApplyResult> {
    return this.codeOps.applyChanges(
      {
        projectName: dto.projectName,
        changes: dto.changes.map((c) => ({
          path: c.path,
          operation: c.operation,
          content: c.content,
        })),
        metadata: {
          reason: dto.reason,
          timestamp: new Date(),
        },
      },
      {
        skipValidation: dto.skipValidation,
        createBackup: dto.createBackup ?? true,
        gitCommit: dto.gitCommit,
        gitBranch: dto.gitBranch,
      },
    );
  }

  @Post("execute")
  @ApiOperation({
    summary: "Execute agentic workflow (multi-agent, debate, router, etc.)",
    description: "Executes agentic workflows with advanced modes via DTO.",
  })
  @ApiBody({ type: AgenticTaskDto })
  @ApiResponse({
    status: 200,
    description: "Agentic workflow execution result.",
    type: Object,
  })
  async executeAgenticTask(
    @Body() body: AgenticTaskDto,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<any> {
    // Always stream response
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    try {
      const sessionId =
        body.sessionId ??
        `session-${Math.random().toString(36).substring(2, 10)}`;
      const abortController = new AbortController();
      const signal = abortController.signal;

      // Handle client disconnection
      req.on("close", () => {
        this.logger.log(`Client disconnected for session ${sessionId}`);
        abortController.abort();
      });

      const stream = this.agentCoordination.executeTaskStream(
        body.prompt,
        sessionId,
        {
          model: body.model,
          agent: body.agent,
          temperature: body.temperature,
          maxIterations: body.maxIterations,
          enabledToolCategories: body.enabledToolCategories,
          specificTools: body.specificTools,
          useGraph: body.useGraph,
          enableRAG: body.enableRAG,
        },
        signal,
      );
      for await (const chunk of stream) {
        // Always write as newline-delimited JSON
        // this.logger.debug(`Streaming chunk: ${chunk.type}`);
        res.write(JSON.stringify(chunk) + "\n");
      }
      res.end();
    } catch (err) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR);
      res.write(
        JSON.stringify({
          type: "RUN_ERROR",
          data: { error: (err as Error).message },
        }) + "\n",
      );
      res.end();
    }
    return;
  }

  @Post("analyze-suggest")
  @ApiOperation({
    summary: "Analyze code and suggest improvements",
    description: "Analyze a specific file and get suggestions for improvements",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        projectName: { type: "string", description: "Project name" },
        filePath: { type: "string", description: "File path to analyze" },
      },
      required: ["projectName", "filePath"],
    },
  })
  @ApiResponse({
    status: 200,
    description: "Analysis results with suggestions",
  })
  async analyzeSuggest(
    @Body() body: AnalyzeSuggestDto,
  ): Promise<ChatResponse> {
    return this.agentManager.analyzeAndSuggest(body.projectName, body.filePath);
  }
}
