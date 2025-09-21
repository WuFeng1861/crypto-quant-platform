import { IsString, IsNotEmpty, IsOptional, ValidateNested, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateStrategyConditionDto } from './create-strategy-condition.dto';

export class StrategyIndicatorParamDto {
  @IsNumber()
  parameterId: number;

  @IsString()
  @IsNotEmpty()
  value: string;
}

export class StrategyIndicatorDto {
  @IsNumber()
  indicatorId: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  priority?: number;

  @ValidateNested({ each: true })
  @Type(() => StrategyIndicatorParamDto)
  parameters: StrategyIndicatorParamDto[];
}

export class CreateStrategyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['long', 'short', 'both'])
  @IsOptional()
  positionType?: string = 'both';

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  buyFee?: number = 0;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  sellFee?: number = 0;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  liquidationThreshold?: number = 90;

  @IsNumber()
  @IsOptional()
  @Min(100)
  takeProfitRatio?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  stopLossRatio?: number;

  @ValidateNested({ each: true })
  @Type(() => StrategyIndicatorDto)
  indicators: StrategyIndicatorDto[];

  @ValidateNested({ each: true })
  @Type(() => CreateStrategyConditionDto)
  conditions: CreateStrategyConditionDto[];
}
