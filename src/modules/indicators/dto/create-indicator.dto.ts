import { IsString, IsNotEmpty, IsOptional, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class IndicatorParameterDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  defaultValue?: string;

  @IsEnum(['number', 'string', 'boolean'])
  paramType: string;
}

export class CreateIndicatorDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  calculationCode: string;

  @ValidateNested({ each: true })
  @Type(() => IndicatorParameterDto)
  parameters: IndicatorParameterDto[];
}