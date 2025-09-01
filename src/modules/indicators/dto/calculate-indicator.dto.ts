import { IsNumber, IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class CalculateIndicatorDto {
  @IsObject()
  priceData: any[];

  @IsObject()
  parameters: Record<string, any>;
}

export class CalculateWithPriceDataDto {
  @IsNumber()
  pairId: number;

  @IsNumber()
  timeframeId: number;

  @IsNumber()
  startTime: number;

  @IsNumber()
  endTime: number;

  @IsObject()
  parameters: Record<string, any>;
}

export class CalculateBySymbolDto {
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @IsString()
  @IsNotEmpty()
  timeframeName: string;

  @IsNumber()
  startTime: number;

  @IsNumber()
  endTime: number;

  @IsObject()
  parameters: Record<string, any>;
}