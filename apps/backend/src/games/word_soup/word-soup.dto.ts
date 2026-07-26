import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class WordSoupPlayerBodyDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  playerId!: number;
}
