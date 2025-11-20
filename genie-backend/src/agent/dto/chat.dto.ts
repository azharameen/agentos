import { IsString, IsOptional, IsBoolean } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ChatRequestDto {
  @ApiProperty({ description: "User message" })
  @IsString()
  message: string;

  @ApiProperty({ required: false, description: "Project name" })
  @IsOptional()
  @IsString()
  projectName?: string;

  @ApiProperty({ required: false, description: "Session ID" })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiProperty({ required: false, description: "Use RAG for context" })
  @IsOptional()
  @IsBoolean()
  useRAG?: boolean;
}

export class AnalyzeSuggestDto {
  @ApiProperty({ description: "Project name" })
  @IsString()
  projectName: string;

  @ApiProperty({ description: "File path to analyze" })
  @IsString()
  filePath: string;
}
