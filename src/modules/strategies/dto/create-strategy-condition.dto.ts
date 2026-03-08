import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';

export class CreateStrategyConditionDto {
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
  @IsNotEmpty()
  conditionType: string;

  @IsEnum(['buy', 'sell', 'none'])
  action: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  group?: number = 1;

  @IsNumber()
  @IsOptional()
  @Min(0)
  priority?: number = 0;

  @IsString()
  @IsOptional()
  customCode?: string;
}
