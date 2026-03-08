import { IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { IndicatorParameterDto } from './create-indicator.dto';

export class UpdateIndicatorDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  calculationCode?: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => IndicatorParameterDto)
  parameters?: IndicatorParameterDto[];
}
