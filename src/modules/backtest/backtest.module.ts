import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BacktestResult } from './entities/backtest-result.entity';
import { BacktestTrade } from './entities/backtest-trade.entity';
import { BatchBacktest } from './entities/batch-backtest.entity';
import { BatchBacktestItem } from './entities/batch-backtest-item.entity';
import { TradingPair } from '../common/entities/trading-pair.entity';
import { BacktestService } from './backtest.service';
import { BacktestController } from './backtest.controller';
import { BatchBacktestService } from './batch-backtest.service';
import { BatchBacktestController, BacktestQueueController } from './batch-backtest.controller';
import { StrategiesModule } from '../strategies/strategies.module';
import { IndicatorsModule } from '../indicators/indicators.module';
import { PriceDataModule } from '../price-data/price-data.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BacktestResult, BacktestTrade, BatchBacktest, BatchBacktestItem, TradingPair]),
    StrategiesModule,
    IndicatorsModule,
    PriceDataModule,
    CommonModule,
  ],
  controllers: [BacktestController, BatchBacktestController, BacktestQueueController],
  providers: [BacktestService, BatchBacktestService],
  exports: [BacktestService, BatchBacktestService],
})
export class BacktestModule {}
