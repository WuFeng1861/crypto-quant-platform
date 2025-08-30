import { IsString, IsNotEmpty } from 'class-validator';

export class CreateTradingPairDto {
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @IsString()
  @IsNotEmpty()
  baseAsset: string;

  @IsString()
  @IsNotEmpty()
  quoteAsset: string;
}