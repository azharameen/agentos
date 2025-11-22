import { Controller, Get, Post, Delete, Param, Body, Query } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags, ApiBody, ApiQuery } from "@nestjs/swagger";
import { UnifiedMemoryService } from "./unified-memory.service";
import { MemoryImportDto } from "../agent/dto/memory-import.dto";

@ApiTags("Memory")
@Controller("memory")
export class MemoryController {
  constructor(private readonly memoryService: UnifiedMemoryService) { }

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
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, description: "List of memory sessions." })
  listSessions(
    @Query('page') page = 1,
    @Query('limit') limit = 20
  ) {
    const offset = (page - 1) * limit;
    return this.memoryService.listSessions(Number(limit), Number(offset));
  }

  @Get("sessions/:sessionId")
  @ApiOperation({ summary: "Get session details" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "offset", required: false, type: Number })
  @ApiResponse({ status: 200, description: "Session details." })
  getSession(
    @Param("sessionId") sessionId: string,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0
  ) {
    return this.memoryService.getAllMessages(sessionId, Number(offset), Number(limit));
  }
}
