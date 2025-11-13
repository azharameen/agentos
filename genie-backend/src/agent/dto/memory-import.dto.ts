import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';

export class MemoryImportDto {
  @ApiProperty({ type: 'array', description: 'Session memory backup data' })
  @IsArray()
  sessions: any[];

  @ApiProperty({ type: 'array', description: 'Long-term memory backup data' })
  @IsArray()
  longTermMemory: any[];
}
