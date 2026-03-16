import { IsOptional, IsNumber, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { BatchBacktestStatus } from '../entities/batch-backtest.entity';

export class BatchBacktestQueryDto {
  @IsOptional()
  @IsEnum(BatchBacktestStatus)
  status?: BatchBacktestStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;
}

export class BatchBacktestItemsQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  sortBy?: string = 'id';

  @IsOptional()
  @IsString()
  order?: string = 'asc';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 50;
}

export class RetryBatchBacktestDto {
  @IsOptional()
  @IsNumber({}, { each: true })
  pairIds?: number[];
}

export class ForceRetryBatchBacktestDto {
  @IsNumber({}, { each: true })
  pairIds: number[];
}
