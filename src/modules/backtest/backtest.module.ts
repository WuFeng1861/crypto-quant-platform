import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BacktestResult } from './entities/backtest-result.entity';
import { BacktestTrade } from './entities/backtest-trade.entity';
import { BacktestService } from './backtest.service';
import { BacktestController } from './backtest.controller';
import { StrategiesModule } from '../strategies/strategies.module';
import { IndicatorsModule } from '../indicators/indicators.module';
import { PriceDataModule } from '../price-data/price-data.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BacktestResult, BacktestTrade]),
    StrategiesModule,
    IndicatorsModule,
    PriceDataModule,
  ],
  controllers: [BacktestController],
  providers: [BacktestService],
  exports: [BacktestService],
})
export class BacktestModule {}
