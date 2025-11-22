import { IsString, IsOptional, IsArray } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AgentChatDto {
  @ApiProperty({
    description: "Name of the registered project to chat about",
    example: "my-backend",
  })
  @IsString()
  projectName: string;

  @ApiProperty({
    description: "User message or question",
    example: "What does the auth service do?",
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: "Conversation ID to maintain context across messages",
    example: "conv-123abc",
  })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiPropertyOptional({
    description: "Specific files to include in context",
    example: ["src/auth/auth.service.ts", "src/auth/auth.controller.ts"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contextFiles?: string[];
}

export class AnalyzeCodeDto {
  @ApiProperty({
    description: "Name of the registered project",
    example: "my-backend",
  })
  @IsString()
  projectName: string;

  @ApiProperty({
    description: "Path to file or module to analyze (relative to project root)",
    example: "src/auth/auth.service.ts",
  })
  @IsString()
  path: string;

  @ApiPropertyOptional({
    description: "Include dependency analysis",
    example: true,
  })
  @IsOptional()
  includeDependencies?: boolean;

  @ApiPropertyOptional({
    description: "Generate detailed summary",
    example: true,
  })
  @IsOptional()
  detailed?: boolean;
}
