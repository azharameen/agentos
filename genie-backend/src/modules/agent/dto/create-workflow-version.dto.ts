import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class CreateWorkflowVersionDto {
  @ApiProperty({ description: "Workflow name" })
  @IsString()
  name: string;

  @ApiProperty({ description: "Workflow config" })
  @IsString()
  config: string;
}
