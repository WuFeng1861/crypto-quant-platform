import { IsNumber, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class CreatePriceDataDto {
  @IsNumber()
  @IsNotEmpty()
  pairId: number;

  @IsNumber()
  @IsNotEmpty()
  timeframeId: number;

  @IsNumber()
  @IsNotEmpty()
  timestamp: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  openPrice: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  highPrice: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  lowPrice: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  closePrice: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  volume: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  volumeCurrency: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  volumeCurrencyQuote: number;

  @IsNumber()
  @IsOptional()
  confirmed?: number = 0;
}