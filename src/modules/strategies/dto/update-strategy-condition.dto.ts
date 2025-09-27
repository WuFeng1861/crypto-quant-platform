import { IsString, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';

export class UpdateStrategyConditionDto {
  @IsNumber()
  @IsOptional()
  id?: number;

  @IsNumber()
  @IsOptional()
  indicatorIndex?: number;

  @IsEnum(['indicator', 'constant'])
  @IsOptional()
  comparisonType?: string;

  @IsNumber()
  @IsOptional()
  comparedIndicatorIndex?: number;

  @IsString()
  @IsOptional()
  constantValue?: string;

  @IsString()
  @IsOptional()
  currentValuePath?: string;

  @IsString()
  @IsOptional()
  comparedValuePath?: string;

  @IsString()
  @IsOptional()
  operator?: string;

  @IsString()
  @IsOptional()
  conditionType?: string;

  @IsEnum(['buy', 'sell', 'none'])
  @IsOptional()
  action?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  group?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  priority?: number;

  @IsString()
  @IsOptional()
  customCode?: string;
}