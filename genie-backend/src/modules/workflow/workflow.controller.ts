import { Controller, Get, Post, Param, Body, Res, Req, HttpStatus, NotFoundException, Logger } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags, ApiBody } from "@nestjs/swagger";
import { WorkflowVersioningService } from "./workflow-versioning.service";
import { AgentCoordinationService } from "../agent/agent-coordination.service";
import { ExecuteWorkflowDto } from "./dto/workflow.dto";
import type { Response, Request } from "express";

@ApiTags("Workflow")
@Controller("workflow")
export class WorkflowController {
  private readonly logger = new Logger(WorkflowController.name);

  constructor(
    private readonly workflowVersioning: WorkflowVersioningService,
    private readonly agentCoordination: AgentCoordinationService,
  ) { }

  @Get("workflows")
  @ApiOperation({ summary: "List all workflow names" })
  @ApiResponse({ status: 200, description: "List of workflow names." })
  async listWorkflows() {
    return await this.workflowVersioning.listWorkflows();
  }

  @Get("workflows/:name/versions")
  @ApiOperation({ summary: "Get all versions of a workflow" })
  @ApiResponse({ status: 200, description: "List of workflow versions." })
  async getWorkflowVersions(@Param("name") name: string) {
    return await this.workflowVersioning.getWorkflowVersions(name);
  }

  @Get("workflows/:name/versions/:version")
  @ApiOperation({ summary: "Get a specific workflow version" })
  @ApiResponse({ status: 200, description: "Workflow version details." })
  async getWorkflowVersion(
    @Param("name") name: string,
    @Param("version") version: string,
  ) {
    return await this.workflowVersioning.getWorkflowVersion(name, version);
  }

  @Get("workflows/:name/versions/latest")
  @ApiOperation({ summary: "Get the latest version of a workflow" })
  @ApiResponse({ status: 200, description: "Latest workflow version." })
  async getLatestWorkflowVersion(@Param("name") name: string) {
    return await this.workflowVersioning.getLatestWorkflowVersion(name);
  }

  @Get("workflows/:name/versions/:version/snapshots")
  @ApiOperation({ summary: "Get execution snapshots for a workflow version" })
  @ApiResponse({ status: 200, description: "List of execution snapshots." })
  async getVersionSnapshots(
    @Param("name") name: string,
    @Param("version") version: string,
  ) {
    return await this.workflowVersioning.getVersionSnapshots(name, version);
  }

  @Get("workflows/:name/compare/:version1/:version2")
  @ApiOperation({ summary: "Compare two workflow versions" })
  @ApiResponse({
    status: 200,
    description: "Comparison of workflow versions with differences.",
  })
  async compareWorkflowVersions(
    @Param("name") name: string,
    @Param("version1") version1: string,
    @Param("version2") version2: string,
  ) {
    return await this.workflowVersioning.compareWorkflowVersions(
      name,
      version1,
      version2,
    );
  }

  @Post("workflows/:name/execute")
  @ApiOperation({ summary: "Execute a named workflow" })
  @ApiBody({ type: ExecuteWorkflowDto })
  @ApiResponse({ status: 200, description: "Workflow execution result." })
  async executeWorkflow(
    @Param("name") name: string,
    @Body() dto: ExecuteWorkflowDto,
  ) {
    // Get workflow config
    const version = dto.version
      ? await this.workflowVersioning.getWorkflowVersion(name, dto.version)
      : await this.workflowVersioning.getLatestWorkflowVersion(name);

    if (!version) {
      throw new NotFoundException(`Workflow "${name}" not found`);
    }

    const sessionId = dto.sessionId || `session-${Date.now()}`;

    // Execute using coordination service
    return await this.agentCoordination.executeTask(
      dto.prompt,
      sessionId,
      {
        ...version.configuration,
        workflowVersion: String(version.version),
      }
    );
  }

  @Post("workflows/:name/execute/stream")
  @ApiOperation({ summary: "Stream execution of a named workflow" })
  @ApiBody({ type: ExecuteWorkflowDto })
  @ApiResponse({ status: 200, description: "Streaming workflow execution." })
  async executeWorkflowStream(
    @Param("name") name: string,
    @Body() dto: ExecuteWorkflowDto,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    // Get workflow config
    const version = dto.version
      ? await this.workflowVersioning.getWorkflowVersion(name, dto.version)
      : await this.workflowVersioning.getLatestWorkflowVersion(name);

    if (!version) {
      throw new NotFoundException(`Workflow "${name}" not found`);
    }

    const sessionId = dto.sessionId || `session-${Date.now()}`;

    // Always stream response
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    try {
      const abortController = new AbortController();
      const signal = abortController.signal;

      // Handle client disconnection
      req.on("close", () => {
        this.logger.log(`Client disconnected for session ${sessionId}`);
        abortController.abort();
      });

      const stream = this.agentCoordination.executeTaskStream(
        dto.prompt,
        sessionId,
        {
          ...version.configuration,
          workflowVersion: String(version.version),
        },
        signal,
      );

      for await (const chunk of stream) {
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
  }
}
