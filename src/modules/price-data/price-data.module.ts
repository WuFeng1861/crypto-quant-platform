import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceDataController } from './price-data.controller';
import { PriceDataService } from './price-data.service';
import { PriceData } from './entities/price-data.entity';
import { TradingPair } from './entities/trading-pair.entity';
import { Timeframe } from './entities/timeframe.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PriceData, TradingPair, Timeframe]),
  ],
  controllers: [PriceDataController],
  providers: [PriceDataService],
  exports: [PriceDataService],
})
export class PriceDataModule {}