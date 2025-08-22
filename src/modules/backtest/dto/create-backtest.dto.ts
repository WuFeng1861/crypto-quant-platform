import { IsNumber, IsNotEmpty, IsDateString, IsOptional, Min } from 'class-validator';

export class CreateBacktestDto {
  @IsNumber()
  @IsNotEmpty()
  strategyId: number;

  @IsNumber()
  @IsNotEmpty()
  pairId: number;

  @IsNumber()
  @IsNotEmpty()
  timeframeId: number;

  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  initialCapital: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  earlyStopThreshold?: number = 10; // 默认为初始资金的10%
}
