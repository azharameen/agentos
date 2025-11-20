import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WorkflowVersioningService } from "./services/workflow-versioning.service";

@ApiTags("Workflow")
@Controller("workflow")
export class WorkflowController {
  constructor(private readonly workflowVersioning: WorkflowVersioningService) {}

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
}
