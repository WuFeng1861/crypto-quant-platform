import { IsNumber, IsNotEmpty, IsDateString, IsOptional, Min, IsArray, ArrayMaxSize, Max } from 'class-validator';

export class CreateBatchBacktestDto {
  @IsNumber()
  @IsNotEmpty()
  strategyId: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMaxSize(500, { message: '交易对数量超过上限（最大 500 个）' })
  pairIds?: number[];

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
  earlyStopThreshold?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  positionDivision?: number;
}
