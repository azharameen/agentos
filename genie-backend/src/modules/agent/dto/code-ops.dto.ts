import { IsString, IsOptional, IsArray, ValidateNested } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { FileOperation } from "../../../shared/code-ops.interface";

export class FileChangeDto {
  @ApiProperty({
    description: "File path relative to project root",
    example: "src/services/new-service.ts",
  })
  @IsString()
  path: string;

  @ApiProperty({
    description: "Operation to perform on the file",
    enum: FileOperation,
    example: FileOperation.CREATE,
  })
  @IsString()
  operation: FileOperation;

  @ApiPropertyOptional({
    description: "New content for the file",
    example: "export class NewService { }",
  })
  @IsOptional()
  @IsString()
  content?: string;
}

export class PreviewCodeChangesDto {
  @ApiProperty({
    description: "Name of the registered project",
    example: "my-backend",
  })
  @IsString()
  projectName: string;

  @ApiProperty({
    description: "List of file changes to preview",
    type: [FileChangeDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileChangeDto)
  changes: FileChangeDto[];

  @ApiPropertyOptional({
    description: "Reason for the changes",
    example: "Adding new authentication service",
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ApplyCodeChangesDto extends PreviewCodeChangesDto {
  @ApiPropertyOptional({
    description: "Skip validation after applying changes",
    example: false,
  })
  @IsOptional()
  skipValidation?: boolean;

  @ApiPropertyOptional({
    description: "Create backup before applying changes",
    example: true,
  })
  @IsOptional()
  createBackup?: boolean;

  @ApiPropertyOptional({
    description: "Create git commit after applying changes",
    example: false,
  })
  @IsOptional()
  gitCommit?: boolean;

  @ApiPropertyOptional({
    description: "Git branch name (creates new branch if specified)",
    example: "feature/new-service",
  })
  @IsOptional()
  @IsString()
  gitBranch?: string;
}
