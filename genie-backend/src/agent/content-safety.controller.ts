import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';
import { ContentSafetyService } from './services/content-safety.service';
import { ContentSafetyAnalyzeDto } from './dto/content-safety.dto';
import { ContentSafetyStatusDto } from './dto/content-safety-status.dto';

@ApiTags('Content Safety')
@Controller('content-safety')
export class ContentSafetyController {
  constructor(private readonly contentSafety: ContentSafetyService) { }

  @Get('status')
  @ApiOperation({ summary: 'Get content safety configuration and status' })
  @ApiResponse({ status: 200, description: 'Content safety status and configuration.', type: ContentSafetyStatusDto })
  getContentSafetyStatus(): ContentSafetyStatusDto {
    return this.contentSafety.getConfig();
  }

  @Post('analyze')
  @ApiOperation({ summary: 'Analyze text for content safety violations' })
  @ApiBody({ type: ContentSafetyAnalyzeDto })
  @ApiResponse({ status: 200, description: 'Content safety analysis result.' })
  async analyzeContent(@Body() body: ContentSafetyAnalyzeDto) {
    return await this.contentSafety.analyzeText(body.text);
  }

  @Post('analyze/batch')
  @ApiOperation({ summary: 'Batch analyze texts for content safety' })
  @ApiBody({ schema: { type: 'object', properties: { texts: { type: 'array', items: { type: 'string' } } } } })
  @ApiResponse({ status: 200, description: 'Batch content safety analysis result.' })
  async batchAnalyzeContent(@Body() body: { texts: string[] }) {
    return await Promise.all(body.texts.map((text) => this.contentSafety.analyzeText(text)));
  }

  @Post('validate/prompt')
  @ApiOperation({ summary: 'Validate prompt for content safety' })
  @ApiBody({ schema: { type: 'object', properties: { prompt: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'Prompt content safety validation result.' })
  async validatePrompt(@Body() body: { prompt: string }) {
    return await this.contentSafety.validatePrompt(body.prompt);
  }

  @Post('validate/response')
  @ApiOperation({ summary: 'Validate LLM response for content safety' })
  @ApiBody({ schema: { type: 'object', properties: { response: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'Response content safety validation result.' })
  async validateResponse(@Body() body: { response: string }) {
    return await this.contentSafety.validateResponse(body.response);
  }
}
