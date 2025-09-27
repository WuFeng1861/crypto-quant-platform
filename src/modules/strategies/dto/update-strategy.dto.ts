import { IsString, IsOptional, ValidateNested, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateStrategyConditionDto } from './update-strategy-condition.dto';

export class UpdateStrategyIndicatorParamDto {
  @IsNumber()
  @IsOptional()
  id?: number;

  @IsNumber()
  parameterId: number;

  @IsString()
  value: string;
}

export class UpdateStrategyIndicatorDto {
  @IsNumber()
  @IsOptional()
  id?: number;

  @IsNumber()
  indicatorId: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  priority?: number;

  @ValidateNested({ each: true })
  @Type(() => UpdateStrategyIndicatorParamDto)
  parameters: UpdateStrategyIndicatorParamDto[];
}

export class UpdateStrategyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['long', 'short', 'both'])
  @IsOptional()
  positionType?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  buyFee?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  sellFee?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  liquidationThreshold?: number;

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
  @Type(() => UpdateStrategyIndicatorDto)
  @IsOptional()
  indicators?: UpdateStrategyIndicatorDto[];

  @ValidateNested({ each: true })
  @Type(() => UpdateStrategyConditionDto)
  @IsOptional()
  conditions?: UpdateStrategyConditionDto[];
}