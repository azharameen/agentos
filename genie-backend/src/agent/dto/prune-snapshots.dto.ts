import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class PruneSnapshotsDto {
  @ApiProperty({ description: 'Number of days to prune' })
  @IsNumber()
  olderThanDays: number;
}
