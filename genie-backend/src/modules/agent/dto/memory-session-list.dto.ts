import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsString } from "class-validator";

export class MemorySessionListDto {
  @ApiProperty({ type: [String], description: "List of active session IDs" })
  @IsArray()
  @IsString({ each: true })
  sessions: string[];
}
