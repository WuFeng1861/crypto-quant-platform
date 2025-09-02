import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';

export class CreateStrategyConditionDto {
  @IsNumber()
  indicatorIndex: number;

  @IsEnum(['indicator', 'constant'])
  comparisonType: string;

  @IsNumber()
  @IsOptional()
  comparedIndicatorIndex?: number;

  @IsString()
  @IsOptional()
  constantValue?: string;

  @IsString()
  @IsNotEmpty()
  operator: string;

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
}
