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

  @IsNumber()
  @IsOptional()
  @Min(1)
  positionDivision?: number = 1; // 默认为1，表示全仓交易；大于1表示将资金平均分为多次使用
}
