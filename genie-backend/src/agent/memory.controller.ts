import { Controller, Get, Post, Delete, Param, Body } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags, ApiBody } from "@nestjs/swagger";
import { AgentMemoryService } from "./services/agent-memory.service";
import { MemoryImportDto } from "./dto/memory-import.dto";

@ApiTags("Memory")
@Controller("memory")
export class MemoryController {
  constructor(private readonly memoryService: AgentMemoryService) {}

  @Get("analytics")
  @ApiOperation({ summary: "Get detailed memory analytics" })
  @ApiResponse({ status: 200, description: "Memory analytics." })
  getMemoryAnalytics() {
    return this.memoryService.getMemoryAnalytics();
  }

  @Get("export")
  @ApiOperation({ summary: "Export all memory data (backup)" })
  @ApiResponse({
    status: 200,
    description: "Memory data exported successfully.",
  })
  exportMemory() {
    return this.memoryService.exportMemory();
  }

  @Post("import")
  @ApiOperation({ summary: "Import memory data (restore from backup)" })
  @ApiBody({ type: MemoryImportDto })
  @ApiResponse({
    status: 200,
    description: "Memory data imported successfully.",
  })
  importMemory(@Body() data: MemoryImportDto) {
    return this.memoryService.importMemory(data);
  }

  @Delete("sessions/:sessionId")
  @ApiOperation({ summary: "Clear a specific session from memory" })
  @ApiResponse({ status: 200, description: "Session cleared." })
  clearSession(@Param("sessionId") sessionId: string) {
    return this.memoryService.clearSession(sessionId);
  }

  @Get("sessions")
  @ApiOperation({ summary: "List all memory sessions" })
  @ApiResponse({ status: 200, description: "List of memory sessions." })
  listSessions() {
    return this.memoryService.listSessions();
  }
}
