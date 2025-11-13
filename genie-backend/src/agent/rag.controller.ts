import { Controller, Get, Post, Delete, Body } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';
import { RagService } from './services/rag.service';
import { AddDocumentsDto, RagQueryDto, RagStatsDto, DocumentListDto } from './dto/rag.dto';

@ApiTags('RAG')
@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) { }

  @Get('documents')
  @ApiOperation({ summary: 'List all documents in the RAG knowledge base' })
  @ApiResponse({ status: 200, description: 'List of documents in the RAG knowledge base.', type: DocumentListDto })
  listDocuments(): DocumentListDto {
    return this.ragService.listDocuments();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get RAG system statistics' })
  @ApiResponse({ status: 200, description: 'RAG system statistics.', type: RagStatsDto })
  getRagStats(): RagStatsDto {
    return this.ragService.getStats();
  }

  @Delete('documents')
  @ApiOperation({ summary: 'Clear all documents from the RAG knowledge base' })
  @ApiResponse({ status: 200, description: 'All documents cleared.' })
  async clearDocuments() {
    return this.ragService.clearDocuments();
  }

  @Post('documents')
  @ApiOperation({ summary: 'Add documents to RAG knowledge base' })
  @ApiBody({ type: AddDocumentsDto })
  @ApiResponse({ status: 200, description: 'Documents added successfully.' })
  async addRagDocuments(@Body() dto: AddDocumentsDto) {
    return await this.ragService.addDocuments(dto.documents, dto.metadata);
  }

  @Post('query')
  @ApiOperation({ summary: 'Query RAG knowledge base' })
  @ApiBody({ type: RagQueryDto })
  @ApiResponse({ status: 200, description: 'RAG query response.' })
  async queryRag(@Body() dto: RagQueryDto) {
    return await this.ragService.query(dto);
  }
}
