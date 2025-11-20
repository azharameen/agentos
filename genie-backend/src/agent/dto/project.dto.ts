import { IsString, IsOptional, IsEnum } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ProjectType } from "../../shared/project.interface";

export class RegisterProjectDto {
  @ApiProperty({
    description: "Unique name for the project",
    example: "my-backend",
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: "Absolute path to the project root",
    example: "D:\\Projects\\my-app\\backend",
  })
  @IsString()
  path: string;

  @ApiPropertyOptional({
    description: "Type of project (auto-detected if not provided)",
    enum: ProjectType,
    example: ProjectType.NESTJS_BACKEND,
  })
  @IsOptional()
  @IsEnum(ProjectType)
  type?: ProjectType;
}

export class ProjectListResponseDto {
  @ApiProperty({
    description: "List of registered projects",
    type: "array",
    items: {
      type: "object",
      properties: {
        name: { type: "string" },
        path: { type: "string" },
        type: { type: "string", enum: Object.values(ProjectType) },
        fileCount: { type: "number" },
        lastScanned: { type: "string", format: "date-time" },
      },
    },
  })
  projects: Array<{
    name: string;
    path: string;
    type: ProjectType;
    fileCount: number;
    lastScanned: Date;
  }>;
}

export class ProjectRegistrationResponseDto {
  @ApiProperty({ description: "Registration status", example: "success" })
  status: string;

  @ApiProperty({ description: "Project name", example: "my-backend" })
  projectName: string;

  @ApiProperty({
    description: "Project summary",
    type: "object",
    properties: {
      type: { type: "string" },
      fileCount: { type: "number" },
      mainLanguage: { type: "string" },
      framework: { type: "string" },
    },
  })
  summary: {
    type: ProjectType;
    fileCount: number;
    mainLanguage: string;
    framework?: string;
  };
}
