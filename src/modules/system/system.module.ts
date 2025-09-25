import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';
import { StartupService } from './startup.service';
import { BacktestResult } from '../backtest/entities/backtest-result.entity';
import { BacktestTrade } from '../backtest/entities/backtest-trade.entity';
import { BacktestModule } from '../backtest/backtest.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BacktestResult, BacktestTrade]),
    BacktestModule,
  ],
  controllers: [SystemController],
  providers: [SystemService, StartupService],
  exports: [StartupService],
})
export class SystemModule {}